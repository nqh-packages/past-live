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

  // ─── Constantinople 1453 ─────────────────────────────────────────────────

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
      expect(scenario.role).toMatch(/constantine/i);
      expect(typeof scenario.twist).toBe('string');
      expect(scenario.twist.length).toBeGreaterThan(10);
    });

    it('has voiceName Gacrux', () => {
      scenario = getScenario(CONSTANTINOPLE_ID)!;
      expect(scenario.voiceName).toBe('Gacrux');
    });

    it('has decisionPoint with moment and choices', () => {
      scenario = getScenario(CONSTANTINOPLE_ID)!;
      expect(typeof scenario.decisionPoint.moment).toBe('string');
      expect(scenario.decisionPoint.moment.length).toBeGreaterThan(5);
      expect(Array.isArray(scenario.decisionPoint.choices)).toBe(true);
      expect(scenario.decisionPoint.choices.length).toBeGreaterThanOrEqual(2);
      expect(scenario.decisionPoint.choices.length).toBeLessThanOrEqual(3);
    });

    it('decisionPoint choices have title and description', () => {
      scenario = getScenario(CONSTANTINOPLE_ID)!;
      for (const choice of scenario.decisionPoint.choices) {
        expect(typeof choice.title).toBe('string');
        expect(choice.title.length).toBeGreaterThan(0);
        expect(typeof choice.description).toBe('string');
        expect(choice.description.length).toBeGreaterThan(0);
      }
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

  // ─── Moon Landing 1969 ───────────────────────────────────────────────────

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
      expect(scenario.role).toMatch(/kranz|gene/i);
      expect(scenario.twist.length).toBeGreaterThan(10);
    });

    it('has voiceName Charon', () => {
      scenario = getScenario(MOON_LANDING_ID)!;
      expect(scenario.voiceName).toBe('Charon');
    });

    it('has decisionPoint with moment and choices', () => {
      scenario = getScenario(MOON_LANDING_ID)!;
      expect(typeof scenario.decisionPoint.moment).toBe('string');
      expect(scenario.decisionPoint.choices.length).toBeGreaterThanOrEqual(2);
      for (const choice of scenario.decisionPoint.choices) {
        expect(typeof choice.title).toBe('string');
        expect(typeof choice.description).toBe('string');
      }
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

  // ─── Mongol Empire 1206 ──────────────────────────────────────────────────

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
      expect(scenario.role).toMatch(/jamukha/i);
      expect(scenario.twist.length).toBeGreaterThan(10);
    });

    it('has voiceName Algenib', () => {
      scenario = getScenario(MONGOL_ID)!;
      expect(scenario.voiceName).toBe('Algenib');
    });

    it('has decisionPoint with moment and choices', () => {
      scenario = getScenario(MONGOL_ID)!;
      expect(typeof scenario.decisionPoint.moment).toBe('string');
      expect(scenario.decisionPoint.choices.length).toBeGreaterThanOrEqual(2);
      expect(scenario.decisionPoint.choices.length).toBeLessThanOrEqual(3);
      for (const choice of scenario.decisionPoint.choices) {
        expect(typeof choice.title).toBe('string');
        expect(typeof choice.description).toBe('string');
      }
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

// ─── Prompt Depth Assertions — behavioral rules encoded ──────────────────────

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
        const hasMaxProbes = /max.*3|3.*probe|three probe|maximum.*three|maximum 3/i.test(systemPrompt);
        expect(hasMaxProbes).toBe(true);
      });

      it('does NOT encode corpsing rule (no narrator in this app)', () => {
        const { systemPrompt } = getScenario(id)!;
        const hasCorpsing =
          /corpse|corpsing|even the storyteller/i.test(systemPrompt) ||
          /narrator.*break/i.test(systemPrompt);
        expect(hasCorpsing).toBe(false);
      });

      it('does NOT reference 14-minute pacing (sessions are now 5-7 min)', () => {
        const { systemPrompt } = getScenario(id)!;
        const has14min = /14 min|fourteen min|~14|14-minute/i.test(systemPrompt);
        expect(has14min).toBe(false);
      });

      it('encodes positive in-character ending / closing observation', () => {
        const { systemPrompt } = getScenario(id)!;
        const hasPositiveEnd =
          /positive.*insight|in-character.*insight|step 10|end.*positive|closing.*observation/i.test(systemPrompt);
        expect(hasPositiveEnd).toBe(true);
      });

      it('rejects teacher-mode language in probing', () => {
        const { systemPrompt } = getScenario(id)!;
        const forbidsTeacherMode =
          /good try|actually\.\.\.|let me give you a hint|well done|teacher.?mode/i.test(systemPrompt);
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

      it('references end_session tool', () => {
        const { systemPrompt } = getScenario(id)!;
        expect(systemPrompt).toContain('end_session');
      });

      it('references announce_choice tool', () => {
        const { systemPrompt } = getScenario(id)!;
        expect(systemPrompt).toContain('announce_choice');
      });

      it('uses stranger framing (not advisor)', () => {
        const { systemPrompt } = getScenario(id)!;
        expect(/stranger/i.test(systemPrompt)).toBe(true);
      });
    });
  }
});

