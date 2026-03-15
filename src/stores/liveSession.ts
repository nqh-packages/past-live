/**
 * @what - Cross-island Nano Store for live session state
 * @why - Single source of truth for session status, transcripts, chat log, preview data, and scene images
 * @exports - $status, $outputTranscript, $inputTranscript, $error, $sessionId, $scenarioId,
 *            $topic, $summary, $isActive, $isConnecting, $sessionStartTime,
 *            $messages, $isSpeaking, $micEnabled, $micLevel, $characterName, $previewData,
 *            $activeChoices, $sceneImage, $sceneImages, $sceneImageFailed, Choice, ChoiceEvent,
 *            $choiceHistory, $activeChoiceContext, SummaryArtifact, SceneImage,
 *            addMessage, appendToLastMessage, replaceLastMessage, resetSession,
 *            appendOutputTranscript, appendInputTranscript
 */

import { atom, computed } from 'nanostores';
import { PRESET_CHARACTER_NAMES } from '../lib/scenarios';

// Re-export so existing imports from this module keep working
export { PRESET_CHARACTER_NAMES };

// ─── Session status ────────────────────────────────────────────────────────────

export type SessionStatus = 'idle' | 'connecting' | 'active' | 'reconnecting' | 'ended' | 'error';

export const $status = atom<SessionStatus>('idle');

// ─── Transcripts (backward compat) ────────────────────────────────────────────

/** Accumulated text of what the agent said */
export const $outputTranscript = atom<string>('');

/** Accumulated text of what the student said */
export const $inputTranscript = atom<string>('');

// ─── Chat log ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  sender: string;
  text: string;
}

/** Structured chat log — rendered by ChatLog.svelte */
export const $messages = atom<ChatMessage[]>([]);

// ─── Audio / mic state ─────────────────────────────────────────────────────────

/** True while model audio is playing — drives waveform animation */
export const $isSpeaking = atom<boolean>(false);

/** True when mic is unmuted and streaming */
export const $micEnabled = atom<boolean>(false);

/**
 * Mic audio level — RMS amplitude of the current mic input buffer, 0–1 range.
 * Updated per ScriptProcessorNode buffer (~256ms at 16kHz). Set to 0 when mic stops.
 * Used by MicButton.svelte to render a pulsing volume ring.
 */
export const $micLevel = atom<number>(0);

// ─── Character name ────────────────────────────────────────────────────────────

/**
 * Character name for the current session.
 * Sourced from preview JSON `characterName` field.
 * Preset scenarios use PRESET_CHARACTER_NAMES. Empty string until set — there is no narrator.
 */
export const $characterName = atom<string>('');

// ─── Scene images ─────────────────────────────────────────────────────────────

/**
 * A scene image generated mid-call by the `show_scene` tool.
 * `image` is a base64-encoded PNG sent by the backend relay.
 */
export interface SceneImage {
  title: string;
  image: string;
}

/**
 * The most recently received scene image. Null at session start.
 * Replaces the portrait banner when set — latest image wins.
 */
export const $sceneImage = atom<SceneImage | null>(null);

/**
 * Accumulates ALL scene images received during the session.
 * Used by the summary screen to show a visual timeline of the call.
 */
export const $sceneImages = atom<SceneImage[]>([]);

/** Title of the scene image currently being generated. Null when idle. */
export const $sceneImageLoading = atom<string | null>(null);

/** Title of the scene that failed to generate. Null when idle or succeeded. */
export const $sceneImageFailed = atom<string | null>(null);

// ─── Choice cards ──────────────────────────────────────────────────────────────

/**
 * A tappable choice card presented by the `announce_choice` tool.
 * Matches the `choices` server message shape.
 */
export interface Choice {
  title: string;
  description: string;
}

/**
 * Active choices presented via the `announce_choice` tool call.
 * Null when no choices are pending. Set to null on dismissal or session reset.
 * Components auto-dismiss when student speaks (voice input clears this store).
 */
export const $activeChoices = atom<Choice[] | null>(null);

/**
 * A recorded decision moment from the session.
 * Captured when the student selects a choice card during an active call.
 * Persisted to SummaryArtifact.choiceHistory for the summary infographic.
 */
export interface ChoiceEvent {
  /** The dilemma question shown above the choice cards — e.g. "The harbor is breached. What do you do?" */
  setup: string;
  /** All 2-3 options that were presented */
  options: Choice[];
  /** Title of the option the student selected */
  picked: string;
  /** What actually happened as a consequence of that choice */
  consequence: string;
}

