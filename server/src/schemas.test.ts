/**
 * Tests for schemas.ts — Zod schema validation for all Flash JSON responses
 */

import { describe, it, expect } from 'vitest';
import {
  postCallSummarySchema,
  previewMetadataSchema,
  flashResponseSchema,
  storyScriptSchema,
} from './schemas.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_SUMMARY = {
  keyFacts: [
    'The harbor chain held for a thousand years. One guy with greased logs ruined it.',
    'Mehmed brought 70 ships over a mountain range.',
  ],
  outcomeComparison: 'You said reinforce the walls. Not bad — that is what I did.',
  characterMessage: 'You asked about the logistics. Nobody asks about the logistics.',
  suggestedCalls: [
    { name: 'Sultan Mehmed II', era: 'Ottoman Empire, 1453', hook: 'I built the cannons.' },
  ],
};

const VALID_METADATA = {
  topic: 'Fall of Constantinople, 1453',
  userRole: 'A stranger who called in the dead of night',
  characterName: 'CONSTANTINE XI',
  historicalSetting: 'Constantinople, 1453',
  year: 1453,
  context: 'The Ottoman Sultan has surrounded the city with 80,000 troops.',
  colorPalette: [
    'oklch(10% 0.04 45)',
    'oklch(16% 0.06 45)',
    'oklch(65% 0.18 45)',
    'oklch(90% 0.04 45)',
    'oklch(38% 0.10 45)',
  ],
  voiceName: 'Achird',
  decisionPoints: [
    { title: 'Reinforce the land walls', description: 'Concentrate 300 men at the breach.' },
    { title: 'Attempt a breakout north', description: 'Risk everything on escape.' },
  ],
};

// ─── postCallSummarySchema ─────────────────────────────────────────────────────

