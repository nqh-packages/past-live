/**
 * @what - Shared image generation via Gemini 3.1 Flash Image Preview
 * @why - DRY: scene-image.ts, session-preview.ts, and future callers all need
 *   identical generateContent config (responseModalities, imageConfig, extraction).
 *   Centralizing prevents the bug where production calls omit responseModalities
 *   but the benchmark includes it.
 * @exports - generateImage, getBrandOrangeReference, ImageGenOptions, IMAGE_MODEL
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAI } from './ai-client.js';
import { logger } from './logger.js';
import { logApiCall, completeApiCall } from './api-call-logger.js';
import { uploadSessionImage, type ImageType } from './gcs-storage.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Constants ────────────────────────────────────────────────────────────────

export const IMAGE_MODEL = 'gemini-3.1-flash-image-preview';

type AspectRatio =
  | '1:1' | '1:4' | '1:8'
  | '2:3' | '3:2' | '3:4'
  | '4:1' | '4:3' | '4:5'
  | '5:4' | '8:1' | '9:16'
  | '16:9' | '21:9';

type ImageSize = '512' | '1K' | '2K' | '4K';

// ─── Brand reference ──────────────────────────────────────────────────────────

let _brandOrangeRef: string | null = null;

/**
 * Load the brand orange reference image as base64. Cached after first read.
 *
 * @why - Sent with every image generation call so the model matches the exact
 *   orange hue established in brand-orange-reference.webp.
 * @pitfall - File must exist at src/assets/brand-orange-reference.webp.
 *   Missing file throws at runtime — fail fast is intentional.
 */
export function getBrandOrangeReference(): string {
  if (!_brandOrangeRef) {
    const path = resolve(__dirname, 'assets/brand-orange-reference.webp');
    _brandOrangeRef = readFileSync(path).toString('base64');
  }
  return _brandOrangeRef;
}

// ─── Options ──────────────────────────────────────────────────────────────────

export interface ImageGenOptions {
  /** Prompt describing the image to generate. */
  prompt: string;
  /** Human-readable label for logging (e.g. 'scene', 'avatar'). */
  imageRole: string;
  /** Aspect ratio. Defaults to '16:9'. */
  aspectRatio?: AspectRatio;
  /** Output resolution. Defaults to '1K'. */
  imageSize?: ImageSize;
  /**
   * Optional reference image for style consistency. Base64-encoded.
   * Send the brand orange reference with every call via getBrandOrangeReference().
   */
  referenceImage?: { data: string; mimeType: string };
  /** When provided, image is also uploaded to GCS for persistent storage. */
  sessionId?: string;
  /** Scene title for GCS metadata (only for scene images). */
  sceneTitle?: string;
}

// ─── Retry helpers ────────────────────────────────────────────────────────────

const RETRY_DELAYS_MS = [2000, 4000];
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Determines if an image gen error is transient and worth retrying.
 * Retries: 429 (rate limit), 500+ (server errors), network failures.
 * Does NOT retry: 400 (bad request), 401/403 (auth), content policy blocks.
 */
function isRetryableError(err: unknown): boolean {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const status = (err as { status: number }).status;
    return status === 429 || status >= 500;
  }
  // Network errors (no status code) — retryable
  if (err instanceof TypeError || (err instanceof Error && err.message.includes('fetch'))) {
    return true;
  }
  return false;
}

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Generates a single image via Gemini 3.1 Flash Image Preview.
 * Returns base64-encoded image data, or null on failure.
 * Retries up to 3 times with exponential backoff (2s, 4s) on transient errors.
 *
 * @pitfall - Previous production code omitted `responseModalities` and `imageConfig`,
 *   causing the model to default to text-only output. The benchmark had the fix but
 *   production didn't. This function ensures every call uses the correct config.
 * @pitfall - When referenceImage is provided, it is prepended to the parts array
 *   so the model sees the style reference before reading the text prompt.
 */
export async function generateImage(opts: ImageGenOptions): Promise<string | null> {
  const { prompt, imageRole, aspectRatio = '16:9', imageSize = '1K', referenceImage, sessionId, sceneTitle } = opts;
  const startMs = Date.now();

  logger.info(
    { event: 'image_gen_start', model: IMAGE_MODEL, imageRole, aspectRatio, imageSize, promptLength: prompt.length, hasRef: !!referenceImage },
    `Starting ${imageRole} image generation`,
  );

  const apiCallIdPromise = logApiCall({ sessionId: 'scene', type: 'image_gen', model: IMAGE_MODEL });

  const ai = getAI();

  const parts: { inlineData?: { data: string; mimeType: string }; text?: string }[] = [];
  if (referenceImage) {
    parts.push({ inlineData: { data: referenceImage.data, mimeType: referenceImage.mimeType } });
  }
  parts.push({ text: prompt });

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: [{ role: 'user', parts }],
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: {
            aspectRatio,
            imageSize,
          },
        },
      });

      const durationMs = Date.now() - startMs;
      const responseParts = response.candidates?.[0]?.content?.parts;

      if (!responseParts) {
        logger.warn(
          { event: 'image_gen_no_parts', code: 'IMG_GEN_002', imageRole, durationMs, attempt: attempt + 1, action: 'Check image model response format' },
          `${imageRole} image response contained no parts`,
        );
        return null;
      }

      for (const part of responseParts) {
        if (part.inlineData?.data) {
          logger.info(
            { event: 'image_gen_success', model: IMAGE_MODEL, imageRole, durationMs, promptLength: prompt.length, attempts: attempt + 1 },
            `${imageRole} image generated in ${(durationMs / 1000).toFixed(1)}s (attempt ${attempt + 1}/${MAX_ATTEMPTS})`,
          );
          void apiCallIdPromise.then((id) => completeApiCall(id, { status: 'completed', durationMs }));

          // Fire-and-forget GCS upload for persistent storage
          if (sessionId) {
            const gcsType: ImageType = imageRole.includes('avatar') ? 'avatar'
              : imageRole.includes('preview') ? 'scene_preview' : 'scene';
            void uploadSessionImage(sessionId, gcsType, part.inlineData.data, { title: sceneTitle });
          }

          return part.inlineData.data;
        }
      }

      logger.warn(
        { event: 'image_gen_no_inline_data', code: 'IMG_GEN_003', imageRole, durationMs, attempt: attempt + 1, action: 'Model returned parts but no inlineData — possible content policy block' },
        `${imageRole} image response had parts but no image data`,
      );
      void apiCallIdPromise.then((id) => completeApiCall(id, { status: 'failed', error: 'no inline data in response', durationMs }));
      return null;
    } catch (err) {
      const durationMs = Date.now() - startMs;

      if (isRetryableError(err) && attempt < MAX_ATTEMPTS - 1) {
        const delayMs = RETRY_DELAYS_MS[attempt];
        logger.warn(
          { event: 'image_gen_retry', imageRole, attempt: attempt + 1, maxAttempts: MAX_ATTEMPTS, delayMs, err },
          `${imageRole} image gen failed, retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_ATTEMPTS})`,
        );
        await sleep(delayMs);
        continue;
      }

      logger.error(
        { event: 'image_gen_failed', code: 'IMG_GEN_001', imageRole, err, durationMs, attempts: attempt + 1, action: 'Check GEMINI_API_KEY and image model quota' },
        `${imageRole} image generation failed after ${attempt + 1} attempt(s)`,
      );
      void apiCallIdPromise.then((id) => completeApiCall(id, { status: 'failed', error: String(err), durationMs }));
      return null;
    }
  }

  return null;
}
