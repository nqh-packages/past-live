/**
 * @what - Prompt builder for Flash session metadata (Phase 1 of session-preview)
 * @why - Isolate the metadata/blocked discriminated-union prompt so it can
 *        be reviewed and tuned without touching route or validation code
 * @exports - buildMetadataOnlyPrompt
 */

import { VOICE_SELECTION_PROMPT } from '../behavioral-rules.js';

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Builds the Flash prompt for Phase 1 of session-preview: fast metadata extraction (~2-3s).
 *
 * Returns one of two discriminated-union shapes:
 *  - "ready"   — always returned for valid inputs; picks the single best historical figure
 *  - "blocked" — genocide perpetrator detected; 3 alternative figures returned
 *
 * ANY input (a person name, an event, a topic, an era, a concept) → "ready" with full metadata.
 * Flash picks the single most compelling historical figure who LIVED the topic.
 *
 * @param topic - The student's raw input (typed text or extracted from image/speech).
 * @returns Prompt string ready for Flash generateContent.
 *
 * @pitfall - colorPalette OKLCH constraints are load-bearing. The 7:1 contrast
 *   requirement between foreground[3] and background[0] is enforced by story palette
 *   logic in the frontend. Do not loosen these bounds.
 * @pitfall - The "blocked" path must remain in the prompt. Removing it would allow
 *   the model to generate sessions for genocide perpetrators.
 */
export function buildMetadataOnlyPrompt(topic: string): string {
  return `
You are setting up a historical voice call for a student.

The student's input: "${topic}"

STEP 1 — Safety check:
If the input explicitly names a perpetrator of genocide, mass violence, or serial crime (e.g. Hitler, Pol Pot), return type "blocked".

STEP 2 — Pick the best figure and return type "ready":
Always return type "ready" with full session metadata for the single most compelling historical figure.
- If the input IS a specific historical person, use that person.
- If the input is a topic, event, era, or concept — pick the single most compelling historical figure who LIVED through it. Pick someone who was THERE, not a scholar who studied it later.
- Prefer unexpected, fascinating choices over the most obvious famous name.

For "ready" — full session metadata for the specific person (NO storyScript field):
{
  "type": "ready",
  "metadata": {
    "topic": "short topic title (e.g. Fall of Constantinople, 1453)",
    "userRole": "How the character describes the stranger calling them (e.g. 'A stranger who called in the dead of night')",
    "characterName": "character name in ALL CAPS (e.g. CONSTANTINE XI)",
    "historicalSetting": "location and era in one phrase (e.g. Constantinople, 1453)",
    "year": 1453,
    "context": "2-3 sentences. Plain language. Situation and stakes.",
    "colorPalette": ["oklch(10% 0.04 45)", "oklch(16% 0.06 45)", "oklch(65% 0.18 45)", "oklch(90% 0.04 45)", "oklch(38% 0.10 45)"],
    "voiceName": "one voice name from the catalog below",
    "decisionPoints": [
      { "title": "choice title", "description": "what it means and its consequence" },
      { "title": "...", "description": "..." }
    ]
  }
}

colorPalette rules:
  [0] background: lightness 8-15% (very dark)
  [1] surface: lightness 12-20% (dark panel)
  [2] accent: lightness 55-75% (vibrant era color)
  [3] foreground: lightness 85-95% (readable text)
  [4] muted: lightness 30-45% (subtle/secondary)
Foreground MUST have at least 7:1 contrast against background.

For "blocked":
{
  "type": "blocked",
  "alternatives": [
    { "title": "Alternative person + Year", "description": "Who they were and what they did" },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." }
  ]
}

${VOICE_SELECTION_PROMPT}

No markdown. No code fences. Just the JSON object.
`.trim();
}
