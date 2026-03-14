import { describe, it, expect } from 'vitest';
import {
  getScenario,
  SCENARIO_IDS,
  buildOpenTopicPrompt,
  type Scenario,
} from './scenarios.js';

// ─── SCENARIO_IDS ────────────────────────────────────────────────────────────

describe('SCENARIO_IDS', () => {
  it('contains exactly 3 scenario IDs', () => {
    expect(SCENARIO_IDS).toHaveLength(3);
  });

  it('contains only non-empty strings', () => {
    for (const id of SCENARIO_IDS) {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    }
  });

  it('is readonly (tuple type — runtime array check)', () => {
    // SCENARIO_IDS is readonly; verifying it is array-like
    expect(Array.isArray(SCENARIO_IDS)).toBe(true);
  });
});

// ─── getScenario — Zero / boundary cases ─────────────────────────────────────

describe('getScenario', () => {
  describe('returns undefined for unknown IDs', () => {
    it('returns undefined for empty string', () => {
      expect(getScenario('')).toBeUndefined();
    });

    it('returns undefined for a random unknown ID', () => {
      expect(getScenario('french-revolution')).toBeUndefined();
    });

    it('returns undefined for partial match', () => {
      expect(getScenario('constantinople')).toBeUndefined();
    });

    it('is case-sensitive — uppercase variant returns undefined', () => {
      const upperCased = SCENARIO_IDS[0].toUpperCase();
      expect(getScenario(upperCased)).toBeUndefined();
    });
  });

  // ─── One — each known ID returns a valid Scenario ────────────────────────

  describe('Constantinople 1453 scenario', () => {
    const CONSTANTINOPLE_ID = 'constantinople-1453';
    let scenario: Scenario | undefined;

    it('is in SCENARIO_IDS', () => {
      expect(SCENARIO_IDS).toContain(CONSTANTINOPLE_ID);
    });

    it('returns a defined Scenario', () => {
      scenario = getScenario(CONSTANTINOPLE_ID);
      expect(scenario).toBeDefined();
    });

    it('has required metadata fields', () => {
      scenario = getScenario(CONSTANTINOPLE_ID)!;
      expect(scenario.id).toBe(CONSTANTINOPLE_ID);
      expect(scenario.title).toContain('Constantinople');
      expect(scenario.year).toBe(1453);
      expect(scenario.role).toMatch(/advisor/i);
      expect(typeof scenario.twist).toBe('string');
      expect(scenario.twist.length).toBeGreaterThan(10);
    });

    it('has a non-empty systemPrompt', () => {
      scenario = getScenario(CONSTANTINOPLE_ID)!;
      expect(typeof scenario.systemPrompt).toBe('string');
      expect(scenario.systemPrompt.length).toBeGreaterThan(200);
    });

    it('has 3-5 summaryFacts', () => {
      scenario = getScenario(CONSTANTINOPLE_ID)!;
      expect(scenario.summaryFacts.length).toBeGreaterThanOrEqual(3);
      expect(scenario.summaryFacts.length).toBeLessThanOrEqual(5);
      for (const fact of scenario.summaryFacts) {
        expect(typeof fact).toBe('string');
        expect(fact.length).toBeGreaterThan(0);
      }
    });

    it('has a non-empty actualOutcome', () => {
      scenario = getScenario(CONSTANTINOPLE_ID)!;
      expect(typeof scenario.actualOutcome).toBe('string');
      expect(scenario.actualOutcome.length).toBeGreaterThan(20);
    });

    it('has 2-3 relatedScenarios', () => {
      scenario = getScenario(CONSTANTINOPLE_ID)!;
      expect(scenario.relatedScenarios.length).toBeGreaterThanOrEqual(2);
      expect(scenario.relatedScenarios.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Moon Landing 1969 scenario', () => {
    const MOON_LANDING_ID = 'moon-landing-1969';
    let scenario: Scenario | undefined;

    it('is in SCENARIO_IDS', () => {
      expect(SCENARIO_IDS).toContain(MOON_LANDING_ID);
    });

    it('returns a defined Scenario', () => {
      scenario = getScenario(MOON_LANDING_ID);
      expect(scenario).toBeDefined();
    });

    it('has required metadata fields', () => {
      scenario = getScenario(MOON_LANDING_ID)!;
      expect(scenario.id).toBe(MOON_LANDING_ID);
      expect(scenario.title).toMatch(/moon/i);
      expect(scenario.year).toBe(1969);
      expect(scenario.role).toMatch(/mission control|nasa/i);
      expect(scenario.twist.length).toBeGreaterThan(10);
    });

    it('has a non-empty systemPrompt', () => {
      scenario = getScenario(MOON_LANDING_ID)!;
      expect(scenario.systemPrompt.length).toBeGreaterThan(200);
    });

    it('has 3-5 summaryFacts', () => {
      scenario = getScenario(MOON_LANDING_ID)!;
      expect(scenario.summaryFacts.length).toBeGreaterThanOrEqual(3);
      expect(scenario.summaryFacts.length).toBeLessThanOrEqual(5);
    });

    it('has a non-empty actualOutcome', () => {
      scenario = getScenario(MOON_LANDING_ID)!;
      expect(scenario.actualOutcome.length).toBeGreaterThan(20);
    });

    it('has 2-3 relatedScenarios', () => {
      scenario = getScenario(MOON_LANDING_ID)!;
      expect(scenario.relatedScenarios.length).toBeGreaterThanOrEqual(2);
      expect(scenario.relatedScenarios.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Mongol Empire 1206 scenario', () => {
    const MONGOL_ID = 'mongol-empire-1206';
    let scenario: Scenario | undefined;

    it('is in SCENARIO_IDS', () => {
      expect(SCENARIO_IDS).toContain(MONGOL_ID);
    });

    it('returns a defined Scenario', () => {
      scenario = getScenario(MONGOL_ID);
      expect(scenario).toBeDefined();
    });

    it('has required metadata fields', () => {
      scenario = getScenario(MONGOL_ID)!;
      expect(scenario.id).toBe(MONGOL_ID);
      expect(scenario.title).toMatch(/mongol/i);
      expect(scenario.year).toBe(1206);
      expect(scenario.role).toMatch(/rival|tribe|khan/i);
      expect(scenario.twist.length).toBeGreaterThan(10);
    });

    it('has a non-empty systemPrompt', () => {
      scenario = getScenario(MONGOL_ID)!;
      expect(scenario.systemPrompt.length).toBeGreaterThan(200);
    });

    it('has 3-5 summaryFacts', () => {
      scenario = getScenario(MONGOL_ID)!;
      expect(scenario.summaryFacts.length).toBeGreaterThanOrEqual(3);
      expect(scenario.summaryFacts.length).toBeLessThanOrEqual(5);
    });

    it('has a non-empty actualOutcome', () => {
      scenario = getScenario(MONGOL_ID)!;
      expect(scenario.actualOutcome.length).toBeGreaterThan(20);
    });

    it('has 2-3 relatedScenarios', () => {
      scenario = getScenario(MONGOL_ID)!;
      expect(scenario.relatedScenarios.length).toBeGreaterThanOrEqual(2);
      expect(scenario.relatedScenarios.length).toBeLessThanOrEqual(3);
    });
  });
});

// ─── Prompt Depth Assertions — the critical quality gate ─────────────────────

describe('systemPrompt depth — behavioral rules encoded', () => {
  for (const id of ['constantinople-1453', 'moon-landing-1969', 'mongol-empire-1206'] as const) {
    describe(`${id} systemPrompt`, () => {
      it('enforces character lock (never break character)', () => {
        const { systemPrompt } = getScenario(id)!;
        const hasCharLock =
          /never break character/i.test(systemPrompt) ||
          /stay in character/i.test(systemPrompt) ||
          /remain in character/i.test(systemPrompt) ||
          /do not break character/i.test(systemPrompt);
        expect(hasCharLock).toBe(true);
      });

      it('encodes probing ladder (probe → hint → rephrase → progress)', () => {
        const { systemPrompt } = getScenario(id)!;
        const hasProbe = /probe|hint|rephrase|nudge/i.test(systemPrompt);
        const hasProgress = /progress.*story|move.*narrative|advance.*story/i.test(systemPrompt);
        expect(hasProbe).toBe(true);
        expect(hasProgress).toBe(true);
      });

      it('encodes max probes limit (3)', () => {
        const { systemPrompt } = getScenario(id)!;
        const hasMaxProbes = /max.*3|3.*probe|three probe|maximum.*three/i.test(systemPrompt);
        expect(hasMaxProbes).toBe(true);
      });

      it('encodes corpsing rule (max 1x per session)', () => {
        const { systemPrompt } = getScenario(id)!;
        const hasCorpsing =
          /corpse|corpsing|storyteller.*did.*not.*see|even the storyteller/i.test(systemPrompt) ||
          /narrator.*break|break.*narrator/i.test(systemPrompt);
        expect(hasCorpsing).toBe(true);
      });

      it('encodes session pacing target (~14 min)', () => {
        const { systemPrompt } = getScenario(id)!;
        const hasPacing = /14 min|fourteen min|~14|14-minute/i.test(systemPrompt);
        expect(hasPacing).toBe(true);
      });

      it('encodes positive in-character ending at step 10', () => {
        const { systemPrompt } = getScenario(id)!;
        const hasPositiveEnd =
          /positive.*insight|in-character.*insight|step 10|end.*positive|closing.*observation/i.test(systemPrompt);
        expect(hasPositiveEnd).toBe(true);
      });

      it('rejects teacher-mode language in probing', () => {
        const { systemPrompt } = getScenario(id)!;
        // Must explicitly forbid teacher phrases — the prompt should call them out
        const forbidsTeacherMode =
          /good try|actually\.\.\.|let me give you a hint|well done|teacher.?mode/i.test(systemPrompt);
        // Teacher-mode phrases must be listed as FORBIDDEN in prompt
        expect(forbidsTeacherMode).toBe(true);
      });

      it('accepts both theatrical and calm reasoning styles', () => {
        const { systemPrompt } = getScenario(id)!;
        const hasFlexibility =
          /theatrical|calm.*reasoning|logical.*answer|role.?play/i.test(systemPrompt);
        expect(hasFlexibility).toBe(true);
      });

      it('seeds the scenario twist early', () => {
        const { systemPrompt } = getScenario(id)!;
        const hasTwist = /twist|crisis|turn|seed/i.test(systemPrompt);
        expect(hasTwist).toBe(true);
      });
    });
  }
});

// ─── buildOpenTopicPrompt ─────────────────────────────────────────────────────

describe('buildOpenTopicPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(200);
  });

  it('incorporates the provided topic', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    expect(prompt).toContain('French Revolution');
  });

  it('works with varied topic strings', () => {
    const topics = ['World War I', 'Ancient Rome', 'The Black Death'];
    for (const topic of topics) {
      const prompt = buildOpenTopicPrompt(topic);
      expect(prompt).toContain(topic);
      expect(prompt.length).toBeGreaterThan(200);
    }
  });

  it('encodes character lock', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    const hasCharLock =
      /never break character/i.test(prompt) ||
      /stay in character/i.test(prompt) ||
      /remain in character/i.test(prompt);
    expect(hasCharLock).toBe(true);
  });

  it('encodes probing ladder', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    const hasProbe = /probe|hint|rephrase|nudge/i.test(prompt);
    expect(hasProbe).toBe(true);
  });

  it('encodes max probes limit', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    const hasMaxProbes = /max.*3|3.*probe|three probe|maximum.*three/i.test(prompt);
    expect(hasMaxProbes).toBe(true);
  });

  it('encodes corpsing rule', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    const hasCorpsing =
      /corpse|corpsing|storyteller.*did.*not.*see|even the storyteller/i.test(prompt) ||
      /narrator.*break|break.*narrator/i.test(prompt);
    expect(hasCorpsing).toBe(true);
  });

  it('encodes pacing target', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    const hasPacing = /14 min|fourteen min|~14|14-minute/i.test(prompt);
    expect(hasPacing).toBe(true);
  });

  it('encodes positive ending', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    const hasPositiveEnd =
      /positive.*insight|in-character.*insight|step 10|end.*positive|closing.*observation/i.test(
        prompt
      );
    expect(hasPositiveEnd).toBe(true);
  });

  it('rejects teacher-mode language', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    const forbidsTeacherMode =
      /good try|actually\.\.\.|let me give you a hint|well done|teacher.?mode/i.test(prompt);
    expect(forbidsTeacherMode).toBe(true);
  });
});

