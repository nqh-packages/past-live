import { describe, it, expect } from 'vitest';
import {
  getScenarioMeta,
  SCENARIO_IDS,
  buildSystemPrompt,
  formatStoryMaterial,
} from './scenarios.js';
import type { StoryScript } from './schemas.js';

// ─── Fixture ─────────────────────────────────────────────────────────────────

const CLEOPATRA_SCRIPT: StoryScript = {
  personality: {
    voice: 'Direct, witty, zero patience for nonsense.',
    humor: 'Understatement. She describes catastrophic things like mild inconveniences.',
    quirks: 'Drops numbers casually. Switches register from warm to ice-cold without warning.',
    energy: 'Regal but relaxed. She already won. History just disagrees.',
    celebrityAnchor: 'Jennifer Coolidge playing a pharaoh',
  },
  hooks: [
    {
      myth: 'she was Egyptian',
      truth: 'she was Macedonian Greek — the first ruler of her dynasty to even speak Egyptian',
      surprise: 'She spoke nine languages. Egyptian was basically a party trick she picked up.',
      anchor: 'Like being half-fluent in Spanish and claiming you ARE Spanish.',
    },
    {
      myth: 'she was smuggled to Caesar in a carpet',
      truth: 'it was a linen sack carried by a trusted slave',
      surprise: 'A carpet unrolling dramatically would have been ridiculous — and she knew it.',
      anchor: 'Think about the last time you had to sneak something past security.',
    },
    {
      myth: 'she was defined by her relationships with powerful men',
      truth: 'she ran an empire of 7 million people, commanded a navy, and nearly created a new Rome',
      surprise: 'Caesar and Antony were her political tools. Not the other way around.',
      anchor: 'Like when the "supporting character" turns out to have been running everything.',
    },
  ],
  facts: [
    'She was 21 when she met Caesar. He was 52.',
    'She spoke Aramaic, Hebrew, Ethiopian, Parthian, Median, and several other languages in addition to Greek and Egyptian.',
    'She commissioned the largest fleet in the eastern Mediterranean.',
    'Her face appeared on coins — always with a strong nose, a deliberate choice to project authority.',
    'She was a scholar who wrote about medicine, alchemy, and weights and measures.',
  ],
  choices: [
    {
      setup: "Caesar has been assassinated. His will names Octavian, not you or Caesarion, as his heir. You have three paths.",
      options: [
        { title: 'Flee to Egypt', description: 'Return home, consolidate your power base, wait.' },
        { title: 'Stay in Rome', description: 'Build alliances with the surviving senators.' },
        { title: 'Back Antony', description: 'Align with the general who already owes you.' },
      ],
      consequences: {
        'Flee to Egypt': 'That is what she did — on a ship before his body was cold.',
        'Stay in Rome': 'Octavian would have had her killed within the year.',
        'Back Antony': 'She did that too, eventually. It bought thirteen more years.',
      },
    },
  ],
  scenes: [
    {
      title: 'The Golden Barge',
      description: 'A massive golden barge on the Cydnus River, sails of purple silk catching the wind, Cleopatra dressed as Aphrodite on the stern deck, surrounded by boys dressed as Eros with fans.',
    },
    {
      title: 'The Library of Alexandria',
      description: 'A vast columned hall in golden afternoon light, hundreds of papyrus scrolls on cedar shelves, scribes at work, the great reading hall alive with scholars.',
    },
  ],
  closingThread: "Tell the student something specific about how they think — not praise, but an observation. 'You kept asking about the fleet. That means you think in systems, not moments.' Then end with dignity.",
};

// ─── SCENARIO_IDS ────────────────────────────────────────────────────────────

describe('SCENARIO_IDS', () => {
  it('contains at least 3 preset IDs', () => {
    expect(SCENARIO_IDS.length).toBeGreaterThanOrEqual(3);
  });

  it('contains only non-empty strings', () => {
    for (const id of SCENARIO_IDS) {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    }
  });
});

// ─── getScenarioMeta ────────────────────────────────────────────────────────

