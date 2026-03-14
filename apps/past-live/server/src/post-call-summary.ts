/**
 * @what - Post-call Gemini Flash summary: extracts key facts from voice call transcript
 * @why - Call log currently shows hardcoded facts. Real extraction from transcript = real learning verification.
 * @exports - generatePostCallSummary, PostCallSummary
 */

import { getAI } from './ai-client.js';
import { logger } from './logger.js';

// ─── Model ────────────────────────────────────────────────────────────────────

const FLASH_MODEL = 'gemini-3-flash-preview';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PostCallSummary {
  /** 3-5 key historical facts actually discussed during the call. */
  keyFacts: string[];
  /** How the student's advice/choices compare to what actually happened historically. */
  outcomeComparison: string;
  /** Character's farewell message — positive observation about the student, written IN CHARACTER. */
  characterMessage: string;
  /** 3 related historical figures to call next. */
  suggestedCalls: { name: string; era: string; hook: string }[];
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface SummaryParams {
  characterName: string;
  historicalSetting: string;
  inputTranscript: string;
  outputTranscript: string;
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildSummaryPrompt(params: SummaryParams): string {
  const { characterName, historicalSetting, inputTranscript, outputTranscript } = params;

  return `
You are analyzing a completed educational voice call between a student and ${characterName}, a historical figure in ${historicalSetting}.

TRANSCRIPT — Character (${characterName}):
${outputTranscript || '(no output transcript recorded)'}

TRANSCRIPT — Student:
${inputTranscript || '(no input transcript recorded)'}

Your task: Generate a post-call summary for the student's call log.

Return ONLY valid JSON matching this exact schema:
{
  "keyFacts": [
    "A specific historical fact that was actually discussed in the call (3-8 facts)",
    "..."
  ],
  "outcomeComparison": "A single paragraph comparing the student's advice and choices during the call to what actually happened historically. Be specific about what they got right and what the real outcome was.",
  "characterMessage": "A farewell message written IN CHARACTER as ${characterName}. This must be a POSITIVE OBSERVATION about the student — what they noticed, understood, or thought well about. End every call with dignity. Follow emotional boundaries: express gratitude or pride, never dependency or guilt. 2-3 sentences maximum.",
  "suggestedCalls": [
    { "name": "Full name of a related historical figure", "era": "Location and year (e.g. Rome, 44 BC)", "hook": "A one-line teaser in the character's own voice — what they would say to get a student to call them" },
    { "name": "...", "era": "...", "hook": "..." },
    { "name": "...", "era": "...", "hook": "..." }
  ]
}

Rules:
- keyFacts: Extract ONLY facts that were actually discussed in the transcript. If the transcript is empty, generate 3-5 historically accurate facts about ${historicalSetting} that a student would benefit from knowing.
- characterMessage: NEVER say "don't leave me", "I need you", or anything creating dependency. Express pride in the student's thinking. Stay in character voice.
- suggestedCalls: Choose figures related to the same era, event, or historical thread. Include opposing perspectives when interesting (e.g. the enemy general, a witness, an ally).
- No markdown. No code fences. Just the JSON object.
`.trim();
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generates a post-call summary by sending the call transcript to Gemini Flash.
 * Parses and validates the JSON response before returning.
 *
 * @throws When the Gemini API fails or returns malformed/invalid JSON.
 * @pitfall - Caller should catch and fall back to Phase 1 SCENARIO_META summary
 *   if this throws (network failure, quota, etc.).
 */
export async function generatePostCallSummary(params: SummaryParams): Promise<PostCallSummary> {
  const ai = getAI();
  const prompt = buildSummaryPrompt(params);

  logger.debug(
    { event: 'summary_request', characterName: params.characterName, historicalSetting: params.historicalSetting },
    'Requesting post-call summary from Flash',
  );

  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const raw = response.text ?? '';

  if (!raw.trim()) {
    throw new Error('Post-call summary: empty response from Gemini');
  }

  // Strip markdown fences that Flash sometimes wraps JSON in
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '');

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Post-call summary malformed JSON: ${cleaned.slice(0, 120)}`,
    );
  }

  // Validate required fields
  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj['keyFacts'])) {
    throw new Error('Post-call summary: keyFacts must be an array');
  }
  if (typeof obj['outcomeComparison'] !== 'string') {
    throw new Error('Post-call summary: outcomeComparison must be a string');
  }
  if (typeof obj['characterMessage'] !== 'string') {
    throw new Error('Post-call summary: characterMessage must be a string');
  }
  if (!Array.isArray(obj['suggestedCalls'])) {
    throw new Error('Post-call summary: suggestedCalls must be an array');
  }

  return parsed as PostCallSummary;
}
