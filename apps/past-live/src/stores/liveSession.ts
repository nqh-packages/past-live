/**
 * @what - Cross-island Nano Store for live session state
 * @why - Single source of truth for session status, transcripts, chat log, and preview data
 * @exports - $status, $outputTranscript, $inputTranscript, $error, $sessionId, $scenarioId,
 *            $topic, $summary, $isActive, $isConnecting, $sessionStartTime,
 *            $messages, $isSpeaking, $micEnabled, $micLevel, $characterName, $previewData,
 *            $activeChoices, Choice,
 *            addMessage, appendToLastMessage, replaceLastMessage, resetSession,
 *            appendOutputTranscript, appendInputTranscript
 */

import { atom, computed } from 'nanostores';

// ─── Session status ────────────────────────────────────────────────────────────

export type SessionStatus = 'idle' | 'connecting' | 'active' | 'ended' | 'error';

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

/** Maps scenarioId → character display name used in the chat log */
export const PRESET_CHARACTER_NAMES: Record<string, string> = {
  'constantinople-1453': 'CONSTANTINE XI',
  'moon-landing-1969': 'GENE KRANZ',
  'mongol-empire-1206': 'JAMUKHA',
};

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
  /** Scene image as base64 or URL — may be absent if generation failed */
  sceneImage?: string;
  /** Character avatar as base64 or URL — may be absent if generation failed */
  avatar?: string;
}

/** Preview data from the session briefing overlay — written before session entry */
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
  scenarioId: string;
  topic: string;
  scenarioTitle: string;
  role: string;
  durationMs: number;
  summaryFacts: string[];
  actualOutcome: string;
  yourCall: string;
  relatedScenarios: string[];
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
 */
export function addMessage(sender: string, text: string): void {
  const msgs = $messages.get();
  const last = msgs[msgs.length - 1];
  if (last && last.sender === sender) {
    $messages.set([
      ...msgs.slice(0, -1),
      { sender, text: `${last.text} ${text}` },
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
