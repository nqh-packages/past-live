/**
 * @what - Prompt builder for image-based topic extraction via Flash vision
 * @why - Isolate prompt text from route logic so it can be reviewed and tuned independently
 * @exports - buildExtractTopicPrompt
 */

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Builds the Flash vision prompt for extracting a study topic and 3 related
 * historical figures from an image (textbook page, worksheet, notes, etc.).
 *
 * Currently a no-arg function (constant prompt) — wrapped as a function for
 * consistency with other prompt builders in this directory.
 *
 * @returns Prompt string to be sent alongside the inline image data.
 *
 * @pitfall - The prompt expects exactly 3 figures in the response. Do NOT
 *   change the count without updating extractTopicResponseSchema in schemas.ts.
 * @pitfall - The BLOCKED rule at the bottom is load-bearing. Do not remove or
 *   soften it — it prevents the model from suggesting genocide perpetrators.
 */
export function buildExtractTopicPrompt(): string {
  return `
Look at this image. It likely shows a textbook page, worksheet, notes, or study material.

Step 1: Identify the main historical topic shown. Distill it to a short phrase (3-8 words).

Step 2: Pick 3 historical figures who are directly related to that topic and would be
fascinating to speak with. Choose figures with different perspectives or roles — not just
the most obvious ones. Think: who LIVED it, who BUILT it, who OPPOSED it.

Return ONLY valid JSON (no markdown, no code fences):
{
  "topic_extracted": "short topic phrase (e.g. Roman art & architecture)",
  "figures": [
    {
      "name": "Full historical name",
      "era": "Era/period (e.g. Roman Empire, 1st century BC)",
      "role": "Role in relation to the topic (e.g. Architect & Engineer)",
      "teaser": "One-line hook — what makes them fascinating to call",
      "relevance_to_topic": "Why specifically relevant to the topic extracted"
    },
    { "name": "...", "era": "...", "role": "...", "teaser": "...", "relevance_to_topic": "..." },
    { "name": "...", "era": "...", "role": "...", "teaser": "...", "relevance_to_topic": "..." }
  ]
}

Rules:
- Always return exactly 3 figures
- Figures must represent different angles on the topic (creator, critic, witness, opponent, beneficiary...)
- teaser: specific and surprising, NOT generic ("Wrote the only surviving ancient architecture manual")
- If no clear historical topic is visible, use "a historical moment" and pick 3 diverse figures from ancient history
- BLOCKED: Do NOT suggest perpetrators of genocide, mass violence, or serial crime
`.trim();
}