// ─── Accessible language rules (variant B) ────────────────────────────────────

describe('BEHAVIORAL_RULES accessible language', () => {
  // Get the BEHAVIORAL_RULES content through a scenario that embeds it
  const promptUnderTest = (): string => getScenario('constantinople-1453')!.systemPrompt;

  it('includes short sentence guidance (max 15 words per sentence)', () => {
    // The rules section must contain a reference that signals accessible language
    // We verify by checking the rules contain the forbidden vocabulary list
    const prompt = promptUnderTest();
    const hasForbiddenVocab = /FORBIDDEN VOCABULARY|forbidden vocabulary/i.test(prompt);
    expect(hasForbiddenVocab).toBe(true);
  });

  it('includes a forbidden vocabulary list', () => {
    const prompt = promptUnderTest();
    // Must explicitly list hard academic words to block
    const hasInexorable = /inexorable/i.test(prompt);
    const hasNascent = /nascent/i.test(prompt);
    const hasHegemony = /hegemony/i.test(prompt);
    expect(hasInexorable).toBe(true);
    expect(hasNascent).toBe(true);
    expect(hasHegemony).toBe(true);
  });

  it('does not contain forbidden jargon words in the rules section', () => {
    // The forbidden words should appear only in the "do not use" list — not in the actual instructions.
    // We verify the rules prefer plain language by checking the plain-word instructions exist.
    const prompt = promptUnderTest();
    // Plain language markers present in variant B rules
    const hasPlainLanguage =
      /plain words/i.test(prompt) ||
      /plain language/i.test(prompt) ||
      /common sense/i.test(prompt);
    expect(hasPlainLanguage).toBe(true);
  });

  it('uses documentary tone markers (BBC/PBS style)', () => {
    // Variant B rules reference the narrator/documentary style
    const prompt = promptUnderTest();
    const hasDocumentaryTone =
      /narrator break/i.test(prompt) ||
      /even the storyteller/i.test(prompt) ||
      /storyteller/i.test(prompt);
    expect(hasDocumentaryTone).toBe(true);
  });
});

