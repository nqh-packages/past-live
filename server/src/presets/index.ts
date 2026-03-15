/**
 * @what - Barrel export for all hand-written preset scenarios
 * @why - Each preset lives in its own file to stay under 350 LOC. This index
 *        re-exports everything through the preset-scenarios.ts shim for backward compat.
 * @exports - PRESET_FALLBACKS, GENERIC_FALLBACK_METADATA, PresetFallback
 */

import type { PreviewMetadata, StoryScript } from '../schemas.js';
import { CONSTANTINOPLE_1453 } from './constantinople-1453.js';
import { MOON_LANDING_1969 } from './moon-landing-1969.js';
import { MONGOL_EMPIRE_1206 } from './mongol-empire-1206.js';
import { BOLIVAR_ANGOSTURA_1819 } from './bolivar-angostura-1819.js';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PresetFallback {
  metadata: PreviewMetadata;
  storyScript: StoryScript;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * Hand-written preset fallbacks with full storyScripts.
 * Keys must match scenarioId values sent by the client.
 *
 * @pitfall - New presets (cleopatra-tarsus, joan-rouen, davinci-milan, tesla-nyc)
 *   are display-only — they use Flash for session preview. Only entries here have
 *   hand-written storyScripts. Add entries as storyScripts are written.
 */
export const PRESET_FALLBACKS: Record<string, PresetFallback> = {
  'constantinople-1453': CONSTANTINOPLE_1453,
  'moon-landing-1969': MOON_LANDING_1969,
  'mongol-empire-1206': MONGOL_EMPIRE_1206,
  'bolivar-angostura-1819': BOLIVAR_ANGOSTURA_1819,
};

/**
 * Generic fallback metadata used when Flash fails and no preset matches.
 * No storyScript — the character will use voice rules only (graceful degradation).
 */
export const GENERIC_FALLBACK_METADATA: PreviewMetadata = {
  topic: 'A Historical Moment',
  userRole: 'A stranger from the future',
  characterName: 'NARRATOR',
  historicalSetting: 'A pivotal moment in time',
  year: 0,
  context:
    'You have stepped into a critical moment in history. The decisions made here will echo for centuries. Listen carefully to the voices around you.',
  colorPalette: [
    'oklch(12% 0.04 60)',
    'oklch(18% 0.04 60)',
    'oklch(65% 0.06 60)',
    'oklch(88% 0.03 60)',
    'oklch(40% 0.07 60)',
  ],
  voiceName: 'Charon',
  decisionPoints: [],
};
