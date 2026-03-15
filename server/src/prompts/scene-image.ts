/**
 * @what - Era-specific scene image prompt templates for session preview
 * @why - Immersive scene art sets tone/mood; unified currency engraving style
 *   with selective orange on the main focal event creates brand-consistent visuals
 * @exports - buildSceneImagePrompt, getSceneReferenceImage
 */

import { getBrandOrangeReference } from '../image-gen.js';

// ─── Known era subjects ───────────────────────────────────────────────────────

// artStyle and palette are intentionally absent — ALL eras use the unified
// currency engraving style defined in buildSceneImagePrompt(). See CLAUDE.md.
interface EraSubject {
  subject: string;
  orangeFocal: string;
}

const ERA_SUBJECTS: Record<string, EraSubject> = {
  'constantinople-1453': {
    subject:
      'panoramic view of Constantinople from the Golden Horn — the Theodosian Walls rising along the coastline, Ottoman siege engines and campfires on the hills beyond, the Bosphorus under a blood-red dawn',
    orangeFocal: 'fires on the walls and Ottoman cannon blasts',
  },
  'moon-landing-1969': {
    subject:
      'Mission Control in Houston — rows of consoles bathed in instrument light, men in white shirts leaning forward, the trajectory screen showing the descent path, tension palpable in every posture',
    orangeFocal: 'glowing display screens and control panels',
  },
  'mongol-empire-1206': {
    subject:
      'vast Mongolian steppe at dawn — a secret meeting of chieftains in a black felt tent, horses tethered outside, distant fires of the kurultai gathering on the horizon',
    orangeFocal: 'central bonfire and the khan\'s war banner',
  },
};

// ─── Reference image helper ───────────────────────────────────────────────────

/**
 * Returns the brand orange reference image payload for scene generation calls.
 * Pass this as `referenceImage` in ImageGenOptions.
 */
export function getSceneReferenceImage(): { data: string; mimeType: string } {
  return { data: getBrandOrangeReference(), mimeType: 'image/webp' };
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Builds a scene image generation prompt for a given scenario or free topic.
 *
 * ALL scenes use currency engraving + selective brand orange on the main event.
 * The orange appears on the focal action only (~30%), not the background.
 * See prompts/CLAUDE.md for the locked style spec.
 *
 * @param scenarioId - Known scenario ID (optional). Falls back to generic if not found.
 * @param topic - Free-form topic used when no matching scenario exists.
 * @param historicalSetting - Specific location/era from Flash metadata (e.g. "Constantinople, 1453").
 *   Improves open-topic scene accuracy when passed from the Flash JSON result.
 * @returns Image generation prompt string.
 *
 * @pitfall - Result is NOT a portrait. Scene art only — wide establishing shot.
 *   Character avatars use a separate prompt from character-avatar.ts.
 * @pitfall - Do NOT add per-era color palettes or art styles. The style is unified.
 *   Only the subject and orangeFocal element are era-specific.
 */
export function buildSceneImagePrompt(scenarioId?: string, topic?: string, historicalSetting?: string): string {
  const era = scenarioId ? ERA_SUBJECTS[scenarioId] : undefined;

  if (era) {
    return [
      'Wide landscape scene in currency engraving banknote style with ultra-fine crosshatching parallel lines.',
      `Entirely black and white monochrome EXCEPT ${era.orangeFocal} which is rendered in vivid saturated warm orange.`,
      'About 30 percent orange on the focal action, 70 percent black and white.',
      `Scene: ${era.subject}.`,
      'Cinematic composition. Atmospheric lighting.',
      'No text, no letters, no words, no writing, no frame, no border.',
    ].join(' ');
  }

  // Generic fallback for open topics — use historicalSetting when available for better accuracy
  const locationHint = historicalSetting
    ? `The historical setting is: "${historicalSetting}".`
    : topic
      ? `The historical topic is: "${topic}".`
      : 'A significant historical moment.';

  return [
    'Wide landscape scene in currency engraving banknote style with ultra-fine crosshatching parallel lines.',
    'Entirely black and white monochrome EXCEPT the main focal action or event which is rendered in vivid saturated warm orange.',
    'About 30 percent orange on the focal action, 70 percent black and white.',
    locationHint,
    'Show the environment, atmosphere, and era. Cinematic wide shot. Atmospheric lighting.',
    'No text, no letters, no words, no writing, no frame, no border.',
  ].join(' ');
}
