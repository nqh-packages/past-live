/**
 * @what - Shared Gemini session callback builders for relay + GoAway reconnection
 * @why - Both initial connection and GoAway reconnection need identical callbacks.
 *   Extracting prevents 150+ LOC duplication and keeps relay.ts under 350 LOC.
 * @exports - buildGeminiCallbacks, handleToolCall, validateToolArgs
 */

import type { GeminiSessionConfig } from './gemini.js';
import { generateSceneImage } from './scene-image.js';
import { logger } from './logger.js';
import { AudioOutputQueue } from './relay-audio-queue.js';
import { updateSession, appendTranscriptTurn } from './session-persistence.js';

// ─── Types ─────────────────────────────────────────────────────────────────

/** Minimal relay state interface — only what callbacks need. */
export interface CallbackState {
  sessionId: string | null;
  outputTranscripts: string[];
  inputTranscripts: string[];
  timeline: { ts: number; event: string; detail?: string }[];
  resumptionHandle: string | undefined;
  reconnecting: boolean;
  /** How many 1011 crashes have triggered auto-reconnect. Max 2. */
  reconnectAttempts: number;
  session: { close(): void; sendText?(text: string): void; sendContext?(text: string): void } | null;
  /** Character name for re-anchoring injection */
  characterName: string;
  /**
   * Pre-generated scene images keyed by scene title — populated during session-preview Phase 3.
   * Checked before calling generateSceneImage() — zero-latency on cache hit.
   * Null when session was started without a previewId (e.g., test scripts).
   */
  preGeneratedScenes: Map<string, string> | null;
  /**
   * Ordered list of tool call outcomes for reconnect context replay.
   * Populated by handleToolCall() after each successful tool route.
   * Injected into buildReconnectContext() so the model knows what was already presented.
   */
  toolCallResults: { name: string; result: string }[];
}

/** Functions relay passes in so callbacks can trigger relay-level actions. */
export interface CallbackActions {
  sendToClient: (msg: unknown) => void;
  clearTimers: () => void;
  endSessionWithSummary: (reason: string) => void;
  handleGoAwayReconnect: () => void;
  /** Triggers 1011 auto-reconnect — rebuilds Gemini session with transcript replay. */
  reconnectAfter1011: () => void;
}

// Re-export the specific send helper type from protocol for tool_call
type ServerMsg = {
  type: string;
  [key: string]: unknown;
};

// ─── Scene Cache Fuzzy Lookup ─────────────────────────────────────────────

/** Normalize a title for fuzzy matching: lowercase, strip articles/punctuation. */
function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\b(the|a|an|of|in|at)\b/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Fuzzy scene cache lookup. Flash generates titles like "The Siege Begins",
 * but Gemini Live calls show_scene with "The Walls Under Fire".
 * Strategy: exact match first, then normalized substring overlap.
 */
function fuzzySceneLookup(cache: Map<string, string> | null, liveTitle: string): string | null {
  if (!cache || cache.size === 0) return null;

  // 1. Exact match
  const exact = cache.get(liveTitle);
  if (exact) return exact;

  // 2. Normalized exact match
  const normLive = normalizeTitle(liveTitle);
  for (const [cachedTitle, image] of cache) {
    if (normalizeTitle(cachedTitle) === normLive) return image;
  }

  // 3. Word overlap — match if >50% of significant words overlap
  const liveWords = new Set(normLive.split(' ').filter((w) => w.length > 2));
  if (liveWords.size === 0) return null;

  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [cachedTitle, image] of cache) {
    const cachedWords = new Set(normalizeTitle(cachedTitle).split(' ').filter((w) => w.length > 2));
    let overlap = 0;
    for (const w of liveWords) {
      if (cachedWords.has(w)) overlap++;
    }
    const score = overlap / Math.max(liveWords.size, cachedWords.size);
    if (score > bestScore && score > 0.4) {
      bestScore = score;
      bestMatch = image;
    }
  }

  return bestMatch;
}

// ─── Tool Argument Validation ─────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  sanitized: Record<string, unknown>;
  reason?: string;
}

const VALID_END_REASONS = ['story_complete', 'student_request'];

