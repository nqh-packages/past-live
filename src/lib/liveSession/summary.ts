/**
 * @what - Builds and persists the session summary artifact for /summary page
 * @why - Deterministic MVP summary: pulls facts from scenario metadata, stores in sessionStorage.
 *        Phase 2 adds createSummaryFromServer for Gemini-generated post-call summaries.
 * @exports - createSummaryArtifact, createSummaryFromServer, loadSummaryArtifact, formatDuration
 */

import {
  $summary,
  $inputTranscript,
  $sessionId,
  $scenarioId,
  $topic,
  $characterName,
  $previewData,
  $messages,
  $sceneImages,
  $choiceHistory,
  type SummaryArtifact,
} from '../../stores/liveSession';
import { SCENARIO_SUMMARY_META } from '../scenarios';

// SCENARIO_META is now sourced from src/lib/scenarios.ts — single source of truth.
// Previously inlined here; importing prevents drift when new scenarios are added.
const SCENARIO_META = SCENARIO_SUMMARY_META;

const OPEN_TOPIC_FACTS = [
  'Historical role-play deepens engagement and memory retention.',
  'Reasoning from context — not memorization — is the core skill.',
  'Every historical moment had agents who shaped it through decisions, not fate.',
];

const SESSION_STORAGE_KEY = 'past-live:summary';

// ─── Transcript formatter ─────────────────────────────────────────────────────

/**
 * Formats the structured chat messages into a readable transcript string.
 * Format: "> SPEAKER: text" per turn, joined by newlines.
 *
 * @why - Preserves the full conversational record for study notes and clipboard copy.
 *   Uses $messages (structured) rather than $outputTranscript/$inputTranscript (raw)
 *   because $messages has per-sender attribution for clean multi-party formatting.
 */
function buildTranscript(): string {
  const msgs = $messages.get();
  if (!msgs.length) return '';

  return msgs
    .map((msg) => {
      const speaker = msg.sender === 'YOU' || msg.sender === 'you' ? 'YOU' : msg.sender;
      return `> ${speaker}: ${msg.text.trim()}`;
    })
    .join('\n');
}

/**
 * Derives an avatar data URL or static URL from the current preview data.
 * Prefers static preset URL (no base64 bloat in sessionStorage).
 */
function resolveAvatarUrl(): string | undefined {
  const preview = $previewData.get();
  if (!preview) return undefined;
  if (preview.avatarUrl) return preview.avatarUrl;
  if (preview.avatar) return `data:image/jpeg;base64,${preview.avatar}`;
  return undefined;
}

// ─── Build ────────────────────────────────────────────────────────────────────

interface CreateSummaryInput {
  scenarioId: string;
  topic: string;
  durationMs: number;
}

export function createSummaryArtifact({ scenarioId, topic, durationMs }: CreateSummaryInput): void {
  const meta = scenarioId ? SCENARIO_META[scenarioId] : null;

  // Last meaningful student input as "your call"
  const rawTranscript = $inputTranscript.get().trim();
  const lastSentence = rawTranscript
    ? rawTranscript.split(/[.!?]/).filter(Boolean).pop()?.trim() ?? rawTranscript.slice(-120)
    : '(no spoken input captured)';

  const preview = $previewData.get();

  const MAX_IMAGES = 6;
  const allImages = $sceneImages.get();

  const artifact: SummaryArtifact = {
    scenarioId,
    topic,
    scenarioTitle: meta?.title ?? (topic ? `Free study: ${topic}` : 'Open session'),
    role: meta?.role ?? $characterName.get() ?? 'Student',
    durationMs,
    endedAt: Date.now(),
    summaryFacts: meta?.summaryFacts ?? OPEN_TOPIC_FACTS,
    actualOutcome: meta?.actualOutcome ?? 'Session completed. Review the transcript for key moments.',
    yourCall: lastSentence,
    relatedScenarios: meta?.relatedScenarios ?? ['constantinople-1453', 'moon-landing-1969'],
    transcript: buildTranscript(),
    colorPalette: preview?.colorPalette,
    avatarUrl: resolveAvatarUrl(),
    sceneImages: allImages.length > MAX_IMAGES ? allImages.slice(-MAX_IMAGES) : allImages,
    choiceHistory: $choiceHistory.get(),
  };

  $summary.set(artifact);
  persistSummary(artifact);
}

// ─── Phase 2: server-generated summary ────────────────────────────────────────

interface ServerSummary {
  keyFacts: string[];
  outcomeComparison: string;
  characterMessage: string;
  suggestedCalls: { name: string; era: string; hook: string }[];
}

/**
 * Maps a Gemini post-call summary (sent by the backend in the `ended` message)
 * into a SummaryArtifact and persists it. Preferred over createSummaryArtifact
 * when the server provides real transcript-based data.
 *
 * @inference - Falls back to createSummaryArtifact when the backend omits `summary`.
 *   Both paths produce a SummaryArtifact — downstream components are unaware of the source.
 */
