/**
 * @what - Post-call Gemini Flash summary: extracts key facts from voice call transcript
 * @why - Call log currently shows hardcoded facts. Real extraction from transcript = real learning verification.
 * @exports - generatePostCallSummary, PostCallSummary
 */

import { getAI } from './ai-client.js';
import { logger } from './logger.js';
import { postCallSummarySchema, type PostCallSummary } from './schemas.js';
import { logApiCall, completeApiCall } from './api-call-logger.js';
import { buildSummaryPrompt, type SummaryParams } from './prompts/post-call-summary.js';

// Re-export so callers that import PostCallSummary from this module don't break.
export type { PostCallSummary } from './schemas.js';

// ─── Model ────────────────────────────────────────────────────────────────────

const FLASH_MODEL = 'gemini-3-flash-preview';

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
  const startMs = Date.now();
  const ai = getAI();
  const prompt = buildSummaryPrompt(params);

  logger.info(
    {
      event: 'summary_request_start',
      model: FLASH_MODEL,
      characterName: params.characterName,
      historicalSetting: params.historicalSetting,
      inputTranscriptLength: params.inputTranscript.length,
      outputTranscriptLength: params.outputTranscript.length,
    },
    'Requesting post-call summary from Flash',
  );

  const apiCallIdPromise = logApiCall({ sessionId: 'summary', type: 'flash_summary', model: FLASH_MODEL });

  let response: Awaited<ReturnType<typeof ai.models.generateContent>>;
  try {
    response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
  } catch (err) {
    void apiCallIdPromise.then((id) => completeApiCall(id, { status: 'failed', error: String(err), durationMs: Date.now() - startMs }));
    throw err;
  }

  const durationMs = Date.now() - startMs;
  void apiCallIdPromise.then((id) => completeApiCall(id, { status: 'completed', durationMs }));
  const raw = response.text ?? '';

  if (!raw.trim()) {
    logger.error(
      {
        event: 'summary_empty_response',
        code: 'SUMMARY_EMPTY_001',
        durationMs,
        action: 'Flash returned empty response — check model quota and prompt length',
      },
      'Post-call summary: empty response from Gemini',
    );
    throw new Error('Post-call summary: empty response from Gemini');
  }

  logger.debug(
    { event: 'summary_raw_response', durationMs, rawLength: raw.length },
    'Post-call summary raw response received',
  );

  // Strip markdown fences that Flash sometimes wraps JSON in
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '');

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    logger.error(
      {
        event: 'summary_parse_failed',
        code: 'SUMMARY_PARSE_001',
        err,
        durationMs,
        rawSnippet: cleaned.slice(0, 120),
        action: 'Flash returned non-JSON for summary — check model or retry',
      },
      'Post-call summary JSON parse failed',
    );
    throw new Error(
      `Post-call summary malformed JSON: ${cleaned.slice(0, 120)}`,
    );
  }

  // Validate shape with Zod — gives typed result + descriptive field-level errors in one call
  const validation = postCallSummarySchema.safeParse(parsed);
  if (!validation.success) {
    logger.error(
      {
        event: 'summary_validation_failed',
        code: 'SUMMARY_VALIDATE_001',
        errors: validation.error.flatten(),
        action: 'Flash returned invalid summary shape — check prompt schema',
      },
      'Post-call summary Zod validation failed',
    );
    throw new Error(`Post-call summary validation failed: ${validation.error.message}`);
  }

  const summary = validation.data;

  logger.info(
    {
      event: 'summary_success',
      characterName: params.characterName,
      durationMs,
      keyFactsCount: summary.keyFacts.length,
      suggestedCallsCount: summary.suggestedCalls.length,
    },
    'Post-call summary generated and validated',
  );

  return summary;
}
