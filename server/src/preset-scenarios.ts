/**
 * @what - Re-export shim for backward compatibility
 * @why - preset-scenarios.ts was split into individual files under presets/ to stay
 *        under the 350 LOC limit (7 presets would exceed it). This shim preserves
 *        the original export contract for any callers that have not been updated yet.
 * @exports - PRESET_FALLBACKS, GENERIC_FALLBACK_METADATA, PresetFallback
 */

export {
  PRESET_FALLBACKS,
  GENERIC_FALLBACK_METADATA,
  type PresetFallback,
} from './presets/index.js';