export function createSummaryFromServer({
  serverSummary,
  durationMs,
}: {
  serverSummary: ServerSummary;
  durationMs: number;
}): void {
  const rawTranscript = $inputTranscript.get().trim();
  const lastSentence = rawTranscript
    ? rawTranscript.split(/[.!?]/).filter(Boolean).pop()?.trim() ?? rawTranscript.slice(-120)
    : '(no spoken input captured)';

  const characterName = $characterName.get() || $previewData.get()?.characterName || 'Unknown';
  const preview = $previewData.get();

  const MAX_IMAGES = 6;
  const allImages = $sceneImages.get();

  const artifact: SummaryArtifact = {
    sessionId: $sessionId.get() || undefined,
    scenarioId: $scenarioId.get(),
    topic: $topic.get(),
    scenarioTitle: preview?.topic ?? $topic.get() ?? 'Call ended',
    role: characterName,
    durationMs,
    endedAt: Date.now(),
    summaryFacts: serverSummary.keyFacts,
    actualOutcome: serverSummary.outcomeComparison,
    yourCall: lastSentence,
    relatedScenarios: [],
    characterMessage: serverSummary.characterMessage,
    suggestedCalls: serverSummary.suggestedCalls,
    outcomeComparison: serverSummary.outcomeComparison,
    transcript: buildTranscript(),
    colorPalette: preview?.colorPalette,
    avatarUrl: resolveAvatarUrl(),
    sceneImages: allImages.length > MAX_IMAGES ? allImages.slice(-MAX_IMAGES) : allImages,
    choiceHistory: $choiceHistory.get(),
  };

  $summary.set(artifact);
  persistSummary(artifact);
}

// ─── Persist / load ───────────────────────────────────────────────────────────

function persistSummary(artifact: SummaryArtifact): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(artifact));
  } catch {
    // sessionStorage unavailable — summary will still be in $summary atom
  }
}

export function loadSummaryArtifact(): SummaryArtifact | null {
  // First check in-memory store (same page session)
  const inMemory = $summary.get();
  if (inMemory) return inMemory;

  // Fall back to sessionStorage (navigation from /session → /summary)
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SummaryArtifact;
    $summary.set(parsed);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Async loader: tries sessionStorage first, then fetches from backend by sessionId.
 * Used when the summary page loads after browser close (sessionStorage may be empty
 * but backend persisted the summary to Firestore).
 */
/**
 * Fetches summary from backend once. Returns null if not found.
 */
async function fetchSummaryFromBackend(
  sessionId: string,
  backendUrl: string,
): Promise<SummaryArtifact | null> {
  try {
    const res = await fetch(`${backendUrl}/api/summary/${sessionId}`);
    if (!res.ok) return null;

    const data = await res.json() as Record<string, unknown>;
    if (data['status'] === 'not_found' || !data['summary']) return null;

    const serverSummary = data['summary'] as {
      keyFacts?: string[];
      outcomeComparison?: string;
      characterMessage?: string;
      suggestedCalls?: { name: string; era: string; hook: string }[];
    };

    const artifact: SummaryArtifact = {
      scenarioId: '',
      topic: '',
      scenarioTitle: (data['characterName'] as string) ?? 'Call ended',
      role: (data['characterName'] as string) ?? '',
      durationMs: (data['durationMs'] as number) ?? 0,
      endedAt: Date.now(),
      summaryFacts: serverSummary.keyFacts ?? [],
      actualOutcome: serverSummary.outcomeComparison ?? '',
      yourCall: '',
      relatedScenarios: [],
      characterMessage: serverSummary.characterMessage,
      suggestedCalls: serverSummary.suggestedCalls,
      outcomeComparison: serverSummary.outcomeComparison,
    };

    $summary.set(artifact);
    persistSummary(artifact);
    return artifact;
  } catch {
    return null;
  }
}

/**
 * Async loader: tries sessionStorage first, then polls backend by sessionId.
 * Polls up to 5 times (2s intervals = 10s total) because the backend generates
 * the summary async after WS close — it may not be ready immediately.
 */
export async function loadSummaryAsync(
  sessionId: string | null,
  backendUrl: string,
): Promise<SummaryArtifact | null> {
  // Try local first
  const local = loadSummaryArtifact();
  if (local) return local;

  // No sessionId → can't fetch from backend
  if (!sessionId) return null;

  // Poll: summary generation takes 3-5s after WS close
  const MAX_ATTEMPTS = 5;
  const POLL_INTERVAL_MS = 2000;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    const result = await fetchSummaryFromBackend(sessionId, backendUrl);
    if (result) return result;
  }

  return null;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
