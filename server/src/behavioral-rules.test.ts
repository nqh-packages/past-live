import { describe, it, expect } from 'vitest';
import { Type } from '@google/genai';
import { BEHAVIORAL_RULES, TOOL_DECLARATIONS } from './behavioral-rules.js';

describe('BEHAVIORAL_RULES', () => {
  it('is a non-empty string', () => {
    expect(typeof BEHAVIORAL_RULES).toBe('string');
    expect(BEHAVIORAL_RULES.length).toBeGreaterThan(100);
  });
});

describe('TOOL_DECLARATIONS', () => {
  it('has function declarations', () => {
    expect(Array.isArray(TOOL_DECLARATIONS)).toBe(true);
    expect(TOOL_DECLARATIONS).toHaveLength(1);
    expect(TOOL_DECLARATIONS[0].functionDeclarations).toBeDefined();
  });

  it('has exactly 4 function declarations', () => {
    const declarations = TOOL_DECLARATIONS[0].functionDeclarations!;
    expect(declarations).toHaveLength(4);
  });

  it('declares end_session with reason parameter', () => {
    const declarations = TOOL_DECLARATIONS[0].functionDeclarations!;
    const endSession = declarations.find((d) => d.name === 'end_session')!;
    expect(endSession).toBeDefined();
    expect(endSession.parameters!.properties).toHaveProperty('reason');
  });

  it('declares switch_speaker with speaker and name', () => {
    const declarations = TOOL_DECLARATIONS[0].functionDeclarations!;
    const switchSpeaker = declarations.find((d) => d.name === 'switch_speaker')!;
    expect(switchSpeaker).toBeDefined();
    expect(switchSpeaker.parameters!.properties).toHaveProperty('speaker');
    expect(switchSpeaker.parameters!.properties).toHaveProperty('name');
  });

  it('declares announce_choice with choices array', () => {
    const declarations = TOOL_DECLARATIONS[0].functionDeclarations!;
    const announceChoice = declarations.find((d) => d.name === 'announce_choice')!;
    expect(announceChoice).toBeDefined();
    const choices = (announceChoice.parameters!.properties as { choices: { type: Type } }).choices;
    expect(choices.type).toBe(Type.ARRAY);
  });

  it('declares show_scene with title and description', () => {
    const declarations = TOOL_DECLARATIONS[0].functionDeclarations!;
    const showScene = declarations.find((d) => d.name === 'show_scene')!;
    expect(showScene).toBeDefined();
    expect(showScene.parameters!.properties).toHaveProperty('title');
    expect(showScene.parameters!.properties).toHaveProperty('description');
  });

  it('all tools have non-empty descriptions', () => {
    for (const decl of TOOL_DECLARATIONS[0].functionDeclarations!) {
      expect(typeof decl.description).toBe('string');
      expect(decl.description!.length).toBeGreaterThan(10);
    }
  });
});