export function validateToolArgs(name: string, args: Record<string, unknown>): ValidationResult {
  switch (name) {
    case 'end_session': {
      const reason = args.reason;
      if (typeof reason !== 'string' || !VALID_END_REASONS.includes(reason)) {
        return { valid: true, sanitized: { reason: 'story_complete' }, reason: `Invalid reason "${String(reason)}", defaulting to story_complete` };
      }
      return { valid: true, sanitized: args };
    }

    case 'show_scene': {
      const title = args.title;
      const desc = args.description;
      if (typeof desc !== 'string' || desc.trim().length < 10) {
        return { valid: false, sanitized: args, reason: `Scene description too short: ${typeof desc === 'string' ? desc.length : 0} chars` };
      }
      // Gemini Live often omits title (~65% of calls). Derive from description instead of rejecting.
      const effectiveTitle = (typeof title === 'string' && title.trim())
        ? title.trim()
        : desc.trim().split(/[.!?\n]/)[0].trim().slice(0, 60) || 'Scene';
      return { valid: true, sanitized: { ...args, title: effectiveTitle, description: desc.trim() } };
    }

    case 'announce_choice': {
      const choices = args.choices;
      if (!Array.isArray(choices) || choices.length === 0 || choices.length > 4) {
        return { valid: false, sanitized: args, reason: `Invalid choices count: ${Array.isArray(choices) ? choices.length : 'not array'}` };
      }
      for (const c of choices) {
        if (!c || typeof c.title !== 'string' || !c.title.trim() || typeof c.description !== 'string' || !c.description.trim()) {
          return { valid: false, sanitized: args, reason: 'Choice missing title or description' };
        }
      }
      return { valid: true, sanitized: args };
    }

    case 'switch_speaker': {
      const speakerName = args.name;
      if (typeof speakerName !== 'string' || speakerName.trim().length === 0) {
        return { valid: false, sanitized: args, reason: 'Missing or empty speaker name' };
      }
      return { valid: true, sanitized: { ...args, name: speakerName.trim().slice(0, 100) } };
    }

    default:
      return { valid: true, sanitized: args };
  }
}

// ─── Tool Call Handler ─────────────────────────────────────────────────────

/**
 * Routes tool calls from Gemini to browser + handles side effects.
 * Shared between initial session and reconnected session.
 */
