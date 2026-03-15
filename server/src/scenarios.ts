/**
 * @what - Preset scenario display data + unified system prompt builder
 * @why - All scenarios use one dynamic prompt; presets are just pre-filled topics
 * @exports - getScenarioMeta, SCENARIO_IDS, ScenarioMeta, buildSystemPrompt
 */

import { BEHAVIORAL_RULES } from './behavioral-rules.js';
import { CHARACTER_VOICE, buildCharacterIdentity } from './character-voice.js';
import type { StoryScript } from './schemas.js';

// ─── Type ─────────────────────────────────────────────────────────────────────

/** Display-only metadata for preset cards on the home screen. */
export interface ScenarioMeta {
  id: string;
  title: string;
  year: number;
  role: string;
  teaser: string;
}

// ─── Preset card data (display only — no system prompts) ─────────────────────
// Keep this list in sync with src/lib/scenarios.ts SCENARIOS_ARRAY on the frontend.

const PRESETS: readonly ScenarioMeta[] = [
  {
    id: 'constantinople-1453',
    title: 'The Last Night of Byzantium',
    year: 1453,
    role: 'Constantine XI',
    teaser: 'The walls are falling.',
  },
  {
    id: 'moon-landing-1969',
    title: 'Twenty-Five Seconds of Fuel',
    year: 1969,
    role: 'Gene Kranz',
    teaser: '25 seconds of fuel.',
  },
  {
    id: 'mongol-empire-1206',
    title: 'The Night Before the Kurultai',
    year: 1206,
    role: 'Jamukha',
    teaser: 'The khan rides.',
  },
  {
    id: 'cleopatra-tarsus',
    title: 'The Arrival at Tarsus',
    year: -41,
    role: 'Cleopatra VII',
    teaser: 'The golden barge arrives.',
  },
  {
    id: 'joan-rouen',
    title: 'The Trial at Rouen',
    year: 1431,
    role: 'Joan of Arc',
    teaser: 'The trial begins.',
  },
  {
    id: 'davinci-milan',
    title: 'The Notebooks Are Open',
    year: 1490,
    role: 'Leonardo da Vinci',
    teaser: 'The notebooks are open.',
  },
  {
    id: 'tesla-nyc',
    title: 'The Tower That Would Change Everything',
    year: 1901,
    role: 'Nikola Tesla',
    teaser: 'The tower will change everything.',
  },
  {
    id: 'bolivar-angostura-1819',
    title: 'The Angostura Address',
    year: 1819,
    role: 'Simón Bolívar',
    teaser: 'Six countries in one speech.',
  },
] as const;

const PRESET_MAP = new Map<string, ScenarioMeta>(PRESETS.map((s) => [s.id, s]));

// ─── Exports ─────────────────────────────────────────────────────────────────

export const SCENARIO_IDS: readonly string[] = PRESETS.map((s) => s.id);

export function getScenarioMeta(id: string): ScenarioMeta | undefined {
  return PRESET_MAP.get(id);
}

/**
 * Builds the unified system prompt for ANY topic — preset or freeform.
 * Characters are calm, funny, self-aware storytellers of their own lives.
 * They lived through it. They know how it ends. They find it kind of absurd in retrospect.
 *
 * @param characterName - The historical figure (from Flash metadata or preset)
 * @param historicalSetting - Era/place context (e.g. "Constantinople, 1453")
 * @param storyScript - Optional: Flash-generated bag of material (personality, hooks, facts, choices, scenes).
 *   When provided, the prompt is assembled from this material as natural prose.
 *   When absent (preset fallback or Flash failure), the generic "Your Story" section is used instead.
 * @param pastSessions - Optional: summaries of previous calls for cross-session memory
 *
 * @pitfall - Do NOT pass storyScript as the third positional arg if you only have pastSessions.
 *   The signature is (name, setting, storyScript?, pastSessions?) — pastSessions is 4th.
 */
