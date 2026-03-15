/**
 * @what - WebSocket relay orchestrator — bridges browser WS ↔ Gemini Live session
 * @why - Single file responsible for protocol translation between browser and Gemini
 * @exports - createRelay
 */

import type { WSContext } from 'hono/ws';
import { parseClientMessage, serializeServerMessage, type ClientMessage } from './protocol.js';
import { getScenarioMeta, buildSystemPrompt } from './scenarios.js';
// ── Test script import — swap this line to test different scripts ─────────────
// Keep import for test-scenario override path (scenarioId starting with 'test-story-script-')
import { TEST_SYSTEM_PROMPT, TEST_CHARACTER_NAME, TEST_VOICE } from './test-scripts/cleopatra.js';
import type { StoryScript } from './schemas.js';
import { createGeminiSession, type GeminiSession } from './gemini.js';
import { generatePostCallSummary, type PostCallSummary } from './post-call-summary.js';
import { onSessionEnd } from './relay-hooks.js';
import { logCallTranscript } from './call-logger.js';
import { buildGeminiCallbacks, type CallbackActions } from './relay-callbacks.js';
import { logger } from './logger.js';
import { logApiCall } from './api-call-logger.js';
import { createSession, updateSession } from './session-persistence.js';
import { getPreGeneratedScenes } from './session-preview.js';
import { getProfile } from './firestore.js';
import * as registry from './relay-registry.js';
import { buildReconnectContext, generateBrowserCloseSummary } from './relay-context.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** At 9 min, inject a graceful wrap-up instruction to the model. */
const WRAP_UP_MS = 9 * 60 * 1000;
/** At 10 min, force-close regardless of model state. */
const FORCE_CLOSE_MS = 10 * 60 * 1000;

// ─── State ────────────────────────────────────────────────────────────────────