export function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  state: CallbackState,
  actions: CallbackActions,
): void {
  const validation = validateToolArgs(name, args);

  if (!validation.valid) {
    logger.warn(
      { event: 'tool_call_invalid', name, args, reason: validation.reason, sessionId: state.sessionId },
      `Invalid tool call: ${validation.reason}`,
    );
    state.timeline.push({ ts: Date.now(), event: `tool_call_invalid:${name}`, detail: validation.reason });
    // Notify browser of failed show_scene instead of silently dropping
    if (name === 'show_scene') {
      const fallbackTitle = typeof args.title === 'string' ? args.title : 'Scene';
      actions.sendToClient({ type: 'scene_image_failed', title: fallbackTitle });
    }
    return;
  }

  if (validation.reason) {
    logger.warn({ event: 'tool_call_sanitized', name, reason: validation.reason, sessionId: state.sessionId }, `Tool call sanitized: ${validation.reason}`);
  }

  const sanitized = validation.sanitized;

  logger.info({ event: 'tool_call_forward', name, args: sanitized, sessionId: state.sessionId }, 'Forwarding tool call to browser');
  state.timeline.push({ ts: Date.now(), event: `tool_call:${name}`, detail: JSON.stringify(sanitized) });

  // Broadcast ALL tool calls to browser for visibility
  actions.sendToClient({ type: 'tool_call', name, args: sanitized });

  if (name === 'end_session') {
    const reason = (sanitized as { reason?: string }).reason ?? 'story_complete';
    // 5-second delay — let the model finish speaking before closing
    setTimeout(() => {
      state.session?.close();
      actions.clearTimers();
      actions.endSessionWithSummary(reason);
    }, 5000);
    state.timeline.push({ ts: Date.now(), event: 'end_session_delayed_5s' });
    return;
  }

  if (name === 'switch_speaker') {
    const a = sanitized as { speaker?: string; name?: string };
    if (a.name) {
      actions.sendToClient({ type: 'speaker_switch', speaker: 'character', name: a.name });
      state.toolCallResults.push({ name: 'switch_speaker', result: `switched to ${a.name}` });
    }
    return;
  }

  if (name === 'announce_choice') {
    const a = sanitized as { choices?: { title: string; description: string }[] };
    if (a.choices) {
      actions.sendToClient({ type: 'choices', choices: a.choices });
      state.toolCallResults.push({ name: 'announce_choice', result: `presented ${a.choices.length} choices` });
    }
    return;
  }

  if (name === 'show_scene') {
    const a = sanitized as { title?: string; description?: string };
    if (a.title && a.description) {
      // Check pre-generated cache — fuzzy match since Flash and Live generate different titles
      const cachedImage = fuzzySceneLookup(state.preGeneratedScenes, a.title);
      if (cachedImage) {
        logger.info(
          { event: 'show_scene_cache_hit', title: a.title, sessionId: state.sessionId },
          `show_scene cache hit: "${a.title}" — serving pre-generated image`,
        );
        actions.sendToClient({ type: 'scene_image', title: a.title, image: cachedImage });
        state.toolCallResults.push({ name: 'show_scene', result: 'displayed' });
        return;
      }

      // Cache miss — fall back to on-the-fly generation (original behavior)
      logger.info(
        { event: 'show_scene_cache_miss', title: a.title, sessionId: state.sessionId },
        `show_scene cache miss: "${a.title}" — generating on demand`,
      );
      // Send loading signal immediately so frontend shows shimmer skeleton
      actions.sendToClient({ type: 'scene_image_loading', title: a.title });
      void generateSceneImage(a.description, state.sessionId ?? undefined, a.title)
        .then((image) => {
          if (image) {
            actions.sendToClient({ type: 'scene_image', title: a.title!, image });
            state.toolCallResults.push({ name: 'show_scene', result: 'displayed' });
          } else {
            actions.sendToClient({ type: 'scene_image_failed', title: a.title! });
            state.toolCallResults.push({ name: 'show_scene', result: 'failed' });
          }
        })
        .catch((err) => {
          logger.error({ event: 'show_scene_failed', err, sessionId: state.sessionId }, 'Scene image generation failed');
          actions.sendToClient({ type: 'scene_image_failed', title: a.title! });
          state.toolCallResults.push({ name: 'show_scene', result: 'failed' });
        });
    }
    return;
  }

  logger.warn({ event: 'unknown_tool_call', name, sessionId: state.sessionId }, 'Received unknown tool call from Gemini');
}

// ─── Callback Builder ──────────────────────────────────────────────────────

/**
 * Builds the GeminiSessionConfig callbacks that wire Gemini events → browser.
 * Used by both handleStart (initial) and handleGoAwayReconnect (reconnection).
 */
export function buildGeminiCallbacks(
  state: CallbackState,
  actions: CallbackActions,
): Pick<
  GeminiSessionConfig,
  'onAudio' | 'onOutputTranscription' | 'onInputTranscription' |
  'onInterrupted' | 'onError' | 'onClose' | 'onGoAway' | 'onResumptionUpdate' | 'onToolCall' | 'onTurnComplete'