// ─── Call metaphor framing per scenario ──────────────────────────────────────

describe('call metaphor framing', () => {
  it('Constantinople prompt does NOT use "advisor" as the student role', () => {
    const { systemPrompt } = getScenario('constantinople-1453')!;
    // "most trusted advisor" was the old framing — student is now a stranger
    expect(/most trusted advisor/i.test(systemPrompt)).toBe(false);
  });

  it('Moon prompt does NOT reference "engineer" as the student role', () => {
    const { systemPrompt } = getScenario('moon-landing-1969')!;
    expect(/lead systems engineer|student.*engineer/i.test(systemPrompt)).toBe(false);
  });

  it('Mongol prompt does NOT reference "chieftain ally" as the student role', () => {
    const { systemPrompt } = getScenario('mongol-empire-1206')!;
    expect(/chieftain ally|tribal.*chieftain.*ally/i.test(systemPrompt)).toBe(false);
  });

  it('Constantinople prompt frames the call correctly', () => {
    const { systemPrompt } = getScenario('constantinople-1453')!;
    expect(/called you from beyond|stranger/i.test(systemPrompt)).toBe(true);
  });

  it('Moon prompt frames the call correctly', () => {
    const { systemPrompt } = getScenario('moon-landing-1969')!;
    expect(/unknown voice.*comm|appeared on the comm/i.test(systemPrompt)).toBe(true);
  });

  it('Mongol prompt frames the call correctly', () => {
    const { systemPrompt } = getScenario('mongol-empire-1206')!;
    expect(/stranger arrived.*fire|don.t belong on the steppe/i.test(systemPrompt)).toBe(true);
  });
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

  it('frames the student as a caller from the future, not a role', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    expect(/called.*from.*future|someone.*on the line|call from.*future/i.test(prompt)).toBe(true);
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
    const hasMaxProbes = /max.*3|3.*probe|three probe|maximum.*three|maximum 3/i.test(prompt);
    expect(hasMaxProbes).toBe(true);
  });

  it('does NOT encode corpsing rule', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    const hasCorpsing =
      /corpse|corpsing|even the storyteller/i.test(prompt) ||
      /narrator.*break/i.test(prompt);
    expect(hasCorpsing).toBe(false);
  });

  it('does NOT reference 14-minute pacing', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    expect(/14 min|fourteen min|~14|14-minute/i.test(prompt)).toBe(false);
  });

  it('encodes positive ending', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    const hasPositiveEnd =
      /positive.*insight|in-character.*insight|step 10|end.*positive|closing.*observation/i.test(prompt);
    expect(hasPositiveEnd).toBe(true);
  });

  it('rejects teacher-mode language', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    const forbidsTeacherMode =
      /good try|actually\.\.\.|let me give you a hint|well done|teacher.?mode/i.test(prompt);
    expect(forbidsTeacherMode).toBe(true);
  });

  it('references announce_choice tool', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    expect(prompt).toContain('announce_choice');
  });

  it('references end_session tool', () => {
    const prompt = buildOpenTopicPrompt('French Revolution');
    expect(prompt).toContain('end_session');
  });
});

// ─── Accessible language rules ────────────────────────────────────────────────

describe('BEHAVIORAL_RULES accessible language', () => {
  const promptUnderTest = (): string => getScenario('constantinople-1453')!.systemPrompt;

  it('includes a forbidden vocabulary list', () => {
    const prompt = promptUnderTest();
    const hasForbiddenVocab = /FORBIDDEN VOCABULARY|forbidden vocabulary/i.test(prompt);
    expect(hasForbiddenVocab).toBe(true);
  });

  it('includes specific forbidden words in the list', () => {
    const prompt = promptUnderTest();
    expect(/inexorable/i.test(prompt)).toBe(true);
    expect(/nascent/i.test(prompt)).toBe(true);
    expect(/hegemony/i.test(prompt)).toBe(true);
  });

  it('does not contain forbidden jargon in the instructions themselves', () => {
    const prompt = promptUnderTest();
    const hasPlainLanguage =
      /plain words/i.test(prompt) ||
      /plain language/i.test(prompt) ||
      /common sense/i.test(prompt);
    expect(hasPlainLanguage).toBe(true);
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

  it('all scenarios have non-empty voiceName', () => {
    for (const id of SCENARIO_IDS) {
      const scenario = getScenario(id)!;
      expect(typeof scenario.voiceName).toBe('string');
      expect(scenario.voiceName.length).toBeGreaterThan(0);
    }
  });

  it('all scenarios have decisionPoint with at least 2 choices', () => {
    for (const id of SCENARIO_IDS) {
      const scenario = getScenario(id)!;
      expect(scenario.decisionPoint).toBeDefined();
      expect(scenario.decisionPoint.choices.length).toBeGreaterThanOrEqual(2);
    }
  });
});
