/**
 * @what - Era-specific scene image prompt templates for session preview
 * @why - Immersive scene art sets tone/mood; each era needs a distinct visual style
 * @exports - buildSceneImagePrompt
 */

// ─── Known era styles ─────────────────────────────────────────────────────────

interface EraStyle {
  artStyle: string;
  palette: string;
  subject: string;
}

const ERA_STYLES: Record<string, EraStyle> = {
  'constantinople-1453': {
    artStyle: 'Byzantine mosaic and medieval illuminated manuscript style',
    palette: 'warm amber, gold leaf, deep crimson, stone grey',
    subject:
      'panoramic view of Constantinople from the Golden Horn — the Theodosian Walls rising along the coastline, Ottoman siege engines and campfires on the hills beyond, the Bosphorus glittering under a blood-red dawn',
  },
  'moon-landing-1969': {
    artStyle: 'NASA archival photography mixed with 1960s technical illustration',
    palette: 'cold blue-white, silver, deep black void, amber instrument glow',
    subject:
      'Mission Control in Houston — rows of consoles bathed in instrument light, men in white shirts leaning forward, the trajectory screen showing the descent path, tension palpable in every posture',
  },
  'mongol-empire-1206': {
    artStyle: 'Mongolian ink wash painting, similar to Song Dynasty brush technique',
    palette: 'earth brown, sky blue, burnt sienna, pale gold steppe',
    subject:
      'vast Mongolian steppe at dawn — a secret meeting of chieftains in a black felt tent, horses tethered outside, distant fires of the kurultai gathering on the horizon',
  },
};

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Builds a scene image generation prompt for a given scenario or free topic.
 *
 * @param scenarioId - Known scenario ID (optional). Falls back to generic if not found.
 * @param topic - Free-form topic used when no matching scenario exists.
 * @param historicalSetting - Specific location/era from Flash metadata (e.g. "Constantinople, 1453").
 *   Improves open-topic scene accuracy when passed from the Flash JSON result.
 * @returns Image generation prompt string.
 *
 * @pitfall - Result is NOT a portrait. Scene art only — wide establishing shot.
 *   Character avatars use a separate prompt from character-avatar.ts.
 */
export function buildSceneImagePrompt(scenarioId?: string, topic?: string, historicalSetting?: string): string {
  const era = scenarioId ? ERA_STYLES[scenarioId] : undefined;

  if (era) {
    return [
      `Create an immersive historical scene image in ${era.artStyle}.`,
      `Color palette: ${era.palette}.`,
      `Scene: ${era.subject}.`,
      'This is an establishing wide shot — NOT a character portrait.',
      'No text, no borders, no watermarks.',
      'Cinematic composition. Atmospheric lighting. High drama.',
      'Aspect ratio: landscape (16:9).',
    ].join(' ');
  }

  // Generic fallback for open topics — use historicalSetting when available for better accuracy
  const locationHint = historicalSetting
    ? `The historical setting is: "${historicalSetting}".`
    : topic
      ? `The historical topic is: "${topic}".`
      : 'A significant historical moment.';

  return [
    `Create an immersive historical scene image in a painterly documentary style.`,
    locationHint,
    'Show the environment, atmosphere, and era — NOT a character portrait.',
    'Dramatic lighting. Rich textures. Cinematic wide shot.',
    'No text, no borders, no watermarks.',
    'Aspect ratio: landscape (16:9).',
  ].join(' ');
}