> {
  const audioQueue = new AudioOutputQueue(
    (data) => actions.sendToClient({ type: 'audio', data }),
    10,
  );

  // ── Re-anchoring counter — inject identity reminder every 4 model turns ──────
  let modelTurnCount = 0;
  // ── Re-anchor guard — suppress the next interrupted signal caused by injection ─
  let reanchorJustSent = false;
  let reanchorGuardTimer: ReturnType<typeof setTimeout> | null = null;
  // ── Tool nudge — track whether announce_choice has been called yet ─────────────
  let announceChoiceCalled = false;
  // ── Tool nudge — track whether show_scene has been called yet ─────────────────
  let showSceneCalled = false;

  // ── Transcription accumulators — log complete utterances, not per-word chunks ─
  let outputAccum = '';
  let inputAccum = '';
  let outputFlushTimer: ReturnType<typeof setTimeout> | null = null;
  let inputFlushTimer: ReturnType<typeof setTimeout> | null = null;

  function flushOutput() {
    if (outputAccum.trim()) {
      logger.info({ event: 'output_utterance', sessionId: state.sessionId, text: outputAccum.trim() }, `MODEL: ${outputAccum.trim()}`);
    }
    outputAccum = '';
    outputFlushTimer = null;
  }

  function flushInput() {
    const turnText = inputAccum.trim();
    if (turnText) {
      logger.info({ event: 'input_utterance', sessionId: state.sessionId, text: turnText }, `STUDENT: ${turnText}`);
      // Persist student turns to Firestore — mirrors model turn saving in onTurnComplete
      void appendTranscriptTurn(state.sessionId ?? '', {
        speaker: 'student',
        text: turnText,
        ts: Date.now(),
      });
    }
    inputAccum = '';
    inputFlushTimer = null;
  }

  return {
    onAudio: (data) => audioQueue.enqueue(data),

    onOutputTranscription: (text) => {
      outputAccum += text;
      state.outputTranscripts.push(text);
      state.timeline.push({ ts: Date.now(), event: 'output_transcription', detail: text });
      actions.sendToClient({ type: 'output_transcription', text });
      // Flush after 2s silence — logs complete sentences instead of word chunks
      if (outputFlushTimer) clearTimeout(outputFlushTimer);
      outputFlushTimer = setTimeout(flushOutput, 2000);
    },

    onInputTranscription: (text) => {
      inputAccum += text;
      state.inputTranscripts.push(text);
      state.timeline.push({ ts: Date.now(), event: 'input_transcription', detail: text });
      actions.sendToClient({ type: 'input_transcription', text });
      if (inputFlushTimer) clearTimeout(inputFlushTimer);
      inputFlushTimer = setTimeout(flushInput, 2000);
    },

    onInterrupted: () => {
      // Re-anchor caused this — NOT a real student interruption. Let audio play through.
      if (reanchorJustSent) {
        reanchorJustSent = false;
        if (reanchorGuardTimer) { clearTimeout(reanchorGuardTimer); reanchorGuardTimer = null; }
        logger.debug({ event: 'reanchor_interrupt_suppressed', sessionId: state.sessionId }, 'Suppressed re-anchor interrupt — audio continues');
        state.timeline.push({ ts: Date.now(), event: 'reanchor_interrupt_suppressed' });
        return; // DON'T clear audio, DON'T send interrupted to client
      }
      // Real student interruption — clear audio
      flushOutput();
      flushInput();
      audioQueue.clear();
      logger.info({ event: 'interrupted', sessionId: state.sessionId }, 'Student interrupted');
      state.timeline.push({ ts: Date.now(), event: 'interrupted' });
      actions.sendToClient({ type: 'interrupted' });
    },

    onError: (error) => {
      logger.error(
        { event: 'gemini_error', code: 'RELAY_GEMINI_001', err: error, sessionId: state.sessionId, action: 'Check Gemini API status' },
        'Gemini session error',
      );
      actions.sendToClient({ type: 'error', message: error.message });
      actions.clearTimers();
    },

    onGoAway: (timeLeft) => {
      logger.warn({ event: 'go_away_received', sessionId: state.sessionId, timeLeft }, 'GoAway received — initiating transparent reconnection');
      state.timeline.push({ ts: Date.now(), event: 'go_away', detail: `timeLeft=${timeLeft}` });
      actions.handleGoAwayReconnect();
    },

    onResumptionUpdate: (handle, resumable) => {
      if (resumable && handle) {
        state.resumptionHandle = handle;
        logger.debug({ event: 'resumption_handle_stored', sessionId: state.sessionId, handleLength: handle.length }, 'Resumption handle stored');
      }
    },

    onClose: (code?: number, reason?: string) => {
      if (state.reconnecting) {
        // GoAway reconnect in progress — expected close, do nothing
        logger.info({ event: 'gemini_close_during_reconnect', sessionId: state.sessionId }, 'Gemini closed during GoAway reconnection (expected)');
        return;
      }

      // 1011 auto-reconnect — max 2 attempts before giving up
      if (code === 1011 && state.reconnectAttempts < 2) {
        logger.warn(
          { event: 'reconnect_1011_triggered', attempt: state.reconnectAttempts + 1, sessionId: state.sessionId },
          'Gemini 1011 — attempting auto-reconnect',
        );
        void updateSession(state.sessionId ?? '', { status: 'crashed', closeCode: 1011 });
        actions.sendToClient({ type: 'reconnecting', attempt: state.reconnectAttempts + 1 });
        setTimeout(() => actions.reconnectAfter1011(), 1500);
        return;
      }

      if (code === 1011) {
        logger.error(
          { event: 'gemini_internal_error', code: 'RELAY_1011_MAX', closeCode: code, reason, sessionId: state.sessionId, action: 'Max reconnect attempts exceeded — session ended' },
          'Gemini 1011 — max reconnect attempts exceeded',
        );
        actions.sendToClient({ type: 'error', message: 'Connection dropped — try again' });
      } else {
        logger.info({ event: 'gemini_close', sessionId: state.sessionId, code, reason }, 'Gemini session closed');
        actions.sendToClient({ type: 'ended', reason: 'session_closed' });
      }
      actions.clearTimers();
    },

    onToolCall: (name, args) => {
      // Track announce_choice so re-anchor can nudge if it hasn't fired yet
      if (name === 'announce_choice') announceChoiceCalled = true;
      // Track show_scene so re-anchor can nudge if it hasn't fired yet
      if (name === 'show_scene') showSceneCalled = true;
      handleToolCall(name, args, state, actions);
    },

    onTurnComplete: () => {
      // Capture before flushOutput() clears the accumulator
      const turnText = outputAccum.trim();
      flushOutput();
      flushInput();
      modelTurnCount++;
      state.timeline.push({ ts: Date.now(), event: 'turn_complete' });
      actions.sendToClient({ type: 'turn_complete' });

      // Persist the model turn for reconnect context replay
      if (turnText) {
        void appendTranscriptTurn(state.sessionId ?? '', {
          speaker: 'model',
          text: turnText,
          ts: Date.now(),
        });
      }

      // Re-anchor every 4 model turns — universal patterns from dream conversations
      if (modelTurnCount > 0 && modelTurnCount % 4 === 0 && state.session?.sendContext) {
        const anchorParts = [
          `[You are ${state.characterName}. Stay in character.`,
          // Hook pattern: every line creates a reason to keep listening
          'Every line needs a HOOK — a myth-bust, a wild fact, or something that makes them say "wait, WHAT?"',
          // Energy pattern: bouncing ball — match and amplify, never absorb
          "Match the student's energy and bounce it back BIGGER. If they're excited, feed it. If they're curious, reward it with something surprising.",
          // Lead pattern: characters drive, never wait to be asked
          "YOU lead. Don't wait for questions. Drop the next wild thing that happened.",
          // Anchor pattern: connect every fact to something universal they already understand
          'Anchor facts to things they already know — group projects, sports, family drama. Never academic language.',
          // No-repeat pattern: don't circle back to the same topic
          "If you've already mentioned something, DON'T repeat it — pull a DIFFERENT hook from your bag.",
          // Closing pattern: if the conversation feels like it's winding down, make a specific observation about HOW they think, not generic praise
          'Short turns. 1-2 sentences. Then wait.',
        ];

        // Tool nudge: if show_scene hasn't fired after ~4 turns, remind the model
        if (!showSceneCalled && modelTurnCount >= 4) {
          anchorParts.push(
            "You haven't shown a visual yet. At the next visual moment, use show_scene to paint the picture.",
          );
          logger.info(
            { event: 'reanchor_tool_nudge_scene', sessionId: state.sessionId, turnCount: modelTurnCount },
            'Tool nudge added: show_scene not yet called',
          );
        }

        // Tool nudge: if announce_choice hasn't fired after ~8 turns, remind the model
        if (!announceChoiceCalled && modelTurnCount >= 8) {
          anchorParts.push(
            "You haven't presented a choice yet. At the next natural moment, use announce_choice to give the student 2-3 options.",
          );
          logger.info(
            { event: 'reanchor_tool_nudge', sessionId: state.sessionId, turnCount: modelTurnCount },
            'Tool nudge added: announce_choice not yet called',
          );
        }

        anchorParts.push(']');
        const anchor = anchorParts.join(' ');
        reanchorJustSent = true;
        if (reanchorGuardTimer) clearTimeout(reanchorGuardTimer);
        reanchorGuardTimer = setTimeout(() => { reanchorJustSent = false; reanchorGuardTimer = null; }, 3000);
        state.session.sendContext(anchor);
        logger.info({ event: 'reanchor_injected', sessionId: state.sessionId, turnCount: modelTurnCount }, 'Re-anchor injected');
        state.timeline.push({ ts: Date.now(), event: 'reanchor', detail: `turn ${modelTurnCount}` });
      }
    },
  };
}