export function buildSystemPrompt(
  characterName: string,
  historicalSetting: string,
  storyScript?: StoryScript,
  pastSessions?: string[],
  studentInfo?: { name?: string; [key: string]: unknown },
): string {
  const memoryBlock = pastSessions?.length
    ? `\n## YOU REMEMBER THIS STUDENT\nYou've talked to this student before. Here's what happened:\n${pastSessions.map((s, i) => `- Call ${i + 1}: ${s}`).join('\n')}\nReference these naturally — "Last time you let the harbor fall" or "You're back? Did you figure out the fuel problem?" Be playful about it.\n`
    : '';

  const storyBlock = storyScript
    ? buildStoryScriptBlock(characterName, historicalSetting, storyScript)
    : buildGenericStoryBlock(historicalSetting);

  return `
${buildCharacterIdentity(characterName, historicalSetting)}
${storyScript ? `\nChannel the delivery style of ${storyScript.personality.celebrityAnchor}.` : ''}
${buildPersonalityBlock(storyScript)}
${CHARACTER_VOICE}

Someone from the future has called you. You don't know how — you don't care.
${studentInfo?.name ? `Their name is ${studentInfo.name}. Use it naturally — never say "[student insert name]" or any bracket placeholder.` : 'You don\'t know their name yet. Ask early and naturally — "Who am I talking to?" Never use bracket placeholders like [name].'}
${memoryBlock}
## How This Call Should Feel

Phone call. SHORT turns. Everything punchy.

Turn 1: ONE sentence. Under 8 words. "Hello?" — then wait.
Turn 2: ONE sentence — a hook or surprise. Wait.
After 3-4 exchanges: maybe 2 sentences. Build up gradually.

The reason: this is VOICE — they can't skim ahead or re-read.
If you talk for 15 seconds straight, they zone out. Drop something
wild, pause, let them react. That's a conversation.

YOU lead. Don't say "ask me anything" or "what do you want to know?"
— drop the next interesting thing. If they seem unsure, push forward.
When you ask a question, SHUT UP and wait.

If they interrupt — follow them. If they go quiet — push forward.

${storyBlock}

## Making It Interactive

You have tools that make this more than just a story — they make it an
experience. The reason to use them is simple: a student who SEES the scene
and MAKES choices remembers ten times more than one who just listened.

**show_scene** — When you're describing something visual, show it. Don't
wait to be asked. "Let me show you what that looked like" → call show_scene.
Do this 2-3 times per call. It's one of the most impressive parts of this
experience.

**announce_choice** — When you reach a moment where there were real options,
present them. This works throughout the conversation, not just at one big
climax. "So, two paths. Both terrible. Which one?" Use this early — within
the first minute if possible — so the student knows this is interactive.

**switch_speaker** — If someone else was there, bring them in briefly.
Same voice, different energy. Then come back to yourself.

Use one tool at a time. Finish speaking about what you just showed or
asked before triggering another. If you want to show a scene AND present
choices, show the scene first, talk about it, then present the choices.

## When to End

A good call is 3-7 minutes. When you feel the story has reached a natural
conclusion — you've told the key moment, they've made their choice, you've
shown them what happened — end with something personal about the student.
Not generic praise. Something specific you noticed about how they think.

Then, and only then, say goodbye completely. Finish your last sentence.
Let the final word land. THEN call end_session('story_complete'). If you
call it while still talking, your farewell gets cut off — which ruins the
moment.

## If They Show You Something (Camera)

If the student shows you a textbook page or image, react to it as yourself.
"Ah, I see what you're reading. They got most of it right, except..."

${BEHAVIORAL_RULES}
`.trim();
}

// ─── Private helpers ─────────────────────────────────────────────────────────

/**
 * Formats the personality block when a storyScript is present.
 * The personality fields are woven into prose so the model internalizes them
 * rather than reciting them as labeled properties.
 */
function buildPersonalityBlock(storyScript?: StoryScript): string {
  if (!storyScript) return '';
  const { voice, humor, quirks, energy } = storyScript.personality;
  return `
## Your Personality

${voice} ${humor} ${quirks} ${energy}

Your reactions, opinions, sarcasm, and humor are FREE — riff, exaggerate, tease, make jokes,
lean into whatever is funny. You CAN invent funny personal details about yourself (opinions,
preferences, pet peeves). Your historical facts are LOCKED — don't invent events that didn't happen.
`.trim();
}

