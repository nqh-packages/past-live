/**
 * @what - Mid-call scene image generation via show_scene tool
 * @why - Gemini Live decides when to show a visual; this generates it in background
 *   using the same currency engraving + brand orange style as all other images
 * @exports - generateSceneImage
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateImage } from './image-gen.js';
import { getSceneReferenceImage } from './prompts/scene-image.js';
import { logger } from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGE_LOG_DIR = join(__dirname, '../../docs/call-logs/images');

/**
 * Generate a scene image from a description provided by the show_scene tool call.
 * Returns base64-encoded image or null on failure.
 *
 * Uses the unified currency engraving + brand orange style. The brand orange
 * reference image is sent with every call for consistent color matching.
 */
export async function generateSceneImage(description: string, sessionId?: string, sceneTitle?: string): Promise<string | null> {
  const prompt = [
    'Create a wide landscape illustration in currency engraving banknote style with ultra-fine crosshatching parallel lines.',
    'Entirely black and white monochrome EXCEPT the main focal action or event which is rendered in vivid saturated warm orange.',
    'About 30 percent orange on the focal action, 70 percent black and white.',
    'No text, no letters, no words, no writing, no frame, no border.',
    `Scene: ${description}`,
  ].join(' ');

  const base64 = await generateImage({
    prompt,
    imageRole: 'scene_midcall',
    aspectRatio: '16:9',
    imageSize: '1K',
    referenceImage: getSceneReferenceImage(),
    sessionId,
    sceneTitle,
  });

  // Save to disk for review (non-critical)
  if (base64) {
    try {
      mkdirSync(IMAGE_LOG_DIR, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `${ts}.png`;
      writeFileSync(join(IMAGE_LOG_DIR, filename), Buffer.from(base64, 'base64'));
      logger.info({ event: 'scene_image_saved', path: `docs/call-logs/images/${filename}` }, 'Scene image saved to disk');
    } catch (saveErr) {
      logger.warn({ event: 'scene_image_save_failed', err: saveErr }, 'Non-critical: failed to save scene image to disk');
    }
  }

  return base64;
}