describe('getScenarioMeta', () => {
  it('returns undefined for unknown IDs', () => {
    expect(getScenarioMeta('')).toBeUndefined();
    expect(getScenarioMeta('french-revolution')).toBeUndefined();
    expect(getScenarioMeta('constantinople')).toBeUndefined();
  });

  it('is case-sensitive', () => {
    const upperCased = SCENARIO_IDS[0].toUpperCase();
    expect(getScenarioMeta(upperCased)).toBeUndefined();
  });

  it('all SCENARIO_IDS resolve to defined metadata', () => {
    for (const id of SCENARIO_IDS) {
      const meta = getScenarioMeta(id);
      expect(meta).toBeDefined();
      expect(meta!.id).toBe(id);
      expect(meta!.title.length).toBeGreaterThan(0);
      expect(typeof meta!.year).toBe('number'); // allows BCE (negative) years like Cleopatra (-41)
      expect(meta!.role.length).toBeGreaterThan(0);
      expect(meta!.teaser.length).toBeGreaterThan(0);
    }
  });

  it('Constantinople has correct metadata', () => {
    const meta = getScenarioMeta('constantinople-1453')!;
    expect(meta.year).toBe(1453);
    expect(meta.role).toMatch(/constantine/i);
  });

  it('Moon Landing has correct metadata', () => {
    const meta = getScenarioMeta('moon-landing-1969')!;
    expect(meta.year).toBe(1969);
    expect(meta.role).toMatch(/kranz|gene/i);
  });

  it('Mongol Empire has correct metadata', () => {
    const meta = getScenarioMeta('mongol-empire-1206')!;
    expect(meta.year).toBe(1206);
    expect(meta.role).toMatch(/jamukha/i);
  });
});

// ─── buildSystemPrompt (no storyScript) ─────────────────────────────────────

describe('buildSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildSystemPrompt('Constantine XI', 'Constantinople, 1453');
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(200);
  });

  it('incorporates character name and setting', () => {
    const prompt = buildSystemPrompt('Gene Kranz', 'Apollo 11, 1969');
    expect(prompt).toContain('Gene Kranz');
    expect(prompt).toContain('Apollo 11, 1969');
  });

  it('references key tool names', () => {
    const prompt = buildSystemPrompt('Constantine XI', 'Constantinople, 1453');
    expect(prompt).toContain('announce_choice');
    expect(prompt).toContain('end_session');
    expect(prompt).toContain('show_scene');
  });

  it('falls back to generic story block when no storyScript', () => {
    const prompt = buildSystemPrompt('Constantine XI', 'Constantinople, 1453');
    // Generic fallback should have a story section (not storyScript material)
    expect(prompt).toContain('Your Story');
  });

  it('does not include celebrity anchor line when no storyScript', () => {
    const prompt = buildSystemPrompt('Constantine XI', 'Constantinople, 1453');
    expect(prompt).not.toContain('Channel the delivery style');
  });
});

// ─── buildSystemPrompt with storyScript ──────────────────────────────────────

