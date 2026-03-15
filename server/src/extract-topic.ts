/**
 * @what - POST /extract-topic — extract a study topic + 3 related figure cards from a base64 image
 * @why - Home camera input lets students snap their textbook; Flash extracts the topic and immediately
 *        suggests 3 historical figures related to it so the student can pick who to call
 * @exports - extractTopicRoute
 */

import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { getAI } from './ai-client.js';
import { logger } from './logger.js';
import { logApiCall, completeApiCall } from './api-call-logger.js';
import { extractTopicResponseSchema } from './schemas.js';
import type { ExtractTopicResponse } from './schemas.js';
import { buildExtractTopicPrompt } from './prompts/extract-topic.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const FLASH_MODEL = 'gemini-3-flash-preview';
const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2 MB

// ─── Request type ─────────────────────────────────────────────────────────────

interface ExtractTopicRequest {
  image: string;    // base64-encoded image data (raw, no data URL prefix)
  mimeType: string; // e.g. "image/jpeg", "image/png"
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const extractTopicRoute = new Hono();

extractTopicRoute.post(
  '/extract-topic',
  bodyLimit({ maxSize: MAX_BODY_SIZE, onError: (c) => c.json({ error: 'Image too large (max 2 MB)' }, 413) }),
  async (c) => {
    let body: ExtractTopicRequest;

    try {
      body = await c.req.json<ExtractTopicRequest>();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const { image, mimeType } = body;

    if (typeof image !== 'string' || !image) {
      logger.warn({ event: 'extract_topic_bad_request', reason: 'missing_image' }, 'extract-topic: image field missing');
      return c.json({ error: 'image field required (base64 string)' }, 400);
    }

    if (typeof mimeType !== 'string' || !mimeType.startsWith('image/')) {
      logger.warn({ event: 'extract_topic_bad_request', reason: 'invalid_mime_type', mimeType }, 'extract-topic: invalid mimeType');
      return c.json({ error: 'mimeType must be an image/* type' }, 400);
    }

    const startMs = Date.now();

    logger.info(
      { event: 'extract_topic_start', model: FLASH_MODEL, mimeType, imageSizeBytes: image.length },
      'Extracting topic + figures from image via Flash vision',
    );

    const apiCallIdPromise = logApiCall({ sessionId: 'topic', type: 'extract_topic', model: FLASH_MODEL });

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: FLASH_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { data: image, mimeType } },
              { text: buildExtractTopicPrompt() },
            ],
          },
        ],
      });

      const durationMs = Date.now() - startMs;
      const raw = response.text?.trim() ?? '';
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');

      let rawParsed: unknown;
      try {
        rawParsed = JSON.parse(cleaned);
      } catch {
        logger.error(
          { event: 'extract_topic_parse_failed', code: 'EXTRACT_TOPIC_002', durationMs, rawSnippet: cleaned.slice(0, 120) },
          'extract-topic: Flash returned non-JSON',
        );
        void apiCallIdPromise.then((id) => completeApiCall(id, { status: 'failed', error: 'malformed JSON', durationMs }));
        return c.json({ error: 'Failed to parse topic response' }, 500);
      }

      const validation = extractTopicResponseSchema.safeParse(rawParsed);
      if (!validation.success) {
        logger.error(
          { event: 'extract_topic_invalid', code: 'EXTRACT_TOPIC_003', errors: validation.error.flatten(), durationMs },
          'extract-topic: Zod validation failed',
        );
        void apiCallIdPromise.then((id) => completeApiCall(id, { status: 'failed', error: 'validation failed', durationMs }));
        return c.json({ error: 'Invalid response shape from Flash' }, 500);
      }

      const result: ExtractTopicResponse = validation.data;

      logger.info(
        { event: 'extract_topic_success', topic: result.topic_extracted, figureCount: result.figures.length, durationMs },
        'Topic + figures extracted from image',
      );

      void apiCallIdPromise.then((id) => completeApiCall(id, { status: 'completed', durationMs }));
      return c.json(result);
    } catch (err) {
      const durationMs = Date.now() - startMs;
      logger.error(
        {
          event: 'extract_topic_failed',
          code: 'EXTRACT_TOPIC_001',
          err,
          durationMs,
          action: 'Check GEMINI_API_KEY and Flash model availability',
        },
        'Flash vision failed to extract topic from image',
      );
      void apiCallIdPromise.then((id) => completeApiCall(id, { status: 'failed', error: String(err), durationMs }));
      const message = err instanceof Error ? err.message : 'Gemini request failed';
      return c.json({ error: 'Failed to extract topic', detail: message }, 500);
    }
  },
);
