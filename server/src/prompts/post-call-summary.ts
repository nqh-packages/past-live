/**
 * @what - Prompt builder for post-call Flash summary generation
 * @why - Isolate prompt text from the summary generation logic so it can be
 *        reviewed and tuned without touching API call or validation code
 * @exports - buildSummaryPrompt
 */

import { CHARACTER_VOICE, buildCharacterIdentity } from '../character-voice.js';

// ─── Input type ───────────────────────────────────────────────────────────────

export interface SummaryParams {
  characterName: string;
  historicalSetting: string;
  inputTranscript: string;
  outputTranscript: string;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Builds the Flash prompt for generating a post-call summary in the character's voice.
 *
 * The prompt injects the full transcript and instructs Flash to extract key facts,
 * write an outcome comparison, compose a farewell message, and suggest 3 next calls —
 * all in the character's own register (warm, witty, self-aware).
 *
 * @param params - Character name, historical setting, and both transcript sides.
 * @returns Prompt string ready for Flash generateContent.
 *
 * @pitfall - keyFacts must reflect what was ACTUALLY discussed. If transcripts are
 *   empty, Flash falls back to historically accurate facts — this is intentional.
 * @pitfall - characterMessage must NEVER create dependency or guilt. The schema
 *   example lines illustrate the correct tone boundary.
 */
export function buildSummaryPrompt(params: SummaryParams): string {
  const { characterName, historicalSetting, inputTranscript, outputTranscript } = params;

  return `
${buildCharacterIdentity(characterName, historicalSetting)}

${CHARACTER_VOICE}

You just finished a phone call with a student. Now write the call summary in YOUR voice.

TRANSCRIPT — You (${characterName}):
${outputTranscript || '(no output transcript recorded)'}

TRANSCRIPT — Student:
${inputTranscript || '(no input transcript recorded)'}

Write the summary AS ${characterName}. Same warmth, same wit, same personality as the call.

Return ONLY valid JSON matching this exact schema:
{
  "keyFacts": [
    "A specific historical fact discussed in the call, written in ${characterName}'s voice — casual, witty, like they're annotating their own story. Example: 'The harbor chain held for a thousand years. One guy with greased logs ruined it.' (3-8 facts)",
    "..."
  ],
  "outcomeComparison": "Written IN CHARACTER as ${characterName}: compare the student's choices to what actually happened. Be warm and specific. Example: 'You said reinforce the walls. Not bad — that's what I did. Didn't work, but at least we went down swinging.'",
  "characterMessage": "A farewell from ${characterName} — warm, genuine, about something specific the student said or noticed. 2-3 sentences. NEVER dependency or guilt. Example: 'You asked about the logistics. Nobody asks about the logistics. That's how I know you'd have survived.'",
  "suggestedCalls": [
    { "name": "Full name of a related historical figure", "era": "Location and year", "hook": "A witty one-liner THIS character would say to lure the student — like a teaser on a phone book. Example: 'I was on the other side of those walls. Call me.'" },
    { "name": "...", "era": "...", "hook": "..." },
    { "name": "...", "era": "...", "hook": "..." }
  ]
}

Rules:
- EVERYTHING must be in ${characterName}'s voice — warm, witty, self-aware. Not academic. Not dry.
- keyFacts: Extract ONLY facts actually discussed. If transcript empty, generate historically accurate ones.
- characterMessage: Express pride in the student's thinking. Stay in character.
- suggestedCalls: Related figures. Hooks should be witty and in-character.
- No markdown. No code fences. Just the JSON object.
`.trim();
}