describe('buildSystemPrompt with storyScript', () => {
  it('includes celebrity anchor instruction from personality', () => {
    const prompt = buildSystemPrompt('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT);
    expect(prompt).toContain('Jennifer Coolidge playing a pharaoh');
    expect(prompt).toContain('Channel the delivery style');
  });

  it('includes personality fields as prose (not labeled properties)', () => {
    const prompt = buildSystemPrompt('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT);
    // Personality content should appear
    expect(prompt).toContain('Understatement');
    expect(prompt).toContain('Regal but relaxed');
    // Should NOT appear as labeled fields
    expect(prompt).not.toContain('voice:');
    expect(prompt).not.toContain('humor:');
    expect(prompt).not.toContain('energy:');
  });

  it('includes hook content as prose paragraphs without HOOK labels', () => {
    const prompt = buildSystemPrompt('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT);
    // Hook content appears
    expect(prompt).toContain('Macedonian Greek');
    expect(prompt).toContain('nine languages');
    expect(prompt).toContain('linen sack');
    // No template labels
    expect(prompt).not.toMatch(/HOOK \d+/);
    expect(prompt).not.toContain('Myth:');
    expect(prompt).not.toContain('Truth:');
    expect(prompt).not.toContain('Surprise:');
  });

  it('includes verified facts as a list', () => {
    const prompt = buildSystemPrompt('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT);
    expect(prompt).toContain('She was 21 when she met Caesar');
    expect(prompt).toContain('She commissioned the largest fleet');
  });

  it('includes choice setup and options', () => {
    const prompt = buildSystemPrompt('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT);
    expect(prompt).toContain('Flee to Egypt');
    expect(prompt).toContain('Back Antony');
    expect(prompt).toContain('announce_choice');
  });

  it('includes scene titles for show_scene', () => {
    const prompt = buildSystemPrompt('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT);
    expect(prompt).toContain('The Golden Barge');
    expect(prompt).toContain('The Library of Alexandria');
    expect(prompt).toContain('show_scene');
  });

  it('includes closing thread', () => {
    const prompt = buildSystemPrompt('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT);
    expect(prompt).toContain('You kept asking about the fleet');
  });

  it('includes student name awareness instruction', () => {
    const prompt = buildSystemPrompt('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT);
    expect(prompt).toContain("caller who they are");
  });

  it('does NOT include generic story fallback when storyScript is provided', () => {
    const prompt = buildSystemPrompt('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT);
    // "## Your Story" is the generic fallback heading — should not appear
    expect(prompt).not.toContain('## Your Story');
    // "Everything you tell comes from YOUR life" is the generic fallback opening sentence
    expect(prompt).not.toContain('Everything you tell comes from YOUR life');
  });

  it('still includes CHARACTER_VOICE and BEHAVIORAL_RULES', () => {
    const prompt = buildSystemPrompt('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT);
    // Both shared blocks should be present — check structural markers, not specific phrases
    expect(prompt.length).toBeGreaterThan(1000);
    // BEHAVIORAL_RULES has the "Character Integrity" heading
    expect(prompt).toContain('Character Integrity');
  });

  it('produces a prompt substantially longer than the no-storyScript version', () => {
    const withScript = buildSystemPrompt('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT);
    const withoutScript = buildSystemPrompt('Cleopatra', 'Egypt, 48 BCE');
    const withScriptWords = withScript.split(/\s+/).length;
    const withoutScriptWords = withoutScript.split(/\s+/).length;
    // storyScript version should be substantially longer due to hooks + facts + choices + scenes
    expect(withScriptWords).toBeGreaterThan(withoutScriptWords + 100);
    // Both should be in a reasonable range (not empty, not absurdly long)
    expect(withScriptWords).toBeGreaterThan(500);
    expect(withScriptWords).toBeLessThan(3000);
  });
});

// ─── buildSystemPrompt with storyScript + pastSessions ───────────────────────

describe('buildSystemPrompt with storyScript and past sessions', () => {
  it('includes memory block when pastSessions provided alongside storyScript', () => {
    const prompt = buildSystemPrompt('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT, [
      'Student chose to flee to Egypt. Cleopatra noted their survival instinct.',
    ]);
    expect(prompt).toContain('YOU REMEMBER THIS STUDENT');
    expect(prompt).toContain('survival instinct');
  });
});

// ─── Cross-session memory (no storyScript — backward compat) ─────────────────

describe('buildSystemPrompt with past sessions (no storyScript)', () => {
  it('includes memory block when pastSessions provided', () => {
    const prompt = buildSystemPrompt('Constantine XI', 'Constantinople, 1453', undefined, [
      'Student advised reinforcing the walls. Constantine noted their strategic thinking.',
      'Student tried to negotiate with Mehmed. It did not go well.',
    ]);
    expect(prompt).toContain('YOU REMEMBER THIS STUDENT');
    expect(prompt).toContain('Call 1:');
    expect(prompt).toContain('Call 2:');
    expect(prompt).toContain('reinforcing the walls');
  });

  it('omits memory block when pastSessions is empty', () => {
    const prompt = buildSystemPrompt('Constantine XI', 'Constantinople, 1453', undefined, []);
    expect(prompt).not.toContain('YOU REMEMBER THIS STUDENT');
  });

  it('omits memory block when pastSessions is undefined', () => {
    const prompt = buildSystemPrompt('Constantine XI', 'Constantinople, 1453');
    expect(prompt).not.toContain('YOU REMEMBER THIS STUDENT');
  });
});

// ─── formatStoryMaterial ─────────────────────────────────────────────────────

describe('formatStoryMaterial', () => {
  it('produces prose output with no HOOK N: labels', () => {
    const material = formatStoryMaterial('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT);
    expect(material).not.toMatch(/HOOK \d+/i);
    expect(material).not.toContain('Myth:');
    expect(material).not.toContain('Truth:');
    expect(material).not.toContain('Surprise:');
    expect(material).not.toContain('Anchor:');
  });

  it('includes all hook truths in prose form', () => {
    const material = formatStoryMaterial('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT);
    expect(material).toContain('Macedonian Greek');
    expect(material).toContain('linen sack');
    expect(material).toContain('empire of 7 million');
  });

  it('includes all facts as bullet list entries', () => {
    const material = formatStoryMaterial('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT);
    for (const fact of CLEOPATRA_SCRIPT.facts) {
      expect(material).toContain(fact);
    }
  });

  it('includes choice options and announce_choice reference', () => {
    const material = formatStoryMaterial('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT);
    expect(material).toContain('announce_choice');
    expect(material).toContain('Flee to Egypt');
    expect(material).toContain('Back Antony');
  });

  it('includes scene titles for show_scene', () => {
    const material = formatStoryMaterial('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT);
    expect(material).toContain('The Golden Barge');
    expect(material).toContain('show_scene');
  });

  it('includes closing thread', () => {
    const material = formatStoryMaterial('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT);
    expect(material).toContain('You kept asking about the fleet');
  });

  it('includes student name awareness instruction', () => {
    const material = formatStoryMaterial('Cleopatra', 'Egypt, 48 BCE', CLEOPATRA_SCRIPT);
    expect(material).toContain("caller who they are");
  });
});
