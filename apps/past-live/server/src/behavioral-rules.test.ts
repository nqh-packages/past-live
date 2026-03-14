import { describe, it, expect } from 'vitest';
import { Type } from '@google/genai';
import { BEHAVIORAL_RULES, TOOL_DECLARATIONS } from './behavioral-rules.js';

describe('BEHAVIORAL_RULES', () => {
  it('is a non-empty string', () => {
    expect(typeof BEHAVIORAL_RULES).toBe('string');
    expect(BEHAVIORAL_RULES.length).toBeGreaterThan(500);
  });

  describe('required key phrases', () => {
    it('contains no narrator instruction', () => {
      expect(/no narrator/i.test(BEHAVIORAL_RULES)).toBe(true);
    });

    it('contains switch_speaker reference', () => {
      expect(BEHAVIORAL_RULES).toContain('switch_speaker');
    });

    it('contains announce_choice reference', () => {
      expect(BEHAVIORAL_RULES).toContain('announce_choice');
    });

    it('contains end_session reference', () => {
      expect(BEHAVIORAL_RULES).toContain('end_session');
    });

    it('contains emotional boundaries section', () => {
      expect(/emotional boundaries/i.test(BEHAVIORAL_RULES)).toBe(true);
    });

    it('contains character-driven tone instruction', () => {
      expect(/character.driven|tone is character/i.test(BEHAVIORAL_RULES)).toBe(true);
    });

    it('contains ALLOWED emotional behaviors', () => {
      expect(BEHAVIORAL_RULES).toContain('ALLOWED');
      expect(/urgency|gratitude|historical grief/i.test(BEHAVIORAL_RULES)).toBe(true);
    });

    it('contains FORBIDDEN emotional behaviors', () => {
      expect(BEHAVIORAL_RULES).toContain('FORBIDDEN');
      expect(/don.t leave me|i need you|parasocial/i.test(BEHAVIORAL_RULES)).toBe(true);
    });

    it('contains forbidden teacher-mode vocabulary', () => {
      expect(/FORBIDDEN VOCABULARY/i.test(BEHAVIORAL_RULES)).toBe(true);
      expect(/inexorable/i.test(BEHAVIORAL_RULES)).toBe(true);
      expect(/nascent/i.test(BEHAVIORAL_RULES)).toBe(true);
      expect(/hegemony/i.test(BEHAVIORAL_RULES)).toBe(true);
    });

    it('contains probing ladder with max 3 probes', () => {
      expect(/probe|hint/i.test(BEHAVIORAL_RULES)).toBe(true);
      expect(/max.*3|3.*probe|maximum 3/i.test(BEHAVIORAL_RULES)).toBe(true);
    });

    it('contains character lock rules', () => {
      expect(/stay in character|never break character/i.test(BEHAVIORAL_RULES)).toBe(true);
    });

    it('contains positive closing observation rule', () => {
      expect(/closing observation/i.test(BEHAVIORAL_RULES)).toBe(true);
    });

    it('contains plain language instruction', () => {
      expect(/plain words|plain language/i.test(BEHAVIORAL_RULES)).toBe(true);
    });
  });

  describe('excluded old framing', () => {
    it('does NOT contain narrator break concept', () => {
      expect(/narrator break/i.test(BEHAVIORAL_RULES)).toBe(false);
    });

    it('does NOT contain corpsing', () => {
      expect(/corpsing|corpse/i.test(BEHAVIORAL_RULES)).toBe(false);
    });

    it('does NOT say humor is mandatory', () => {
      expect(/humor is mandatory/i.test(BEHAVIORAL_RULES)).toBe(false);
    });

    it('does NOT contain 14-minute pacing reference', () => {
      expect(/14.min|14-minute|fourteen min/i.test(BEHAVIORAL_RULES)).toBe(false);
    });
  });
});

describe('TOOL_DECLARATIONS', () => {
  it('is an array with exactly one tool group', () => {
    expect(Array.isArray(TOOL_DECLARATIONS)).toBe(true);
    expect(TOOL_DECLARATIONS).toHaveLength(1);
  });

  it('has exactly 3 function declarations', () => {
    const declarations = TOOL_DECLARATIONS[0].functionDeclarations!;
    expect(Array.isArray(declarations)).toBe(true);
    expect(declarations).toHaveLength(3);
  });

  it('declares end_session with reason parameter', () => {
    const declarations = TOOL_DECLARATIONS[0].functionDeclarations!;
    const endSession = declarations.find((d) => d.name === 'end_session')!;
    expect(endSession).toBeDefined();
    expect(endSession.parameters!.properties).toHaveProperty('reason');
    const reason = endSession.parameters!.properties as { reason: { type: string; enum: string[] } };
    expect(reason.reason.enum).toContain('story_complete');
    expect(reason.reason.enum).toContain('student_request');
  });

  it('declares switch_speaker with speaker and name parameters', () => {
    const declarations = TOOL_DECLARATIONS[0].functionDeclarations!;
    const switchSpeaker = declarations.find((d) => d.name === 'switch_speaker')!;
    expect(switchSpeaker).toBeDefined();
    expect(switchSpeaker.parameters!.properties).toHaveProperty('speaker');
    expect(switchSpeaker.parameters!.properties).toHaveProperty('name');
    const speaker = (switchSpeaker.parameters!.properties as { speaker: { enum: string[] } }).speaker;
    expect(speaker.enum).toContain('character');
    // Should NOT contain 'narrator' — no narrator in this app
    expect(speaker.enum).not.toContain('narrator');
  });

  it('declares announce_choice with choices array parameter', () => {
    const declarations = TOOL_DECLARATIONS[0].functionDeclarations!;
    const announceChoice = declarations.find((d) => d.name === 'announce_choice')!;
    expect(announceChoice).toBeDefined();
    expect(announceChoice.parameters!.properties).toHaveProperty('choices');
    const choices = (announceChoice.parameters!.properties as { choices: { type: Type; items: object } }).choices;
    expect(choices.type).toBe(Type.ARRAY);
    expect(choices.items).toBeDefined();
  });

  it('all 3 tools have correct names', () => {
    const names = TOOL_DECLARATIONS[0].functionDeclarations!.map((d) => d.name);
    expect(names).toContain('end_session');
    expect(names).toContain('switch_speaker');
    expect(names).toContain('announce_choice');
  });

  it('all tools have non-empty descriptions', () => {
    for (const decl of TOOL_DECLARATIONS[0].functionDeclarations!) {
      expect(typeof decl.description).toBe('string');
      expect(decl.description!.length).toBeGreaterThan(10);
    }
  });
});