interface RelayState {
  session: GeminiSession | null;
  started: boolean;
  sessionId: string | null;
  audioChunkCount: number;
  wrapUpTimer: ReturnType<typeof setTimeout> | null;
  forceCloseTimer: ReturnType<typeof setTimeout> | null;
  outputTranscripts: string[];
  inputTranscripts: string[];
  characterName: string;
  historicalSetting: string;
  systemPrompt: string;
  voiceName: string | undefined;
  timeline: { ts: number; event: string; detail?: string }[];
  studentId: string | undefined;
  scenarioId: string | undefined;
  sessionStartMs: number | undefined;
  videoFrameCount: number;
  /** Latest session resumption handle from Gemini — used for GoAway reconnection. */
  resumptionHandle: string | undefined;
  /** True if a GoAway reconnection is in progress — prevents double-reconnect. */
  reconnecting: boolean;
  /** How many times a 1011 crash triggered auto-reconnect. Max 2. */
  reconnectAttempts: number;
  /**
   * Pre-generated scene images keyed by scene title (from session-preview Phase 3).
   * When set, show_scene checks here first — zero-latency if cached.
   */
  preGeneratedScenes: Map<string, string> | null;
  /**
   * Ordered log of tool call outcomes — used by buildReconnectContext for full context replay.
   * Populated by relay-callbacks.ts handleToolCall on each successful tool route.
   */
  toolCallResults: { name: string; result: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Send to whatever WS is currently attached to this session.
 * When the browser has disconnected, registry.lookup returns null browserWs —
 * registry.detachBrowser sets browserWs to null. Silently drops the message.
 */
function sendToClientViaRegistry(sessionId: string | null, msg: Parameters<typeof serializeServerMessage>[0]): void {
  if (!sessionId) return;
  const handle = registry.lookup(sessionId);
  const ws = handle?.browserWs ?? null;
  if (!ws) return; // Browser disconnected — drop silently
  try {
    ws.send(serializeServerMessage(msg));
  } catch {
    // Browser closed between lookup and send — ignore
  }
}

function sendToClient(ws: WSContext, msg: Parameters<typeof serializeServerMessage>[0]): void {
  try {
    ws.send(serializeServerMessage(msg));
  } catch {
    // Client may have already disconnected — ignore send errors
  }
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function clearTimers(state: RelayState): void {
  if (state.wrapUpTimer) { clearTimeout(state.wrapUpTimer); state.wrapUpTimer = null; }
  if (state.forceCloseTimer) { clearTimeout(state.forceCloseTimer); state.forceCloseTimer = null; }
}

/**
 * Builds the CallbackActions that relay-callbacks.ts needs to trigger relay-level behavior.
 * Uses registry-aware send so audio/transcription messages reach the browser after
 * a reconnect even if the original `ws` closure is stale.
 */
function buildActions(sessionId: string | null, directWs: WSContext, state: RelayState): CallbackActions {
  return {
    // Registry-aware send: picks up the currently-attached browser WS
    sendToClient: (msg) => sendToClientViaRegistry(sessionId, msg as Parameters<typeof serializeServerMessage>[0]),
    clearTimers: () => clearTimers(state),
    endSessionWithSummary: (reason) => void endSessionWithSummary(directWs, state, reason),
    handleGoAwayReconnect: () => void handleGoAwayReconnect(directWs, state),
    reconnectAfter1011: () => void reconnectAfter1011(directWs, state),
  };
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Attaches relay logic to a Hono WSContext.
 * Lifecycle: idle → starting → active → detached (browser gone) → closed.
 */
export function createRelay(ws: WSContext): void {
  const state: RelayState = {
    session: null, started: false, sessionId: null, audioChunkCount: 0,
    wrapUpTimer: null, forceCloseTimer: null,
    outputTranscripts: [], inputTranscripts: [],
    characterName: '', historicalSetting: '', systemPrompt: '',
    voiceName: undefined, timeline: [],
    studentId: undefined, scenarioId: undefined, sessionStartMs: undefined, videoFrameCount: 0,
    resumptionHandle: undefined, reconnecting: false, reconnectAttempts: 0,
    preGeneratedScenes: null, toolCallResults: [],
  };

  logger.debug({ event: 'ws_open' }, 'WebSocket connection opened');

  const raw = (ws as unknown as { raw: { addEventListener(e: string, h: (...a: unknown[]) => void): void } }).raw;

  raw.addEventListener('message', (event: unknown) => {
    const data = (event as MessageEvent).data;
    const rawStr = typeof data === 'string' ? data : String(data);
    handleClientMessage(ws, state, rawStr);
  });

  raw.addEventListener('close', () => handleBrowserClose(ws, state));
}

// ─── Message handler ──────────────────────────────────────────────────────────

function handleClientMessage(ws: WSContext, state: RelayState, raw: string): void {
  let msg: ReturnType<typeof parseClientMessage>;

  try {
    msg = parseClientMessage(raw);
  } catch (err) {
    logger.warn({ event: 'parse_error', code: 'RELAY_PARSE_001', err, action: 'Check browser sends valid JSON' }, 'Failed to parse client message');
    sendToClient(ws, { type: 'error', message: err instanceof Error ? err.message : 'Invalid message' });
    return;
  }

  switch (msg.type) {
    case 'start':
      handleStart(ws, state, msg).catch((err: unknown) => {
        logger.error({ event: 'start_error', code: 'RELAY_START_001', err, scenarioId: msg.scenarioId, topic: msg.topic, action: 'Check GEMINI_API_KEY and network connectivity' }, 'Failed to start Gemini session');
        sendToClient(ws, { type: 'error', message: err instanceof Error ? err.message : 'Failed to start session' });
      });
      break;
    case 'resume':
      handleResume(ws, msg.sessionId).catch((err: unknown) => {
        logger.error({ event: 'resume_error', code: 'RELAY_RESUME_001', err, sessionId: msg.sessionId, action: 'Resume failed unexpectedly' }, 'Failed to resume session');
        sendToClient(ws, { type: 'error', message: 'Failed to resume session' });
      });
      break;
    case 'audio':
      state.audioChunkCount++;
      // FIX-3: On the very first audio chunk, measure and log the chunk duration
      // so we can detect oversized chunks (optimal: 20-40ms per Gemini best practices).
      // Our browser sends 4096 samples at 16kHz = 256ms — 6x over recommended.
      // Cannot fix here (frontend change required), but we need the observability.
      if (state.audioChunkCount === 1) {
        const rawBytes = Math.floor(msg.data.length * 3 / 4); // base64 → raw bytes
        const samples = rawBytes / 2; // 16-bit PCM = 2 bytes per sample
        const durationMs = (samples / 16000) * 1000; // 16kHz input rate
        logger.info(
          { event: 'audio_chunk_size', sessionId: state.sessionId, rawBytes, samples, durationMs: Math.round(durationMs) },
          `First audio chunk: ${Math.round(durationMs)}ms (${samples} samples)`,
        );
        if (durationMs > 100) {
          logger.warn(
            {
              event: 'audio_chunk_oversized',
              code: 'RELAY_AUDIO_001',
              durationMs: Math.round(durationMs),
              recommendedMs: '20-40',
              action: 'Reduce frontend ScriptProcessor buffer from 4096 to 512 samples',
            },
            `Audio chunks are ${Math.round(durationMs)}ms — recommended 20-40ms for optimal latency`,
          );
        }
      }
      if (state.audioChunkCount % 10 === 0) logger.debug({ event: 'audio_chunks_sent', sessionId: state.sessionId, count: state.audioChunkCount }, 'Audio chunks forwarded');
      state.session?.sendAudio(msg.data);
      break;
    case 'text':
      logger.debug({ event: 'text_forwarded', sessionId: state.sessionId, textLength: msg.text.length }, 'Text forwarded');
      state.session?.sendText(msg.text);
      break;
    case 'video': {
      if (!state.videoFrameCount) state.videoFrameCount = 0;
      state.videoFrameCount++;
      const rawBytes = Math.floor(msg.data.length * 3 / 4);
      if (state.videoFrameCount === 1) {
        logger.info(
          { event: 'first_video_frame', sessionId: state.sessionId, rawBytes, base64Len: msg.data.length },
          `First video frame: ${Math.round(rawBytes / 1024)}KB JPEG`,
        );
      }
      if (state.videoFrameCount % 5 === 0) {
        logger.debug(
          { event: 'video_frames_sent', sessionId: state.sessionId, count: state.videoFrameCount, rawBytes },
          `Video frames sent: ${state.videoFrameCount} (${Math.round(rawBytes / 1024)}KB each)`,
        );
      }
      state.timeline.push({ ts: Date.now(), event: 'video_frame', detail: `frame=${state.videoFrameCount} size=${rawBytes}` });
      state.session?.sendVideo(msg.data);
      break;
    }
    case 'audio_end':
      logger.debug({ event: 'audio_end', sessionId: state.sessionId }, 'Audio stream end forwarded');
      state.session?.sendAudioEnd();
      break;
  }
}

// ─── Summary + end helper ─────────────────────────────────────────────────────

async function endSessionWithSummary(ws: WSContext, state: RelayState, reason: string): Promise<void> {
  let summary: PostCallSummary | undefined;
  try {
    summary = await generatePostCallSummary({
      characterName: state.characterName,
      historicalSetting: state.historicalSetting,
      inputTranscript: state.inputTranscripts.join(' '),
      outputTranscript: state.outputTranscripts.join(' '),
    });
    logger.info({ event: 'summary_generated', sessionId: state.sessionId }, 'Post-call summary generated');
  } catch (err) {
    logger.error({ event: 'summary_failed', code: 'RELAY_SUMMARY_001', err, sessionId: state.sessionId, action: 'Falling back to ended without summary' }, 'Post-call summary generation failed');
  }

  const duration = Math.round((Date.now() - (state.sessionStartMs ?? Date.now())) / 1000);
  void onSessionEnd({ studentId: state.studentId, characterName: state.characterName, historicalSetting: state.historicalSetting, duration, summary, scenarioId: state.scenarioId });

  void updateSession(state.sessionId ?? '', {
    status: 'ended',
    endedAt: new Date(),
    durationMs: duration * 1000,
    summary: summary ?? null,
  });

  logCallTranscript({
    characterName: state.characterName, historicalSetting: state.historicalSetting,
    voiceName: state.voiceName, systemPrompt: state.systemPrompt,
    outputTranscripts: state.outputTranscripts, inputTranscripts: state.inputTranscripts,
    timeline: state.timeline, duration, reason,
  });

  // Send BEFORE removing from registry — sendToClientViaRegistry requires the entry
  // to be present to resolve browserWs. Remove immediately after.
  sendToClientViaRegistry(state.sessionId, { type: 'ended', reason, summary });
  if (state.sessionId) registry.remove(state.sessionId);
}

// ─── Start handler ────────────────────────────────────────────────────────────

async function handleStart(ws: WSContext, state: RelayState, msg: Extract<ClientMessage, { type: 'start' }>): Promise<void> {
  if (state.started) return;
  state.started = true;

  logger.info({ event: 'session_start', scenarioId: msg.scenarioId, topic: msg.topic, studentName: msg.studentName, voiceName: msg.voiceName }, 'Session start received');

  let voiceName: string | undefined = msg.voiceName;

  // ── Test script override — scenarioId starting with 'test-story-script-' uses hardcoded prompt
  const isTestScript = msg.scenarioId?.startsWith('test-story-script-');

  if (isTestScript) {
    state.characterName = TEST_CHARACTER_NAME;
    state.historicalSetting = 'Gran Colombia, 1822';
    voiceName = msg.voiceName ?? TEST_VOICE;
    logger.info({ event: 'test_script_active', scenarioId: msg.scenarioId }, 'Using hardcoded test script');
  } else if (msg.scenarioId) {
    const meta = getScenarioMeta(msg.scenarioId);
    if (!meta) {
      logger.warn({ event: 'unknown_scenario', code: 'RELAY_SCENARIO_001', scenarioId: msg.scenarioId, action: 'Check scenarios.ts for valid IDs' }, 'Unknown scenarioId');
      sendToClient(ws, { type: 'error', message: `Unknown scenarioId: ${msg.scenarioId}` });
      state.started = false;
      return;
    }
    state.characterName = msg.characterName ?? meta.role;
    state.historicalSetting = msg.historicalSetting ?? `${meta.title}, ${meta.year}`;
  } else if (msg.topic) {
    // FIX (2026-03-16): Never use raw topic string as character identity.
    // msg.topic is a user query ("I wanna learn about the leaders of the ancient world"),
    // NOT a character name. If Flash-resolved characterName is missing (Nano Store died on
    // navigation), fall back to a safe generic. The character will still be anchored by
    // whatever the model knows from the storyScript injected into the system prompt.
    state.characterName = msg.characterName ?? 'Historical Figure';
    state.historicalSetting = msg.historicalSetting ?? 'A pivotal moment in history';
  } else {
    logger.warn({ event: 'start_missing_params', code: 'RELAY_START_002' }, 'start missing scenarioId and topic');
    sendToClient(ws, { type: 'error', message: 'start requires scenarioId or topic' });
    state.started = false;
    return;
  }

  // Extract and validate storyScript from the start message.
  // The field is typed as `unknown` on the wire — attempt a coerce to StoryScript.
  // Relay passes it through to buildSystemPrompt; full Zod validation is in session-preview.ts.
  const storyScript = msg.storyScript as StoryScript | undefined;

  // Task 1: look up pre-generated scene images from session-preview Phase 3 cache.
  if (msg.previewId) {
    state.preGeneratedScenes = getPreGeneratedScenes(msg.previewId);
    if (state.preGeneratedScenes && state.preGeneratedScenes.size > 0) {
      logger.info(
        { event: 'pregenerated_scenes_loaded', previewId: msg.previewId, count: state.preGeneratedScenes.size },
        `Loaded ${state.preGeneratedScenes.size} pre-generated scene(s) for zero-latency show_scene`,
      );
    } else {
      logger.info(
        { event: 'pregenerated_scenes_miss', previewId: msg.previewId },
        'Pre-generated scenes not yet ready — will generate on demand',
      );
    }
  }

  // Task 2: fetch student profile for cross-session memory.
  let pastSessions: string[] | undefined;
  if (msg.studentId) {
    try {
      const profile = await getProfile(msg.studentId);
      if (profile?.sessions?.length) {
        pastSessions = profile.sessions.map(
          (s) => `${s.characterName} (${s.scenarioId}) — ${s.agentInsight || 'no insight recorded'}`,
        );
        logger.info(
          { event: 'profile_sessions_loaded', studentId: msg.studentId, sessionCount: pastSessions.length },
          `Loaded ${pastSessions.length} past session(s) for cross-session memory`,
        );
      }
    } catch (err) {
      logger.warn(
        { event: 'profile_fetch_skipped', code: 'RELAY_PROFILE_001', err, studentId: msg.studentId, action: 'Firestore unavailable — continuing without past sessions' },
        'Could not fetch student profile — cross-session memory skipped',
      );
    }
  }

  const studentInfo = typeof msg.studentName === 'string' ? { name: msg.studentName } : undefined;
  const systemPrompt = isTestScript
    ? TEST_SYSTEM_PROMPT
    : buildSystemPrompt(state.characterName, state.historicalSetting, storyScript, pastSessions, studentInfo);
  state.systemPrompt = systemPrompt;
  state.voiceName = voiceName;

  const sessionId = generateSessionId();
  state.sessionId = sessionId;
  state.studentId = msg.studentId; state.scenarioId = msg.scenarioId; state.sessionStartMs = Date.now();

  // Register in module-level registry BEFORE creating Gemini session so that
  // any concurrent resume attempts see the handle immediately.
  registry.register(sessionId, {
    state,
    browserWs: ws,
    abandonTimer: null,
    detachedAt: null,
  });

  const actions = buildActions(sessionId, ws, state);
  const callbacks = buildGeminiCallbacks(state, actions);

  const session = await createGeminiSession({
    systemPrompt,
    voiceName,
    ...(isTestScript ? { tools: [] } : {}),
    ...callbacks,
  });
  state.session = session;

  logger.info({ event: 'gemini_session_created', sessionId, scenarioId: msg.scenarioId, topic: msg.topic, voiceName }, 'Gemini session created');

  void createSession({
    sessionId,
    userId: msg.studentId,
    characterName: state.characterName,
    historicalSetting: state.historicalSetting,
    voiceName,
    scenarioId: msg.scenarioId,
    topic: msg.topic,
  });

  state.wrapUpTimer = setTimeout(() => {
    logger.info({ event: 'wrap_up_inject', sessionId }, 'Injecting wrap-up at 9 min');
    state.session?.sendText('Begin wrapping up naturally. Deliver your closing observation and call end_session.');
  }, WRAP_UP_MS);

  state.forceCloseTimer = setTimeout(() => {
    logger.warn({ event: 'force_close', sessionId }, 'Force-closing at 10 min');
    state.session?.close();
    sendToClientViaRegistry(sessionId, { type: 'ended', reason: 'timeout' });
    clearTimers(state);
    registry.remove(sessionId);
  }, FORCE_CLOSE_MS);

  state.timeline.push({ ts: Date.now(), event: 'session_connected' });
  session.sendText('The student has called you. Pick up the call.');
  sendToClient(ws, { type: 'connected', sessionId });
}

// ─── GoAway reconnection ─────────────────────────────────────────────────────

/**
 * Transparently reconnects to Gemini when a GoAway signal is received.
 * The browser never knows — audio keeps flowing through the new session.
 */
async function handleGoAwayReconnect(ws: WSContext, state: RelayState): Promise<void> {
  if (state.reconnecting) {
    logger.warn({ event: 'go_away_already_reconnecting', sessionId: state.sessionId }, 'GoAway reconnect already in progress');
    return;
  }

  if (!state.resumptionHandle) {
    logger.error(
      { event: 'go_away_no_handle', code: 'RELAY_GOAWAY_001', sessionId: state.sessionId, action: 'No resumption handle — session will close' },
      'Cannot reconnect: no resumption handle stored',
    );
    return;
  }

  state.reconnecting = true;
  state.timeline.push({ ts: Date.now(), event: 'go_away_reconnect_start' });

  try {
    state.session?.close();

    const actions = buildActions(state.sessionId, ws, state);
    const callbacks = buildGeminiCallbacks(state, actions);

    const newSession = await createGeminiSession({
      systemPrompt: state.systemPrompt,
      voiceName: state.voiceName,
      resumptionHandle: state.resumptionHandle,
      ...callbacks,
    });

    state.session = newSession;
    state.reconnecting = false;
    state.timeline.push({ ts: Date.now(), event: 'go_away_reconnect_success' });

    logger.info({ event: 'go_away_reconnect_success', sessionId: state.sessionId }, 'GoAway reconnection successful — session resumed transparently');
  } catch (err) {
    state.reconnecting = false;
    state.timeline.push({ ts: Date.now(), event: 'go_away_reconnect_failed', detail: String(err) });
    logger.error(
      { event: 'go_away_reconnect_failed', code: 'RELAY_GOAWAY_002', err, sessionId: state.sessionId, action: 'Reconnection failed — session will end' },
      'GoAway reconnection failed',
    );
    sendToClientViaRegistry(state.sessionId, { type: 'ended', reason: 'reconnect_failed' });
    clearTimers(state);
  }
}

// ─── 1011 reconnection ────────────────────────────────────────────────────────

/**
 * Attempts to reconnect after a Gemini 1011 (server-side internal error).
 * Uses buildReconnectContext with FULL transcript + tool call history so the
 * character never forgets earlier conversation threads.
 *
 * Max 2 attempts. On failure, sends `ended` with reason `reconnect_failed`.
 *
 * @pitfall - sendContext injects context WITHOUT triggering VAD. Do not use
 *   sendText for the context block — it would trigger VAD and interrupt audio.
 *   Only resumeInstruction goes through sendText.
 */
async function reconnectAfter1011(ws: WSContext, state: RelayState): Promise<void> {
  state.timeline.push({ ts: Date.now(), event: 'reconnect_1011_start' });

  try {
    // Build full context from complete transcript + tool call history
    const { context, resumeInstruction } = buildReconnectContext({
      characterName: state.characterName,
      outputTranscripts: state.outputTranscripts,
      inputTranscripts: state.inputTranscripts,
      toolCallResults: state.toolCallResults,
    });

    const oldSessionId = state.sessionId;
    const newSessionId = generateSessionId();

    const actions = buildActions(newSessionId, ws, state);
    const callbacks = buildGeminiCallbacks(state, actions);

    const newSession = await createGeminiSession({
      systemPrompt: state.systemPrompt,
      voiceName: state.voiceName,
      ...callbacks,
    });

    state.session = newSession;
    // Update state and registry atomically
    if (oldSessionId) registry.remove(oldSessionId);
    state.sessionId = newSessionId;
    registry.register(newSessionId, {
      state,
      browserWs: ws,
      abandonTimer: null,
      detachedAt: null,
    });
    state.reconnectAttempts++;

    // Inject full conversation context silently — does not trigger VAD
    newSession.sendContext(context);
    newSession.sendText(resumeInstruction);

    state.timeline.push({ ts: Date.now(), event: 'reconnect_1011_success' });
    sendToClientViaRegistry(newSessionId, { type: 'reconnected', sessionId: newSessionId });

    void logApiCall({ sessionId: newSessionId, type: 'live_reconnect', model: 'gemini-2.5-flash-native-audio-preview-12-2025' });
    void createSession({
      sessionId: newSessionId,
      userId: state.studentId,
      characterName: state.characterName,
      historicalSetting: state.historicalSetting,
      voiceName: state.voiceName,
      scenarioId: state.scenarioId,
    });
    void updateSession(newSessionId, { status: 'active', reconnectCount: state.reconnectAttempts });

    logger.info(
      { event: 'reconnect_1011_success', sessionId: newSessionId, attempt: state.reconnectAttempts },
      'Gemini 1011 auto-reconnect succeeded with full transcript context',
    );
  } catch (err) {
    state.timeline.push({ ts: Date.now(), event: 'reconnect_1011_failed', detail: String(err) });
    logger.error(
      { event: 'reconnect_1011_failed', code: 'RELAY_1011_001', err, sessionId: state.sessionId, action: 'Reconnect after 1011 failed — session ended' },
      'Reconnect after 1011 failed',
    );
    sendToClientViaRegistry(state.sessionId, { type: 'ended', reason: 'reconnect_failed' });
    clearTimers(state);
    if (state.sessionId) registry.remove(state.sessionId);
  }
}

// ─── Browser resume handler ───────────────────────────────────────────────────

/**
 * Handles a `resume` message from a browser reconnecting after a disconnect.
 *
 * Three outcomes:
 * 1. Found + Gemini alive → reattach browser, send `reconnected`
 * 2. Found + Gemini dead → new Gemini session with full context replay, send `reconnected`
 * 3. Not found → send `ended` with reason `session_expired`
 */
async function handleResume(ws: WSContext, sessionId: string): Promise<void> {
  logger.info({ event: 'resume_attempt', sessionId }, 'Browser attempting to resume session');

  const handle = registry.lookup(sessionId);

  if (!handle) {
    logger.info({ event: 'resume_not_found', sessionId }, 'Resume: session not found — expired or never existed');
    sendToClient(ws, { type: 'ended', reason: 'session_expired' });
    return;
  }

  const state = handle.state as RelayState;

  if (state.session !== null) {
    // Gemini is still alive — reattach the browser and continue
    registry.reattachBrowser(sessionId, ws);
    state.timeline.push({ ts: Date.now(), event: 'browser_resumed', detail: 'gemini_alive' });
    sendToClient(ws, { type: 'reconnected', sessionId });
    logger.info({ event: 'resume_success', sessionId }, 'Browser resumed — Gemini session still alive');
    return;
  }

  // Gemini died while browser was disconnected (1011 during detach window).
  // Create a fresh Gemini session with full context replay.
  logger.info({ event: 'resume_gemini_dead', sessionId }, 'Resume: Gemini dead — recreating with context replay');

  try {
    const { context, resumeInstruction } = buildReconnectContext({
      characterName: state.characterName,
      outputTranscripts: state.outputTranscripts,
      inputTranscripts: state.inputTranscripts,
      toolCallResults: state.toolCallResults,
    });

    const newSessionId = generateSessionId();

    const actions = buildActions(newSessionId, ws, state);
    const callbacks = buildGeminiCallbacks(state, actions);

    const newSession = await createGeminiSession({
      systemPrompt: state.systemPrompt,
      voiceName: state.voiceName,
      ...callbacks,
    });

    state.session = newSession;
    // Transfer registry entry to new session ID
    registry.remove(sessionId);
    state.sessionId = newSessionId;
    registry.register(newSessionId, { state, browserWs: ws, abandonTimer: null, detachedAt: null });

    newSession.sendContext(context);
    newSession.sendText(resumeInstruction);

    state.timeline.push({ ts: Date.now(), event: 'browser_resumed', detail: 'gemini_recreated' });
    sendToClient(ws, { type: 'reconnected', sessionId: newSessionId });

    void createSession({
      sessionId: newSessionId,
      userId: state.studentId,
      characterName: state.characterName,
      historicalSetting: state.historicalSetting,
      voiceName: state.voiceName,
      scenarioId: state.scenarioId,
    });
    void updateSession(newSessionId, { status: 'active', resumedFrom: sessionId });

    logger.info(
      { event: 'resume_new_gemini', oldSessionId: sessionId, newSessionId },
      'Browser resume: new Gemini session created with full context replay',
    );
  } catch (err) {
    logger.error(
      { event: 'resume_failed', code: 'RELAY_RESUME_002', err, sessionId, action: 'Could not create new Gemini session for resume' },
      'Browser resume failed — ending session',
    );
    sendToClient(ws, { type: 'ended', reason: 'reconnect_failed' });
    registry.remove(sessionId);
  }
}

// ─── Disconnect handler ───────────────────────────────────────────────────────

/**
 * Called when the browser WS closes.
 *
 * NEW BEHAVIOR (session resilience): Detach the browser from the registry instead
 * of killing the Gemini session. The relay stays alive for the reconnect window (180s).
 * The Gemini session, session timers, and full state all remain intact.
 *
 * Gemini callbacks calling sendToClient will silently drop messages (browserWs = null)
 * until the browser reconnects and reattachBrowser() is called.
 *
 * If browser reconnects → handleResume() reattaches and sends `reconnected`.
 * If 10-min timeout fires → force-close path above removes relay from registry.
 * If 180s TTL fires → registry's forceAbandon closes Gemini + marks Firestore 'abandoned'.
 */
function handleBrowserClose(ws: WSContext, state: RelayState): void {
  logger.info({ event: 'ws_close', sessionId: state.sessionId }, 'Browser WebSocket closed');

  if (!state.sessionId || !state.sessionStartMs) {
    // No session was ever started — nothing to detach
    return;
  }

  if (!state.session) {
    // Session ended gracefully (end_session tool fired, summary sent)
    logger.debug({ event: 'ws_close_after_end', sessionId: state.sessionId }, 'Browser closed after session ended — no-op');
    return;
  }

  // Log transcript snapshot at disconnect time
  const duration = Math.round((Date.now() - state.sessionStartMs) / 1000);
  logCallTranscript({
    characterName: state.characterName, historicalSetting: state.historicalSetting,
    voiceName: state.voiceName, systemPrompt: state.systemPrompt,
    outputTranscripts: state.outputTranscripts, inputTranscripts: state.inputTranscripts,
    timeline: state.timeline, duration, reason: 'browser_disconnected',
  });

  // Detach browser from registry — Gemini session stays alive for reconnect window
  registry.detachBrowser(state.sessionId);

  logger.info(
    { event: 'browser_detached', sessionId: state.sessionId, abandonMs: 180_000 },
    'Browser detached — Gemini alive, 3-min reconnect window open',
  );
}