/**
 * Accumulates all choice events made during the session.
 * Reset at session start. Written by SessionChoiceCards on each selection.
 */
export const $choiceHistory = atom<ChoiceEvent[]>([]);

/**
 * Context for the currently active choice set — populated from the storyScript.
 * Provides the setup question and per-option consequences so they can be
 * recorded into $choiceHistory when the student selects.
 * Cleared after each selection and on session reset.
 *
 * @pitfall - May be null if the session started from a preset scenario without a storyScript.
 *   In that case, choiceHistory entries will have empty setup/consequence strings.
 */
export const $activeChoiceContext = atom<{
  setup: string;
  consequences: Record<string, string>;
} | null>(null);

// ─── Story script types (client-side — mirrors server schemas.ts StoryScript) ─

/**
 * Humor/personality/voice data for a historical character.
 * Mirrors `personalitySchema` in `server/src/schemas.ts`.
 */
export interface PersonalityData {
  voice: string;
  humor: string;
  quirks: string;
  energy: string;
  celebrityAnchor: string;
}

/**
 * A myth/truth/surprise/anchor combo — the "wait WHAT?" moment.
 * Mirrors `hookSchema` in `server/src/schemas.ts`.
 */
export interface HookData {
  myth: string;
  truth: string;
  surprise: string;
  anchor: string;
}

/**
 * Bag-of-material structure generated by Flash per character.
 * Client-side type only — no Zod. Relay validates against server-side schemas.
 * Mirrors `storyScriptSchema` in `server/src/schemas.ts`.
 *
 * @pitfall - This type is intentionally kept in sync manually with server schemas.
 *   If the server schema changes, update this type to match.
 */
export interface StoryScriptData {
  personality: PersonalityData;
  hooks: HookData[];
  facts: string[];
  choices: {
    setup: string;
    options: { title: string; description: string }[];
    consequences: Record<string, string>;
  }[];
  scenes: { title: string; description: string }[];
  closingThread: string;
}

// ─── Session preview data ──────────────────────────────────────────────────────

export interface PreviewData {
  topic: string;
  userRole: string;
  characterName: string;
  historicalSetting: string;
  year: string;
  context: string;
  /** 5 OKLCH color values: [background, surface, accent, foreground, muted] */
  colorPalette: string[];
  /** Scene image as base64 — may be absent if generation failed */
  sceneImage?: string;
  /** Character avatar as base64 — may be absent if generation failed */
  avatar?: string;
  /** Static preset scene image URL (e.g. /presets/scene-constantinople.webp) */
  sceneUrl?: string;
  /** Static preset avatar URL (e.g. /presets/avatar-constantine.webp) */
  avatarUrl?: string;
  /**
   * Bag-of-material generated by Flash for this character.
   * Present when Flash generated a full story script (not preset fallback).
   * Serialized through sessionStorage via JSON.stringify(preview) in enterSession().
   */
  storyScript?: StoryScriptData;
  /**
   * Preview ID from /session-preview — relay uses it to look up pre-generated scene images.
   * Present for custom topics (Flash path), absent for preset scenarios.
   */
  previewId?: string;
}

/** Preview data from the call preview overlay — written before session entry */
export const $previewData = atom<PreviewData | null>(null);

// ─── Session metadata ─────────────────────────────────────────────────────────

export const $error = atom<string>('');
export const $sessionId = atom<string>('');

/** Scenario ID if session started from a scenario card */
export const $scenarioId = atom<string>('');

/** Free-form topic if session started from topic input */
export const $topic = atom<string>('');

/** Session start timestamp for duration tracking */
export const $sessionStartTime = atom<number>(0);

// ─── Summary artifact ─────────────────────────────────────────────────────────