describe('postCallSummarySchema', () => {
  describe('valid data', () => {
    it('passes with a complete valid summary', () => {
      const result = postCallSummarySchema.safeParse(VALID_SUMMARY);
      expect(result.success).toBe(true);
    });

    it('returns typed data with keyFacts as string array', () => {
      const result = postCallSummarySchema.safeParse(VALID_SUMMARY);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(Array.isArray(result.data.keyFacts)).toBe(true);
      expect(typeof result.data.keyFacts[0]).toBe('string');
    });

    it('returns typed data with suggestedCalls containing name, era, hook', () => {
      const result = postCallSummarySchema.safeParse(VALID_SUMMARY);
      expect(result.success).toBe(true);
      if (!result.success) return;
      const call = result.data.suggestedCalls[0];
      expect(typeof call.name).toBe('string');
      expect(typeof call.era).toBe('string');
      expect(typeof call.hook).toBe('string');
    });

    it('accepts empty keyFacts array', () => {
      const result = postCallSummarySchema.safeParse({ ...VALID_SUMMARY, keyFacts: [] });
      expect(result.success).toBe(true);
    });

    it('accepts empty suggestedCalls array', () => {
      const result = postCallSummarySchema.safeParse({ ...VALID_SUMMARY, suggestedCalls: [] });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid data', () => {
    it('fails when keyFacts is a string instead of array', () => {
      const result = postCallSummarySchema.safeParse({ ...VALID_SUMMARY, keyFacts: 'not an array' });
      expect(result.success).toBe(false);
    });

    it('fails when outcomeComparison is missing', () => {
      const { outcomeComparison: _, ...rest } = VALID_SUMMARY;
      const result = postCallSummarySchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('fails when characterMessage is a number', () => {
      const result = postCallSummarySchema.safeParse({ ...VALID_SUMMARY, characterMessage: 42 });
      expect(result.success).toBe(false);
    });

    it('fails when suggestedCalls is null', () => {
      const result = postCallSummarySchema.safeParse({ ...VALID_SUMMARY, suggestedCalls: null });
      expect(result.success).toBe(false);
    });

    it('fails when a suggestedCall is missing the hook field', () => {
      const result = postCallSummarySchema.safeParse({
        ...VALID_SUMMARY,
        suggestedCalls: [{ name: 'Test', era: 'Test, 1453' }],
      });
      expect(result.success).toBe(false);
    });

    it('fails on an empty object', () => {
      const result = postCallSummarySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('produces a descriptive error when keyFacts is wrong type', () => {
      const result = postCallSummarySchema.safeParse({ ...VALID_SUMMARY, keyFacts: 'bad' });
      expect(result.success).toBe(false);
      if (result.success) return;
      const flat = result.error.flatten();
      expect(flat.fieldErrors['keyFacts']).toBeDefined();
    });
  });
});

// ─── previewMetadataSchema ────────────────────────────────────────────────────

describe('previewMetadataSchema', () => {
  describe('valid data', () => {
    it('passes with a complete valid metadata object', () => {
      const result = previewMetadataSchema.safeParse(VALID_METADATA);
      expect(result.success).toBe(true);
    });

    it('returns year as a number', () => {
      const result = previewMetadataSchema.safeParse(VALID_METADATA);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(typeof result.data.year).toBe('number');
    });

    it('returns colorPalette as an array of exactly 5 strings', () => {
      const result = previewMetadataSchema.safeParse(VALID_METADATA);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.colorPalette).toHaveLength(5);
      expect(typeof result.data.colorPalette[0]).toBe('string');
    });

    it('accepts empty decisionPoints array', () => {
      const result = previewMetadataSchema.safeParse({ ...VALID_METADATA, decisionPoints: [] });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid data', () => {
    it('fails when colorPalette has 4 elements instead of 5', () => {
      const result = previewMetadataSchema.safeParse({
        ...VALID_METADATA,
        colorPalette: ['a', 'b', 'c', 'd'],
      });
      expect(result.success).toBe(false);
    });

    it('fails when colorPalette has 6 elements instead of 5', () => {
      const result = previewMetadataSchema.safeParse({
        ...VALID_METADATA,
        colorPalette: ['a', 'b', 'c', 'd', 'e', 'f'],
      });
      expect(result.success).toBe(false);
    });

    it('fails when year is a string', () => {
      const result = previewMetadataSchema.safeParse({ ...VALID_METADATA, year: '1453' });
      expect(result.success).toBe(false);
    });

    it('fails when characterName is missing', () => {
      const { characterName: _, ...rest } = VALID_METADATA;
      const result = previewMetadataSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('fails when a decisionPoint is missing description', () => {
      const result = previewMetadataSchema.safeParse({
        ...VALID_METADATA,
        decisionPoints: [{ title: 'Only a title' }],
      });
      expect(result.success).toBe(false);
    });

    it('fails on null input', () => {
      const result = previewMetadataSchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });
});

// ─── storyScriptSchema ────────────────────────────────────────────────────────

const VALID_PERSONALITY = {
  voice: 'Sharp, dry, amused. States absurd facts casually.',
  humor: 'Deliver facts WHILE being funny — never choose one over the other.',
  quirks: 'Redirects any question about "the men" back to her own agency before answering.',
  energy: 'Warm but never soft. The smartest person in every room.',
  celebrityAnchor: 'Jennifer Coolidge playing a pharaoh',
};

const VALID_HOOKS = [
  {
    myth: 'She was the most beautiful woman in the ancient world',
    truth: 'She looked like a coin — that is our best evidence',
    surprise: 'Beauty fades in week two of a trade negotiation, speaking someone\'s language lasts',
    anchor: 'Nine languages outlast any pretty face',
  },
  {
    myth: 'She was smuggled to Caesar in a carpet',
    truth: 'Linen sack. She was 21, exiled by her brother, two months from death',
    surprise: 'Not seduction — survival. She had the Egyptian army against her and no allies',
    anchor: 'Her brother had the army, she had herself and a speech prepared in Latin',
  },
  {
    myth: 'Caesar and Antony fell for her because she was irresistible',
    truth: 'She controlled the grain supply of the Mediterranean — Rome could not eat without her',
    surprise: 'Two of the most powerful men in history, supposedly helpless against eyeliner',
    anchor: 'The Romans wrote the history and were not kind to powerful women or Egyptians',
  },
];

const VALID_CHOICE = {
  setup: 'It is 44 BC. Caesar has just been assassinated. She is in Rome with her three-year-old son.',
  options: [
    { title: 'Stay in Rome', description: 'Ally with the senators — risky in a city that just murdered its leader.' },
    { title: 'Flee to Egypt', description: 'Your kingdom needs you, Rome is Caesar\'s game now.' },
    { title: 'Wait and see', description: 'Play the long game, but assassins do not wait.' },
  ],
  consequences: {
    'Stay in Rome': 'That is what Cicero did — dead within a year.',
    'Flee to Egypt': 'That is what she did — on a ship before his body was cold.',
    'Wait and see': 'Dangerous — Octavian was already making moves.',
  },
};

const VALID_STORY_SCRIPT = {
  personality: VALID_PERSONALITY,
  hooks: VALID_HOOKS,
  facts: [
    'Spoke 9 languages: Egyptian, Greek, Ethiopian, Hebrew, Aramaic, Arabic, Median, Parthian, Latin',
    'First Ptolemy in 300 years to learn Egyptian — her family spoke Greek and never bothered',
    'Her father was chased out of Egypt. She learned from his mistakes.',
    'Caesar was 52 when they met. She was 21. He needed grain, not romance.',
    'Ruled for 22 years (51-30 BC). Most people do not get 22 minutes of real power.',
  ],
  choices: [VALID_CHOICE],
  scenes: [
    {
      title: 'The linen sack moment',
      description: 'A young woman being unrolled from a linen sack before a startled Roman general in a candlelit throne room.',
    },
  ],
  closingThread: 'The textbook has a different version — this was hers.',
};

describe('storyScriptSchema', () => {
  describe('valid Cleopatra example', () => {
    it('validates a complete story script', () => {
      const result = storyScriptSchema.safeParse(VALID_STORY_SCRIPT);
      expect(result.success).toBe(true);
    });

    it('returns typed personality with all required fields', () => {
      const result = storyScriptSchema.safeParse(VALID_STORY_SCRIPT);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(typeof result.data.personality.voice).toBe('string');
      expect(typeof result.data.personality.celebrityAnchor).toBe('string');
    });

    it('returns hooks array with myth, truth, surprise, anchor', () => {
      const result = storyScriptSchema.safeParse(VALID_STORY_SCRIPT);
      expect(result.success).toBe(true);
      if (!result.success) return;
      const hook = result.data.hooks[0];
      expect(typeof hook.myth).toBe('string');
      expect(typeof hook.truth).toBe('string');
      expect(typeof hook.surprise).toBe('string');
      expect(typeof hook.anchor).toBe('string');
    });
  });

  describe('invalid data', () => {
    it('rejects missing personality', () => {
      const { personality: _, ...rest } = VALID_STORY_SCRIPT;
      const result = storyScriptSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects empty hooks array (min 3)', () => {
      const result = storyScriptSchema.safeParse({ ...VALID_STORY_SCRIPT, hooks: [] });
      expect(result.success).toBe(false);
    });

    it('rejects hooks array with fewer than 3 items', () => {
      const result = storyScriptSchema.safeParse({ ...VALID_STORY_SCRIPT, hooks: VALID_HOOKS.slice(0, 2) });
      expect(result.success).toBe(false);
    });

    it('rejects hooks array with more than 5 items', () => {
      const sixHooks = [...VALID_HOOKS, ...VALID_HOOKS, { myth: 'm', truth: 't', surprise: 's', anchor: 'a' }];
      const result = storyScriptSchema.safeParse({ ...VALID_STORY_SCRIPT, hooks: sixHooks });
      expect(result.success).toBe(false);
    });

    it('rejects missing closingThread', () => {
      const { closingThread: _, ...rest } = VALID_STORY_SCRIPT;
      const result = storyScriptSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects facts with fewer than 5 items', () => {
      const result = storyScriptSchema.safeParse({ ...VALID_STORY_SCRIPT, facts: ['one', 'two'] });
      expect(result.success).toBe(false);
    });

    it('rejects scenes with more than 3 items', () => {
      const fourScenes = [
        { title: 'a', description: 'b' },
        { title: 'c', description: 'd' },
        { title: 'e', description: 'f' },
        { title: 'g', description: 'h' },
      ];
      const result = storyScriptSchema.safeParse({ ...VALID_STORY_SCRIPT, scenes: fourScenes });
      expect(result.success).toBe(false);
    });

    it('rejects a choice with only 1 option (min 2)', () => {
      const badChoice = {
        ...VALID_CHOICE,
        options: [{ title: 'Only one', description: 'Not enough.' }],
      };
      const result = storyScriptSchema.safeParse({ ...VALID_STORY_SCRIPT, choices: [badChoice] });
      expect(result.success).toBe(false);
    });

    it('rejects a choice with 4 options (max 3)', () => {
      const badChoice = {
        ...VALID_CHOICE,
        options: [
          { title: 'A', description: 'desc' },
          { title: 'B', description: 'desc' },
          { title: 'C', description: 'desc' },
          { title: 'D', description: 'desc' },
        ],
      };
      const result = storyScriptSchema.safeParse({ ...VALID_STORY_SCRIPT, choices: [badChoice] });
      expect(result.success).toBe(false);
    });
  });
});

// ─── flashResponseSchema ──────────────────────────────────────────────────────

describe('flashResponseSchema', () => {
  describe('ready variant', () => {
    it('passes with a valid ready response without storyScript (backward compat)', () => {
      const input = { type: 'ready', metadata: VALID_METADATA };
      const result = flashResponseSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('passes with a valid ready response WITH storyScript', () => {
      const input = { type: 'ready', metadata: VALID_METADATA, storyScript: VALID_STORY_SCRIPT };
      const result = flashResponseSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('exposes storyScript when present', () => {
      const input = { type: 'ready', metadata: VALID_METADATA, storyScript: VALID_STORY_SCRIPT };
      const result = flashResponseSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (!result.success) return;
      if (result.data.type === 'ready') {
        expect(result.data.storyScript?.personality.celebrityAnchor).toBe('Jennifer Coolidge playing a pharaoh');
      }
    });

    it('storyScript is undefined when omitted', () => {
      const input = { type: 'ready', metadata: VALID_METADATA };
      const result = flashResponseSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (!result.success) return;
      if (result.data.type === 'ready') {
        expect(result.data.storyScript).toBeUndefined();
      }
    });

    it('rejects invalid storyScript (missing closingThread)', () => {
      const { closingThread: _, ...badScript } = VALID_STORY_SCRIPT;
      const result = flashResponseSchema.safeParse({ type: 'ready', metadata: VALID_METADATA, storyScript: badScript });
      expect(result.success).toBe(false);
    });

    it('narrows type to ready and exposes metadata', () => {
      const input = { type: 'ready', metadata: VALID_METADATA };
      const result = flashResponseSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.type).toBe('ready');
      if (result.data.type === 'ready') {
        expect(result.data.metadata.characterName).toBe('CONSTANTINE XI');
      }
    });

    it('fails when ready metadata has wrong colorPalette length', () => {
      const result = flashResponseSchema.safeParse({
        type: 'ready',
        metadata: { ...VALID_METADATA, colorPalette: ['a', 'b', 'c'] },
      });
      expect(result.success).toBe(false);
    });

    it('fails when ready is missing metadata field', () => {
      const result = flashResponseSchema.safeParse({ type: 'ready' });
      expect(result.success).toBe(false);
    });
  });

  describe('clarify variant (removed)', () => {
    it('rejects type "clarify" — clarify flow was removed; Flash always returns ready', () => {
      const result = flashResponseSchema.safeParse({
        type: 'clarify',
        topic_extracted: 'Roman art & architecture',
        figures: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('blocked variant', () => {
    const BLOCKED_INPUT = {
      type: 'blocked',
      alternatives: [
        { title: 'Sophie Scholl, 1943', description: 'White Rose resistance.' },
        { title: 'Oskar Schindler, 1944', description: 'Saved 1,200 lives.' },
      ],
    };

    it('passes with a valid blocked response', () => {
      const result = flashResponseSchema.safeParse(BLOCKED_INPUT);
      expect(result.success).toBe(true);
    });

    it('narrows type to blocked and exposes alternatives', () => {
      const result = flashResponseSchema.safeParse(BLOCKED_INPUT);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.type).toBe('blocked');
      if (result.data.type === 'blocked') {
        expect(result.data.alternatives).toHaveLength(2);
      }
    });

    it('fails when blocked alternatives is missing', () => {
      const result = flashResponseSchema.safeParse({ type: 'blocked' });
      expect(result.success).toBe(false);
    });
  });

  describe('discriminator routing', () => {
    it('fails on unknown type value', () => {
      const result = flashResponseSchema.safeParse({ type: 'unknown', data: {} });
      expect(result.success).toBe(false);
    });

    it('fails when type field is missing', () => {
      const result = flashResponseSchema.safeParse({ metadata: VALID_METADATA });
      expect(result.success).toBe(false);
    });

    it('fails on null input', () => {
      const result = flashResponseSchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });
});