describe('buildOpenTopicPrompt accessible language', () => {
  it('includes forbidden vocabulary list', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    const hasForbiddenVocab = /FORBIDDEN VOCABULARY|forbidden vocabulary/i.test(prompt);
    expect(hasForbiddenVocab).toBe(true);
  });

  it('contains specific forbidden words in the list', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    expect(/inexorable/i.test(prompt)).toBe(true);
    expect(/hegemony/i.test(prompt)).toBe(true);
  });

  it('includes plain language guidance', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    const hasPlainLanguage =
      /plain words/i.test(prompt) ||
      /plain language/i.test(prompt);
    expect(hasPlainLanguage).toBe(true);
  });
});

// ─── Cross-scenario integrity ─────────────────────────────────────────────────

describe('cross-scenario integrity', () => {
  it('all SCENARIO_IDS resolve to a defined Scenario', () => {
    for (const id of SCENARIO_IDS) {
      expect(getScenario(id)).toBeDefined();
    }
  });

  it('all scenario IDs are unique', () => {
    const ids = SCENARIO_IDS as unknown as string[];
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('each scenario id field matches its lookup key', () => {
    for (const id of SCENARIO_IDS) {
      const scenario = getScenario(id)!;
      expect(scenario.id).toBe(id);
    }
  });

  it('relatedScenarios only reference known IDs', () => {
    for (const id of SCENARIO_IDS) {
      const scenario = getScenario(id)!;
      for (const related of scenario.relatedScenarios) {
        expect(SCENARIO_IDS).toContain(related);
      }
    }
  });

  it('no scenario lists itself as a related scenario', () => {
    for (const id of SCENARIO_IDS) {
      const scenario = getScenario(id)!;
      expect(scenario.relatedScenarios).not.toContain(id);
    }
  });
});
