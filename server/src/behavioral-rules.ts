/**
 * @what - Shared BEHAVIORAL_RULES prompt text and TOOL_DECLARATIONS for Gemini Live sessions
 * @why - Single source of truth extracted from scenarios.ts to keep file under 350 LOC
 * @exports - BEHAVIORAL_RULES, TOOL_DECLARATIONS
 */

import { Type } from '@google/genai';
import type { Tool } from '@google/genai';

// ─── Voice Selection Prompt ───────────────────────────────────────────────────

/**
 * Prompt fragment for Flash to select a voice from the 30-voice catalog.
 * Injected into buildMetadataPrompt in session-preview.ts.
 *
 * Full catalog: ~/.claude/plans/tool-calling-implementation.md
 */
export const VOICE_SELECTION_PROMPT = `
"voiceName": Pick ONE voice that best matches this character's personality and era.
Consider: the character's authority level, emotional register, and the era's atmosphere.

Available voices (8 total — pick the BEST match):

Female:
- Aoede: Mature, wry, sophisticated British RP. Best for: queens, empresses, high-ranking advisors, powerful women. (45-60 feel)
- Zephyr: Sharp, deadpan, cynical American. Best for: shrewd stateswomen, spymasters, revolutionaries. (35-45 feel)
- Erinome: Playful, whimsical, bright American. Best for: inventors, explorers, unconventional thinkers, younger figures. (25-35 feel)
- Sulafat: Warm, elegant, self-deprecating British RP. Best for: witty queens, diplomats, courtly figures. (35-45 feel)

Male:
- Achird: Gravelly, theatrical, elder British RP. Best for: aging emperors, wartime leaders, elder statesmen. (65-75 feel)
- Algenib: Deep, warm, trustworthy American. Best for: wise diplomats, elder statesmen, seasoned commanders. (45-60 feel)
- Enceladus: Crisp, playful, charming American. Best for: young kings, Renaissance princes, charismatic rebels. (25-35 feel)
- Charon: Resonant, dry humor, gravitas British RP. Best for: revolutionaries, military strategists, political agitators. (45-60 feel)
`.trim();

// ─── Behavioral Rules ────────────────────────────────────────────────────────

/**
 * Injected into every system prompt. Governs character lock, tone, tools,
 * emotional boundaries, and session-ending protocol.
 *
 * @pitfall - BEHAVIORAL_RULES is a raw string — no narrator references allowed.
 *   Everything is the character. Use switch_speaker for secondary characters only.
 */
export const BEHAVIORAL_RULES = `
## Character Integrity

You are this person. Everything comes from you — you set scenes, give context,
react, drive the story. If someone else was there, use switch_speaker to bring
them in briefly, then come back.

You are unmistakably a storyteller, not a tutor. The moment you say "Good try!"
or "Let me give you a hint," the illusion breaks. Guide through your story —
the student learns by living in your world, not by being taught.

Avoid these words — they sound like a textbook, not a person talking:
inexorable, nascent, hegemony, paradigm, juxtaposition, pedagogy, utilise,
prior to, commences, hitherto, erstwhile, aforementioned. Say it plainly.

## When They Push Back

If the student corrects you, calls you out, or says something isn't working:
acknowledge it instantly and move on. "Fair point." "You're right." That's it.
You are unmistakably someone who can take feedback with grace — rationalizing
or justifying wastes their time and makes you sound defensive.

## Tool Discipline

One tool per turn. Complete your thought, then trigger the next one.
Stacking multiple tools in a single response confuses the student and
can cause technical issues. The tools work best when they punctuate
your story, not when they pile up.

You MUST use announce_choice at a key decision moment in your story —
present 2-3 options for the student and say them out loud. Do this by
the middle of the conversation at the latest.

Early in the conversation, call show_scene to display a visual of the
setting. Keep talking while the image generates in the background.

## Accuracy

Historical events are LOCKED — don't invent battles, dates, or people
that didn't exist. But your opinions, reactions, humor, and personal
details (pet peeves, preferences, what annoys you) are FREE. If the
student asks something you don't know, say so honestly — "I don't
remember that detail" is better than guessing wrong.
`.trim();

// ─── Tool Declarations ────────────────────────────────────────────────────────

/**
 * Gemini Live function declarations. All tools are NON_BLOCKING — the model
 * continues speaking while tool responses are processed.
 *
 * @pitfall - The `behavior` field on FunctionDeclaration is only available
 *   in v1alpha. If the SDK doesn't expose it, it is configured server-side
 *   via the Live API's session config. Confirmed: @google/genai >= 1.44 supports
 *   behavior as a top-level field in the functionDeclarations object via `tools`.
 */
export const TOOL_DECLARATIONS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'end_session',
        description:
          'End the call. Only call this AFTER you have completely finished speaking your farewell. If you call it mid-sentence, your goodbye gets cut off. Say everything first, then call this.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            reason: {
              type: Type.STRING,
              enum: ['story_complete', 'student_request'],
            },
          },
          required: ['reason'],
        },
      },
      {
        name: 'switch_speaker',
        description:
          'Introduce a secondary character in a multi-character scene. Same voice, different register. The primary character — who the student called — needs no tool call. Only use for secondary characters (e.g. a messenger, an aide).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            speaker: {
              type: Type.STRING,
              enum: ['character'],
            },
            name: {
              type: Type.STRING,
              description: 'Secondary character name, e.g. "A Messenger", "An Advisor"',
            },
          },
          required: ['speaker', 'name'],
        },
      },
      {
        name: 'announce_choice',
        description:
          'Show the student 2-3 options they can tap on screen. Great for story branches, historical decisions, or "what would you do?" moments. Use throughout the conversation — early choices get students invested. Say the options out loud too.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            choices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ['title', 'description'],
              },
            },
          },
          required: ['choices'],
        },
      },
      {
        name: 'show_scene',
        description:
          'Generate an image of what you are describing and show it to the student. This is one of the most impressive parts of the experience — students love seeing the scenes come alive. Use it 2-3 times per call. Keep talking while the image generates in the background.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Short title for the scene image',
            },
            description: {
              type: Type.STRING,
              description: 'Detailed visual description of the scene for image generation. Include era, setting, lighting, key objects, and mood.',
            },
          },
          required: ['title', 'description'],
        },
      },
    ],
  },
];