export interface SummaryArtifact {
  /** Relay session ID — used for debug URL construction and backend fetch */
  sessionId?: string;
  scenarioId: string;
  topic: string;
  scenarioTitle: string;
  role: string;
  durationMs: number;
  /** Timestamp (ms since epoch) when the call ended — for call log display */
  endedAt?: number;
  summaryFacts: string[];
  actualOutcome: string;
  yourCall: string;
  relatedScenarios: string[];
  /** Phase 2: character's farewell message from Gemini post-call summary */
  characterMessage?: string;
  /** Phase 2: AI-generated next-call suggestions from post-call summary */
  suggestedCalls?: { name: string; era: string; hook: string }[];
  /** Phase 2: narrative comparison of student's choice vs. real history */
  outcomeComparison?: string;
  /**
   * Full formatted transcript captured at call end.
   * Format: "> CHARACTER: text\n> YOU: text\n"
   * Persisted so summary page can offer clipboard copy / text export.
   */
  transcript?: string;
  /**
   * Story palette OKLCH values — persisted so summary page can apply era colors.
   * Mirrors PreviewData.colorPalette: [background, surface, accent, foreground, muted]
   */
  colorPalette?: string[];
  /** Character avatar URL (static preset) or base64 data URL for dynamic sessions */
  avatarUrl?: string;
  /**
   * Scene images accumulated during the session (max 6).
   * Each entry is a { title, image } pair where image is a base64-encoded PNG.
   * Used by SummaryImageStrip to render a visual timeline of the call.
   */
  sceneImages?: { title: string; image: string }[];
  /**
   * Decision moments recorded by the student during the session.
   * Each entry captures the dilemma, all options, the picked option, and the consequence.
   * Used by SummaryChoiceCards to render a decision recap.
   */
  choiceHistory?: ChoiceEvent[];
}

export const $summary = atom<SummaryArtifact | null>(null);

// ─── Derived ──────────────────────────────────────────────────────────────────

export const $isActive = computed($status, (s) => s === 'active');
export const $isConnecting = computed($status, (s) => s === 'connecting');
export const $isEnded = computed($status, (s) => s === 'ended');
export const $isError = computed($status, (s) => s === 'error');

// ─── Actions ──────────────────────────────────────────────────────────────────

export function resetSession(): void {
  $status.set('idle');
  $outputTranscript.set('');
  $inputTranscript.set('');
  $messages.set([]);
  $isSpeaking.set(false);
  $micEnabled.set(false);
  $micLevel.set(0);
  $characterName.set('');
  $activeChoices.set(null);
  $choiceHistory.set([]);
  $activeChoiceContext.set(null);
  $sceneImage.set(null);
  $sceneImages.set([]);
  $sceneImageLoading.set(null);
  $sceneImageFailed.set(null);
  $previewData.set(null);
  $error.set('');
  $sessionId.set('');
  $scenarioId.set('');
  $topic.set('');
  $sessionStartTime.set(0);
  $summary.set(null);
}

export function appendOutputTranscript(text: string): void {
  const current = $outputTranscript.get();
  $outputTranscript.set(current ? `${current} ${text}` : text);
}

export function appendInputTranscript(text: string): void {
  const current = $inputTranscript.get();
  $inputTranscript.set(current ? `${current} ${text}` : text);
}

/**
 * Appends a new message from the given sender to the chat log.
 * If the last message already has this sender, appends text instead.
 * Handles sub-word deltas: skips extra space when text starts with punctuation.
 */
export function addMessage(sender: string, text: string): void {
  const msgs = $messages.get();
  const last = msgs[msgs.length - 1];
  if (last && last.sender === sender) {
    // Gemini sends sub-word deltas like "What" + "'s" — don't add space before punctuation
    const needsSpace = text.length > 0 && !/^[''.,!?;:\-)]/.test(text) && !last.text.endsWith(' ');
    const joined = needsSpace ? `${last.text} ${text}` : `${last.text}${text}`;
    $messages.set([
      ...msgs.slice(0, -1),
      { sender, text: joined },
    ]);
  } else {
    $messages.set([...msgs, { sender, text }]);
  }
}

/**
 * Appends text to the last message in the chat log regardless of sender.
 * Use for streaming word-by-word chunks from the same turn.
 */
export function appendToLastMessage(text: string): void {
  const msgs = $messages.get();
  if (msgs.length === 0) return;
  const last = msgs[msgs.length - 1];
  $messages.set([
    ...msgs.slice(0, -1),
    { sender: last.sender, text: `${last.text} ${text}` },
  ]);
}

/**
 * Replaces the text of the last message if it has the same sender, otherwise appends a new one.
 * Use for cumulative transcription events where each event contains the full text so far.
 *
 * @inference - Gemini input_transcription sends cumulative (not delta) text per event.
 *   Calling addMessage would concatenate previous + current, doubling the content.
 */
export function replaceLastMessage(sender: string, text: string): void {
  const msgs = $messages.get();
  const last = msgs[msgs.length - 1];
  if (last && last.sender === sender) {
    $messages.set([...msgs.slice(0, -1), { sender, text }]);
  } else {
    $messages.set([...msgs, { sender, text }]);
  }
}
