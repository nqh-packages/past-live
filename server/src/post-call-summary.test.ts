/**
 * Tests for post-call-summary.ts — Gemini Flash transcript analysis
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock ai-client before importing module under test ────────────────────────

const mockGenerateContent = vi.fn();

vi.mock('./ai-client.js', () => ({
  getAI: vi.fn(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

import { generatePostCallSummary } from './post-call-summary.js';
import type { PostCallSummary } from './post-call-summary.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_SUMMARY: PostCallSummary = {
  keyFacts: [
    'The Ottoman fleet was blocked by a harbor chain across the Golden Horn.',
    'Constantine XI had fewer than 7,000 defenders against 80,000 Ottoman troops.',
    'Mehmed II transported 70 ships overland to bypass the harbor chain.',
  ],
  outcomeComparison:
    'Constantinople fell on May 29, 1453. The student advised reinforcing the walls, which aligned with what Constantine actually did — but it was not enough.',
  characterMessage:
    'You asked the questions a general should ask. The city may have fallen, but your mind is sharp. Call again.',
  suggestedCalls: [
    { name: 'Sultan Mehmed II', era: 'Ottoman Empire, 1453', hook: 'I built the cannons that broke your walls.' },
    { name: 'Giovanni Giustiniani', era: 'Byzantine Empire, 1453', hook: 'I held the gate until the end.' },
    { name: 'Nicolò Barbaro', era: 'Venetian Republic, 1453', hook: 'I witnessed the fall from the harbor.' },
  ],
};

const BASE_PARAMS = {
  characterName: 'CONSTANTINE XI',
  historicalSetting: 'Constantinople, 1453',
  inputTranscript: 'Should we reinforce the sea walls or the land walls?',
  outputTranscript: 'The sea walls hold — the chain is our advantage. The land walls need every man.',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockSuccess(summary: PostCallSummary) {
  mockGenerateContent.mockResolvedValueOnce({
    text: JSON.stringify(summary),
  });
}

function mockSuccessWithFences(summary: PostCallSummary) {
  mockGenerateContent.mockResolvedValueOnce({
    text: `\`\`\`json\n${JSON.stringify(summary)}\n\`\`\``,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('generatePostCallSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('valid JSON response', () => {
    it('returns parsed PostCallSummary on success', async () => {
      mockSuccess(VALID_SUMMARY);

      const result = await generatePostCallSummary(BASE_PARAMS);

      expect(result).toEqual(VALID_SUMMARY);
    });

    it('includes keyFacts array in result', async () => {
      mockSuccess(VALID_SUMMARY);

      const result = await generatePostCallSummary(BASE_PARAMS);

      expect(Array.isArray(result.keyFacts)).toBe(true);
      expect(result.keyFacts.length).toBeGreaterThan(0);
    });

    it('includes outcomeComparison string in result', async () => {
      mockSuccess(VALID_SUMMARY);

      const result = await generatePostCallSummary(BASE_PARAMS);

      expect(typeof result.outcomeComparison).toBe('string');
      expect(result.outcomeComparison.length).toBeGreaterThan(0);
    });

    it('includes characterMessage string in result', async () => {
      mockSuccess(VALID_SUMMARY);

      const result = await generatePostCallSummary(BASE_PARAMS);

      expect(typeof result.characterMessage).toBe('string');
    });

    it('includes suggestedCalls array in result', async () => {
      mockSuccess(VALID_SUMMARY);

      const result = await generatePostCallSummary(BASE_PARAMS);

      expect(Array.isArray(result.suggestedCalls)).toBe(true);
      expect(result.suggestedCalls.length).toBeGreaterThan(0);
    });

    it('each suggestedCall has name, era, hook fields', async () => {
      mockSuccess(VALID_SUMMARY);

      const result = await generatePostCallSummary(BASE_PARAMS);

      for (const call of result.suggestedCalls) {
        expect(typeof call.name).toBe('string');
        expect(typeof call.era).toBe('string');
        expect(typeof call.hook).toBe('string');
      }
    });
  });

  describe('prompt construction', () => {
    it('includes characterName in the prompt sent to Gemini', async () => {
      mockSuccess(VALID_SUMMARY);

      await generatePostCallSummary(BASE_PARAMS);

      const callArgs = mockGenerateContent.mock.calls[0];
      const prompt = JSON.stringify(callArgs);
      expect(prompt).toContain('CONSTANTINE XI');
    });

    it('includes historicalSetting in the prompt sent to Gemini', async () => {
      mockSuccess(VALID_SUMMARY);

      await generatePostCallSummary(BASE_PARAMS);

      const callArgs = mockGenerateContent.mock.calls[0];
      const prompt = JSON.stringify(callArgs);
      expect(prompt).toContain('Constantinople, 1453');
    });

    it('includes outputTranscript content in the prompt', async () => {
      mockSuccess(VALID_SUMMARY);

      await generatePostCallSummary(BASE_PARAMS);

      const callArgs = mockGenerateContent.mock.calls[0];
      const prompt = JSON.stringify(callArgs);
      expect(prompt).toContain('sea walls hold');
    });

    it('includes inputTranscript content in the prompt', async () => {
      mockSuccess(VALID_SUMMARY);

      await generatePostCallSummary(BASE_PARAMS);

      const callArgs = mockGenerateContent.mock.calls[0];
      const prompt = JSON.stringify(callArgs);
      expect(prompt).toContain('reinforce the sea walls');
    });
  });

  describe('markdown fence cleaning', () => {
    it('strips ```json fences from the response before parsing', async () => {
      mockSuccessWithFences(VALID_SUMMARY);

      const result = await generatePostCallSummary(BASE_PARAMS);

      expect(result).toEqual(VALID_SUMMARY);
    });

    it('strips ``` fences without language tag', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: `\`\`\`\n${JSON.stringify(VALID_SUMMARY)}\n\`\`\``,
      });

      const result = await generatePostCallSummary(BASE_PARAMS);

      expect(result).toEqual(VALID_SUMMARY);
    });
  });

  describe('error handling', () => {
    it('throws a descriptive error on malformed JSON', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: 'this is not json {{{' });

      await expect(generatePostCallSummary(BASE_PARAMS)).rejects.toThrow(
        /post.call summary.*malformed|failed to parse|invalid json/i,
      );
    });

    it('throws a descriptive error when response text is empty', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: '' });

      await expect(generatePostCallSummary(BASE_PARAMS)).rejects.toThrow();
    });

    it('throws a descriptive error when response text is null', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: null });

      await expect(generatePostCallSummary(BASE_PARAMS)).rejects.toThrow();
    });

    it('throws when keyFacts is not an array', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ ...VALID_SUMMARY, keyFacts: 'not an array' }),
      });

      await expect(generatePostCallSummary(BASE_PARAMS)).rejects.toThrow();
    });

    it('throws when suggestedCalls is not an array', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ ...VALID_SUMMARY, suggestedCalls: null }),
      });

      await expect(generatePostCallSummary(BASE_PARAMS)).rejects.toThrow();
    });

    it('propagates Gemini API errors', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Gemini API quota exceeded'));

      await expect(generatePostCallSummary(BASE_PARAMS)).rejects.toThrow('Gemini API quota exceeded');
    });
  });

  describe('empty transcript handling', () => {
    it('succeeds with empty inputTranscript', async () => {
      mockSuccess(VALID_SUMMARY);

      const result = await generatePostCallSummary({
        ...BASE_PARAMS,
        inputTranscript: '',
      });

      expect(result).toEqual(VALID_SUMMARY);
    });

    it('succeeds with empty outputTranscript', async () => {
      mockSuccess(VALID_SUMMARY);

      const result = await generatePostCallSummary({
        ...BASE_PARAMS,
        outputTranscript: '',
      });

      expect(result).toEqual(VALID_SUMMARY);
    });

    it('succeeds with both transcripts empty', async () => {
      mockSuccess(VALID_SUMMARY);

      const result = await generatePostCallSummary({
        ...BASE_PARAMS,
        inputTranscript: '',
        outputTranscript: '',
      });

      expect(result).toEqual(VALID_SUMMARY);
    });
  });
});
