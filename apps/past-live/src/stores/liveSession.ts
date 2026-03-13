/**
 * @what - Cross-island Nano Store for live session state
 * @why - Single source of truth for session status, transcripts, and summary across Svelte islands
 * @exports - $status, $outputTranscript, $inputTranscript, $error, $sessionId, $scenarioId, $topic, $summary, $isActive, $isConnecting, $sessionStartTime
 */

import { atom, computed } from 'nanostores';

// ─── Session status ────────────────────────────────────────────────────────────

export type SessionStatus = 'idle' | 'connecting' | 'active' | 'ended' | 'error';

export const $status = atom<SessionStatus>('idle');

// ─── Transcripts ──────────────────────────────────────────────────────────────

/** Accumulated text of what the agent said */
export const $outputTranscript = atom<string>('');

/** Accumulated text of what the student said */
export const $inputTranscript = atom<string>('');

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
