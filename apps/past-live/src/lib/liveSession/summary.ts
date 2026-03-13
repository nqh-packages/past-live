/**
 * @what - Builds and persists the session summary artifact for /summary page
 * @why - Deterministic MVP summary: pulls facts from scenario metadata, stores in sessionStorage
 * @exports - createSummaryArtifact, loadSummaryArtifact
 */

import { $summary, $inputTranscript, type SummaryArtifact } from '../../stores/liveSession';

// ─── Scenario metadata (inlined to avoid server/browser boundary crossing) ────
// Source of truth: server/src/scenarios.ts — keep in sync if scenario data changes

interface ScenarioMeta {
  title: string;
  role: string;
  summaryFacts: string[];
  actualOutcome: string;
  relatedScenarios: string[];
}

const SCENARIO_META: Record<string, ScenarioMeta> = {
  'constantinople-1453': {
    title: 'Fall of Constantinople',
    role: "Emperor's advisor",
    summaryFacts: [
      'Mehmed II moved 72 Ottoman ships overland on greased logs to bypass the harbor chain.',
      'Constantinople had fewer than 7,000 defenders against 80,000 Ottoman troops.',
      'The city had survived sieges for over a thousand years before finally falling on May 29, 1453.',
      'Emperor Constantine XI died in the final battle — the last Byzantine Emperor.',
      'The fall ended the Byzantine Empire and opened Europe to Ottoman expansion.',
    ],
    actualOutcome:
      'Constantinople fell on May 29, 1453. Mehmed II entered the city through the Kerkoporta gate, left accidentally open. Constantine XI died fighting in the streets. The city became Istanbul, capital of the Ottoman Empire. The Byzantine Empire — the eastern continuation of Rome — ended after 1,000 years.',
    relatedScenarios: ['moon-landing-1969', 'mongol-empire-1206'],
  },
  'moon-landing-1969': {
    title: 'Apollo 11 Moon Landing',
    role: 'NASA Mission Control engineer',
    summaryFacts: [
      "The 1202 alarm meant the guidance computer was shedding low-priority tasks — it was flight-safe.",
      "Neil Armstrong manually flew Eagle past a boulder field, adding 30 seconds to the planned descent.",
      "Eagle touched down with only 25-30 seconds of fuel remaining.",
      "The words 'Tranquility Base here — the Eagle has landed' were heard with 1.3 seconds of signal delay.",
      "Six hours after landing, Armstrong became the first human to walk on the Moon.",
    ],
    actualOutcome:
      "Armstrong chose to continue the manual descent despite the computer alarms and boulder field. Eagle landed in the Sea of Tranquility on July 20, 1969, with roughly 25 seconds of fuel to spare. Flight Director Gene Kranz later said: \"Failure is not an option\" — but the real decision at that moment was trusting the pilot's eyes over the numbers.",
    relatedScenarios: ['constantinople-1453', 'mongol-empire-1206'],
  },
  'mongol-empire-1206': {
    title: 'Rise of the Mongol Empire',
    role: "Khan's rival tribal chieftain",
    summaryFacts: [
      'Temujin was declared Genghis Khan at the great kurultai of 1206, uniting all Mongol tribes.',
      "Jamukha was Temujin's anda (sworn brother) and his most capable rival — they fought three wars.",
      'Temujin promoted warriors by merit, not bloodline — breaking centuries of clan hierarchy.',
      "Jamukha was eventually betrayed by his own men; Genghis Khan had the betrayers executed for disloyalty.",
      'The Mongol Empire became the largest contiguous land empire in history within 70 years.',
    ],
    actualOutcome:
      "Temujin was declared Genghis Khan in 1206 and united the Mongol steppe under one banner. Jamukha refused to submit and was eventually captured. According to tradition, Genghis Khan offered him an honorable death — no blood spilled — as respect for a worthy enemy. The tribes that joined early were given positions of honor. Those that resisted were absorbed or destroyed.",
    relatedScenarios: ['constantinople-1453', 'moon-landing-1969'],
  },
};

const OPEN_TOPIC_FACTS = [
  'Historical role-play deepens engagement and memory retention.',
  'Reasoning from context — not memorization — is the core skill.',
  'Every historical moment had agents who shaped it through decisions, not fate.',
];

const SESSION_STORAGE_KEY = 'past-live:summary';

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

  const artifact: SummaryArtifact = {
    scenarioId,
    topic,
    scenarioTitle: meta?.title ?? (topic ? `Free study: ${topic}` : 'Open session'),
    role: meta?.role ?? 'Student',
    durationMs,
    summaryFacts: meta?.summaryFacts ?? OPEN_TOPIC_FACTS,
    actualOutcome: meta?.actualOutcome ?? 'Session completed. Review the transcript for key moments.',
    yourCall: lastSentence,
    relatedScenarios: meta?.relatedScenarios ?? ['constantinople-1453', 'moon-landing-1969'],
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

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
