/**
 * @what - Character avatar prompt templates for session preview chat log
 * @why - Small square avatar identifies the AI character in the chat log sender tag
 * @exports - buildCharacterAvatarPrompt, getAvatarReferenceImage
 */

import { getBrandOrangeReference } from '../image-gen.js';

// ─── Known character descriptions ────────────────────────────────────────────

// artStyle is intentionally absent — ALL characters use the unified currency
// engraving style defined in buildCharacterAvatarPrompt(). See prompts/CLAUDE.md.
interface CharacterDescription {
  name: string;
  era: string;
  appearance: string;
  expression: string;
}

const CHARACTER_DESCRIPTIONS: Record<string, CharacterDescription> = {
  'constantinople-1453': {
    name: 'Emperor Constantine XI Palaiologos',
    era: '15th-century Byzantine',
    appearance:
      'middle-aged Byzantine emperor wearing purple imperial robes and a crown, exhausted but proud, dark beard streaked with grey',
    expression: 'resolute and weary — the weight of an empire in his eyes',
  },
  'moon-landing-1969': {
    name: 'Flight Director Gene Kranz',
    era: '1969 NASA Mission Control',
    appearance:
      'white-vested NASA flight director in a white button-down shirt with thin tie, wearing a headset, short cropped hair',
    expression: 'intensely focused and calm — controlled under immense pressure',
  },
  'mongol-empire-1206': {
    name: 'Jamukha',
    era: '13th-century Mongolian steppe',
    appearance:
      'Mongolian warrior chief in leather and fur armour, angular features, black hair in a traditional warrior topknot, dark intelligent eyes',
    expression: 'bitter intelligence mixed with dark wit — a man who has lost and knows it',
  },
};

// ─── Reference image helper ───────────────────────────────────────────────────

/**
 * Returns the brand orange reference image payload for avatar generation calls.
 * Pass this as `referenceImage` in ImageGenOptions.
 */
export function getAvatarReferenceImage(): { data: string; mimeType: string } {
  return { data: getBrandOrangeReference(), mimeType: 'image/webp' };
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Builds a character avatar prompt for a given scenario or free topic.
 * Output is a small square portrait suitable for the chat log sender tag.
 *
 * ALL characters use the currency engraving + brand orange style. No per-character
 * art style variations are applied. See prompts/CLAUDE.md for the locked style spec.
 *
 * @param scenarioId - Known scenario ID (optional). Falls back to generic if not found.
 * @param topic - Free-form topic used to describe a generic historical figure.
 * @param characterName - Name of the character (used for open topics).
 * @returns Image generation prompt string.
 *
 * @pitfall - Keep the subject tight — small square means no background detail.
 *   Face and upper chest only. Clear, readable at small size.
 * @pitfall - Do NOT pass artStyle from per-character data. The style is unified
 *   and injected here. Adding per-character style breaks visual consistency.
 */
export function buildCharacterAvatarPrompt(
  scenarioId?: string,
  topic?: string,
  characterName?: string,
): string {
  const desc = scenarioId ? CHARACTER_DESCRIPTIONS[scenarioId] : undefined;

  if (desc) {
    return [
      `Portrait of ${desc.name} in currency engraving banknote style with ultra-fine crosshatching parallel lines.`,
      'The figure is entirely black and white monochrome engraving with intricate detail.',
      'The background is a vivid saturated warm orange with subtle mottled paper texture.',
      'About 30 percent orange background, 70 percent black and white figure.',
      `Appearance: ${desc.appearance}.`,
      `Expression: ${desc.expression}.`,
      'No text, no letters, no words, no writing, no frame, no border.',
      'Square format.',
    ].join(' ');
  }

  // Generic fallback for open topics
  const nameHint = characterName ? `Portrait of ${characterName}` : 'Portrait of a historical figure';
  const topicHint = topic ? `They are associated with: "${topic}".` : '';

  return [
    `${nameHint} in currency engraving banknote style with ultra-fine crosshatching parallel lines.`,
    'The figure is entirely black and white monochrome engraving with intricate detail.',
    'The background is a vivid saturated warm orange with subtle mottled paper texture.',
    'About 30 percent orange background, 70 percent black and white figure.',
    'Period-appropriate costume and appearance.',
    topicHint,
    'No text, no letters, no words, no writing, no frame, no border.',
    'Square format.',
  ]
    .filter(Boolean)
    .join(' ');
}
