/**
 * @what - Character avatar prompt templates for session preview chat log
 * @why - Small square avatar identifies the AI character in the chat log sender tag
 * @exports - buildCharacterAvatarPrompt
 */

// ─── Known character descriptions ────────────────────────────────────────────

interface CharacterDescription {
  name: string;
  era: string;
  appearance: string;
  expression: string;
  artStyle: string;
}

const CHARACTER_DESCRIPTIONS: Record<string, CharacterDescription> = {
  'constantinople-1453': {
    name: 'Emperor Constantine XI Palaiologos',
    era: '15th-century Byzantine',
    appearance:
      'middle-aged Byzantine emperor wearing purple imperial robes and a crown, exhausted but proud, dark beard streaked with grey',
    expression: 'resolute and weary — the weight of an empire in his eyes',
    artStyle: 'Byzantine icon painting style, gold background, formal and spiritual',
  },
  'moon-landing-1969': {
    name: 'Flight Director Gene Kranz',
    era: '1969 NASA Mission Control',
    appearance:
      'white-vested NASA flight director in a white button-down shirt with thin tie, wearing a headset, short cropped hair',
    expression: 'intensely focused and calm — controlled under immense pressure',
    artStyle: '1960s editorial illustration, clean lines, slightly retro',
  },
  'mongol-empire-1206': {
    name: 'Jamukha',
    era: '13th-century Mongolian steppe',
    appearance:
      'Mongolian warrior chief in leather and fur armour, angular features, black hair in a traditional warrior topknot, dark intelligent eyes',
    expression: 'bitter intelligence mixed with dark wit — a man who has lost and knows it',
    artStyle: 'Mongolian ink wash brush painting, bold strokes, spare background',
  },
};

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Builds a character avatar prompt for a given scenario or free topic.
 * Output is a small square portrait suitable for the chat log sender tag.
 *
 * @param scenarioId - Known scenario ID (optional). Falls back to generic if not found.
 * @param topic - Free-form topic used to describe a generic historical figure.
 * @param characterName - Name of the character (used for open topics).
 * @returns Image generation prompt string.
 *
 * @pitfall - Keep the subject tight — small square means no background detail.
 *   Face and upper chest only. Clear, readable at small size.
 */
export function buildCharacterAvatarPrompt(
  scenarioId?: string,
  topic?: string,
  characterName?: string,
): string {
  const desc = scenarioId ? CHARACTER_DESCRIPTIONS[scenarioId] : undefined;

  if (desc) {
    return [
      `Create a small square character portrait avatar of ${desc.name}.`,
      `Era: ${desc.era}.`,
      `Appearance: ${desc.appearance}.`,
      `Expression: ${desc.expression}.`,
      `Art style: ${desc.artStyle}.`,
      'Tight composition — face and upper chest only. No background clutter.',
      'Square format (1:1). Clear and readable at small size (64px).',
      'No text, no watermarks.',
    ].join(' ');
  }

  // Generic fallback for open topics
  const nameHint = characterName ? `The character's name is ${characterName}.` : 'A historical figure.';
  const topicHint = topic ? `They are associated with: "${topic}".` : '';

  return [
    `Create a small square character portrait avatar for a historical figure.`,
    nameHint,
    topicHint,
    'Period-appropriate costume and appearance.',
    'Painterly documentary portrait style.',
    'Tight composition — face and upper chest only.',
    'Square format (1:1). Clear and readable at small size (64px).',
    'No text, no watermarks.',
  ]
    .filter(Boolean)
    .join(' ');
}