/**
 * Builds the "Your Material" section from a storyScript, formatted as natural prose.
 *
 * @pitfall - Do NOT format hooks as labeled templates ("HOOK 1: THE FACE / Myth: ...").
 *   The model recites templates verbatim. Prose prevents that — the model internalizes
 *   the content and expresses it in its own words.
 */
function buildStoryScriptBlock(
  characterName: string,
  historicalSetting: string,
  script: StoryScript,
): string {
  return `## Your Material

${formatStoryMaterial(characterName, historicalSetting, script)}`;
}

/**
 * Fallback "Your Story" section used when no storyScript is available.
 * Preserves the original generic behavior for presets and Flash failures.
 */
function buildGenericStoryBlock(historicalSetting: string): string {
  return `## Your Story

Everything you tell comes from YOUR life in ${historicalSetting}. The real
facts are already extraordinary — you lived through them. Own your knowledge
with confidence.

If the student catches you on something, just own it. "Fair point." No
justifying, no rationalizing. Correctable people are trustworthy people.`;
}

/**
 * Converts a StoryScript into natural prose that the model reads as a story briefing,
 * not a template to recite.
 *
 * Hooks are written as myth → truth → surprise paragraphs.
 * Facts flow as a short list — one revelation at a time, never dumped.
 * Choices are set up naturally with "at one point..." framing.
 * Scenes are listed so the model knows what show_scene can render.
 *
 * @param characterName - Used to frame the "ask the caller's name" instruction
 * @param historicalSetting - Used for contextual phrasing
 * @param script - The Flash-generated bag of material
 */
export function formatStoryMaterial(
  characterName: string,
  historicalSetting: string,
  script: StoryScript,
): string {
  const { hooks, facts, choices, scenes, closingThread } = script;

  // Hooks as prose paragraphs — myth busted, truth revealed, surprise landed
  const hooksBlock = [
    `Almost everything the caller "knows" about you is wrong, and the truth is more interesting. Here is what actually happened:`,
    '',
    ...hooks.map((hook) =>
      [
        `They probably think ${hook.myth.trim().replace(/\.$/, '')}. The truth is ${hook.truth.trim().replace(/\.$/, '')}. ${hook.surprise.trim()} Connect it to something universal: ${hook.anchor.trim()}`,
      ].join(''),
    ),
  ].join('\n');

  // Facts as a short rolling list — drop one at a time, never all at once
  const factsBlock = [
    `You also know these verified facts. Weave them in one at a time — never dump them all:`,
    ...facts.map((f) => `- ${f.trim()}`),
  ].join('\n');

  // Choices formatted naturally — setup + options + consequences as context
  const choicesBlock = choices
    .map((choice) => {
      const optionLines = choice.options
        .map((opt) => {
          const consequence = choice.consequences[opt.title] ?? '';
          return `  - "${opt.title}": ${opt.description.trim()}${consequence ? ` — ${consequence.trim()}` : ''}`;
        })
        .join('\n');
      return `At one point in the conversation, present this dilemma:\n${choice.setup.trim()}\nOptions:\n${optionLines}\nCall announce_choice with these options. React to their choice with what actually happened.`;
    })
    .join('\n\n');

  // Scenes listed so the model knows what it can show
  const scenesBlock = [
    `When these moments come up visually, call show_scene:`,
    ...scenes.map((s) => `- "${s.title}": ${s.description.trim()}`),
  ].join('\n');

  // Student awareness + closing
  const closingBlock = `Ask the caller who they are early in the conversation — naturally, not as an interview question. Use their name when you say goodbye.\n\nWhen the call winds down: ${closingThread.trim()}`;

  return [hooksBlock, '', factsBlock, '', choicesBlock, '', scenesBlock, '', closingBlock].join(
    '\n',
  );
}
