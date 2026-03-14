/**
 * @what - POST /extract-topic — extract a study topic from a base64 image via Gemini Flash vision
 * @why - Home camera input lets students snap their textbook; Flash extracts the topic text
 * @exports - extractTopicRoute
 */

import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { getAI } from './ai-client.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const FLASH_MODEL = 'gemini-3-flash-preview';
const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2 MB

// ─── Request / Response types ─────────────────────────────────────────────────

interface ExtractTopicRequest {
  image: string;    // base64-encoded image data
  mimeType: string; // e.g. "image/jpeg", "image/png"
}

interface ExtractTopicResponse {
  topic: string;
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const EXTRACT_TOPIC_PROMPT = `
Look at this image. It likely shows a textbook page, worksheet, or study material.

Your job: identify the main historical topic shown.

Return ONLY a short topic phrase (3-8 words). Examples:
- "The Fall of Constantinople, 1453"
- "Moon Landing Apollo 11, 1969"
- "French Revolution, 1789"
- "World War I trenches"
- "Ancient Roman Republic"

If no clear historical topic is visible, return "a historical moment".
No explanation. No punctuation. Just the topic phrase.
`.trim();

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
      return c.json({ error: 'image field required (base64 string)' }, 400);
    }

    if (typeof mimeType !== 'string' || !mimeType.startsWith('image/')) {
      return c.json({ error: 'mimeType must be an image/* type' }, 400);
    }

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: FLASH_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { data: image, mimeType } },
              { text: EXTRACT_TOPIC_PROMPT },
            ],
          },
        ],
      });

      const topic = response.text?.trim() ?? 'a historical moment';
      const result: ExtractTopicResponse = { topic };
      return c.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gemini request failed';
      console.error('[extract-topic] Gemini error:', message);
      return c.json({ error: 'Failed to extract topic', detail: message }, 500);
    }
  },
);
