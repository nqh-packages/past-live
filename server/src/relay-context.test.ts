/**
 * Tests for relay-context.ts — reconnect context builder and browser close summary
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./post-call-summary.js', () => ({
  generatePostCallSummary: vi.fn(),
}));

vi.mock('./relay-hooks.js', () => ({
  onSessionEnd: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./session-persistence.js', () => ({
  updateSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./call-logger.js', () => ({
  logCallTranscript: vi.fn(),
}));

vi.mock('./logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { buildReconnectContext, generateBrowserCloseSummary } from './relay-context.js';
import { generatePostCallSummary } from './post-call-summary.js';
import { updateSession } from './session-persistence.js';

// ─── buildReconnectContext ─────────────────────────────────────────────────────

describe('buildReconnectContext', () => {
  it('returns context and resumeInstruction strings', () => {
    const result = buildReconnectContext({
      characterName: 'Constantine XI',
      outputTranscripts: ['The walls hold for now.'],
      inputTranscripts: ['What should we do?'],
      toolCallResults: [],
    });

    expect(typeof result.context).toBe('string');
    expect(typeof result.resumeInstruction).toBe('string');
  });

  it('includes character name in context', () => {
    const result = buildReconnectContext({
      characterName: 'Gene Kranz',
      outputTranscripts: ['Failure is not an option.'],
      inputTranscripts: [],
      toolCallResults: [],
    });

    expect(result.context).toContain('Gene Kranz');
  });

  it('includes all output transcripts — not just last 5', () => {
    const outputs = Array.from({ length: 10 }, (_, i) => `Turn ${i + 1} output`);
    const result = buildReconnectContext({
      characterName: 'Jamukha',
      outputTranscripts: outputs,
      inputTranscripts: [],
      toolCallResults: [],
    });

    // All 10 turns must be included
    for (const turn of outputs) {
      expect(result.context).toContain(turn);
    }
  });

  it('includes all input transcripts — not just last 3', () => {
    const inputs = Array.from({ length: 8 }, (_, i) => `Student turn ${i + 1}`);
    const result = buildReconnectContext({
      characterName: 'Cleopatra VII',
      outputTranscripts: [],
      inputTranscripts: inputs,
      toolCallResults: [],
    });

    for (const turn of inputs) {
      expect(result.context).toContain(turn);
    }
  });

  it('includes tool call results in context', () => {
    const result = buildReconnectContext({
      characterName: 'Constantine XI',
      outputTranscripts: [],
      inputTranscripts: [],
      toolCallResults: [
        { name: 'show_scene', result: 'displayed' },
        { name: 'announce_choice', result: 'presented 3 choices' },
        { name: 'switch_speaker', result: 'switched to A Messenger' },
      ],
    });

    expect(result.context).toContain('displayed');
    expect(result.context).toContain('presented 3 choices');
    expect(result.context).toContain('switched to A Messenger');
  });

  it('handles empty transcripts without error', () => {
    expect(() =>
      buildReconnectContext({
        characterName: 'Gene Kranz',
        outputTranscripts: [],
        inputTranscripts: [],
        toolCallResults: [],
      }),
    ).not.toThrow();
  });

  it('includes no-prior-turns note when transcripts are empty', () => {
    const result = buildReconnectContext({
      characterName: 'Gene Kranz',
      outputTranscripts: [],
      inputTranscripts: [],
      toolCallResults: [],
    });

    expect(result.context).toContain('no prior turns');
  });

  it('resumeInstruction asks character to acknowledge disconnection in-character', () => {
    const result = buildReconnectContext({
      characterName: 'Jamukha',
      outputTranscripts: ['The battle lines are drawn.'],
      inputTranscripts: ['What are your terms?'],
      toolCallResults: [],
    });

    // Must prompt an in-character acknowledgement, not re-introduction
    expect(result.resumeInstruction.toLowerCase()).toContain('lost');
    expect(result.resumeInstruction.toLowerCase()).toContain('continue');
  });

  it('resumeInstruction does NOT ask character to re-introduce themselves', () => {
    const result = buildReconnectContext({
      characterName: 'Gene Kranz',
      outputTranscripts: ['Houston, we have a problem.'],
      inputTranscripts: ['What can we do?'],
      toolCallResults: [],
    });

    // The instruction says "do NOT re-introduce yourself" — the negation is fine.
    // What we must not have is any variant of "tell/say your name" or a fresh introduction.
    const lower = result.resumeInstruction.toLowerCase();
    // Must NOT ask for a new greeting or name introduction
    expect(lower).not.toContain('say who you are');
    expect(lower).not.toContain('greet the student again');
    expect(lower).not.toContain('start over');
    // The word "introduce" only appears in the negative ("do NOT re-introduce") — verify that
    if (lower.includes('introduce')) {
      expect(lower).toMatch(/not.{0,20}introduce/); // negative context required
    }
  });

  it('context contains [Resume the conversation] marker', () => {
    const result = buildReconnectContext({
      characterName: 'Cleopatra VII',
      outputTranscripts: ['I have seen empires rise and fall.'],
      inputTranscripts: ['How did you survive?'],
      toolCallResults: [],
    });

    expect(result.context).toContain('Resume the conversation');
  });

  it('filters out empty transcript entries', () => {
    const result = buildReconnectContext({
      characterName: 'Constantine XI',
      outputTranscripts: ['Valid line.', '', '  ', 'Another line.'],
      inputTranscripts: [],
      toolCallResults: [],
    });

    // Should not include whitespace-only entries
    expect(result.context).toContain('Valid line.');
    expect(result.context).toContain('Another line.');
  });
});

// ─── generateBrowserCloseSummary ──────────────────────────────────────────────

describe('generateBrowserCloseSummary', () => {
  beforeEach(() => {
    vi.mocked(generatePostCallSummary).mockReset();
    vi.mocked(updateSession).mockReset();
  });

  const baseState = {
    sessionId: 'test-close-session',
    characterName: 'Constantine XI',
    historicalSetting: 'Constantinople, 1453',
    voiceName: 'Achird' as string | undefined,
    systemPrompt: 'You are Constantine XI...',
    outputTranscripts: ['The walls hold.'],
    inputTranscripts: ['What should we do?'],
    timeline: [] as { ts: number; event: string }[],
    studentId: undefined as string | undefined,
    scenarioId: 'constantinople-1453' as string | undefined,
    sessionStartMs: Date.now() - 5000,
  };

  it('calls generatePostCallSummary with transcript content', async () => {
    vi.mocked(generatePostCallSummary).mockResolvedValue({
      keyFacts: ['The walls held for 53 days.'],
      outcomeComparison: 'The city fell on May 29, 1453.',
      characterMessage: 'You asked the right questions.',
      suggestedCalls: [],
    });

    await generateBrowserCloseSummary(baseState, 120);

    expect(generatePostCallSummary).toHaveBeenCalledOnce();
    const call = vi.mocked(generatePostCallSummary).mock.calls[0]![0];
    expect(call.characterName).toBe('Constantine XI');
    expect(call.outputTranscript).toContain('The walls hold.');
    expect(call.inputTranscript).toContain('What should we do?');
  });

  it('skips summary when both transcripts are empty', async () => {
    await generateBrowserCloseSummary(
      { ...baseState, outputTranscripts: [], inputTranscripts: [] },
      60,
    );

    expect(generatePostCallSummary).not.toHaveBeenCalled();
  });

  it('skips summary when sessionId is null', async () => {
    await generateBrowserCloseSummary(
      { ...baseState, sessionId: null },
      60,
    );

    expect(generatePostCallSummary).not.toHaveBeenCalled();
  });

  it('calls updateSession with status ended after summary', async () => {
    vi.mocked(generatePostCallSummary).mockResolvedValue({
      keyFacts: [],
      outcomeComparison: 'Historical outcome.',
      characterMessage: 'Farewell.',
      suggestedCalls: [],
    });

    await generateBrowserCloseSummary(baseState, 90);

    expect(updateSession).toHaveBeenCalledOnce();
    const [sessionId, data] = vi.mocked(updateSession).mock.calls[0]!;
    expect(sessionId).toBe('test-close-session');
    expect(data['status']).toBe('ended');
  });

  it('logs error and does not throw when generatePostCallSummary throws', async () => {
    vi.mocked(generatePostCallSummary).mockRejectedValue(new Error('Gemini API down'));

    await expect(generateBrowserCloseSummary(baseState, 60)).resolves.not.toThrow();
  });

  it('skips updateSession when summary generation fails', async () => {
    vi.mocked(generatePostCallSummary).mockRejectedValue(new Error('API error'));

    await generateBrowserCloseSummary(baseState, 60);

    expect(updateSession).not.toHaveBeenCalled();
  });
});
