/**
 * @what - Prompt builder for Flash story script generation (Phase 2 of session-preview)
 * @why - Isolate the bag-of-material generation prompt so it can be reviewed and tuned
 *        without touching the background generation job or caching logic
 * @exports - buildStoryScriptPrompt
 */

import type { PreviewMetadata } from '../schemas.js';

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Builds the Flash prompt for Phase 2 of session-preview: story script generation (~5-8s).
 *
 * Generates the full bag-of-material for a historical character session:
 * personality, hooks, facts, choices, scenes, and closing thread.
 * The result is NOT a linear script — the Live model pulls from this material
 * based on where the conversation goes.
 *
 * @param metadata - Resolved session metadata from Phase 1 (character, setting, context).
 * @returns Prompt string ready for Flash generateContent.
 *
 * @pitfall - HISTORICAL ACCURACY is non-negotiable. Every fact, myth correction, and
 *   choice consequence must be verifiable. The prompt enforces this — do not soften it.
 * @pitfall - personality.celebrityAnchor is mandatory. Without it, the Live model
 *   loses its register and defaults to a formal/stiff academic voice.
 * @pitfall - Anchors must connect to GROUP PROJECTS, SPORTS, FAMILY, SCHOOL.
 *   Academic concept anchors ("like the Enlightenment") do not work for students.
 */
export function buildStoryScriptPrompt(metadata: PreviewMetadata): string {
  const topicLine = metadata.topic
    ? `Topic the student is studying: ${metadata.topic}\n`
    : '';

  return `
You are generating the story script for a historical voice conversation.

Character: ${metadata.characterName}
Setting: ${metadata.historicalSetting}, ${metadata.year}
Context: ${metadata.context}
${topicLine}
The student chose to call this character specifically to learn about "${metadata.topic}".
Weight the hooks, facts, and choices toward what this character can uniquely teach
about that topic — not just their general story. What aspect of "${metadata.topic}"
did they LIVE that no textbook can explain?

Return ONLY valid JSON matching this exact schema:
{
  "personality": {
    "voice": "How this character TALKS. Be specific: 'States absurd facts casually, finds her own legend amusing' not 'warm and friendly'",
    "humor": "HOW this character is funny. The MECHANISM. Not 'has humor.' Example: 'The gap between how insane her life was and how calmly she describes it'",
    "quirks": "1-2 specific verbal habits that make this character distinct",
    "energy": "Default emotional register: sharp? warm? wistful? competitive?",
    "celebrityAnchor": "Pick a FUNNY celebrity — a comedian or comedic actor — whose DELIVERY STYLE fits this character. The character MUST be funny. Examples: Jennifer Coolidge, Dave Chappelle, Aubrey Plaza, Ali Wong, John Mulaney, Wanda Sykes, Key & Peele."
  },
  "hooks": [
    {
      "myth": "What people wrongly believe",
      "truth": "What actually happened (historically accurate)",
      "surprise": "The one-liner that makes them go 'wait WHAT?'",
      "anchor": "Universal experience it connects to (group projects, sports, family, school)"
    }
  ],
  "facts": ["Verified historical detail — one line each"],
  "choices": [
    {
      "setup": "The situation in plain language",
      "options": [{"title": "Option A", "description": "What it means"}],
      "consequences": {"Option A": "What happened if they chose this"}
    }
  ],
  "scenes": [
    {"title": "Short scene title", "description": "Detailed visual for image gen — era, setting, lighting, objects, mood. No text."}
  ],
  "closingThread": "The final reframe line the character uses to close"
}

MANDATORY rules:
- personality.celebrityAnchor: MUST be a funny celebrity. This is mandatory. The character MUST sound funny.
- hooks: 3-5 items. Each myth must be something people actually believe wrong. Truth must be MORE interesting than the myth.
- facts: 5-10 items. Every fact must be historically verifiable. One line each. No fluff.
- choices: 1-2 items. Every option must be historically real — no wrong answers, each teaches a different facet of the moment.
- scenes: 1-3 items. Visual descriptions only — for image generation. No text in the image.
- closingThread: Something the character would actually say, not generic wisdom.
- HISTORICAL ACCURACY IS NON-NEGOTIABLE. Every fact, myth correction, and choice consequence must be verifiable.
- Anchors must connect to GROUP PROJECTS, SPORTS, FAMILY, SCHOOL — not academic concepts.

No markdown. No code fences. Just the JSON object.
`.trim();
}
