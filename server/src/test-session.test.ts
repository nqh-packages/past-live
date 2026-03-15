/**
 * Tests for test-session.ts — text-only conversation test endpoint
 * TDD: tests written before implementation.
 * Verifies: route validation, scenario/topic routing, custom messages, error propagation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock ai-client before importing module under test ────────────────────────

const mockGenerateContent = vi.fn();

vi.mock('./ai-client.js', () => ({
  getAI: vi.fn(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

import { testSessionRoute } from './test-session.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUCCESS_TEXT = 'The harbor chain holds. What do you advise?';

async function post(body: Record<string, unknown>) {
  return testSessionRoute.request('/test-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('testSessionRoute POST /test-session', () => {
  // resetAllMocks clears both call history AND once-queues (unlike clearAllMocks)
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('validation', () => {
    it('returns 400 when both scenarioId and topic are missing', async () => {
      const res = await post({});
      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/scenarioId|topic/i);
    });

    it('returns 400 when both scenarioId and topic are provided', async () => {
      const res = await post({ scenarioId: 'constantinople-1453', topic: 'French Revolution' });
      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/exactly one/i);
    });

    it('returns 400 for invalid JSON body', async () => {
      const res = await testSessionRoute.request('/test-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json{{{',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('with scenarioId', () => {
    it('returns 200 with characterResponse when scenarioId is valid', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: SUCCESS_TEXT });
      const res = await post({ scenarioId: 'constantinople-1453' });
      expect(res.status).toBe(200);
      const body = await res.json() as { characterResponse: string };
      expect(typeof body.characterResponse).toBe('string');
      expect(body.characterResponse.length).toBeGreaterThan(0);
    });

    it('returns scenarioId in response when provided', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: SUCCESS_TEXT });
      const res = await post({ scenarioId: 'constantinople-1453' });
      const body = await res.json() as { scenarioId: string };
      expect(body.scenarioId).toBe('constantinople-1453');
    });

    it('returns systemPrompt string in response', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: SUCCESS_TEXT });
      const res = await post({ scenarioId: 'constantinople-1453' });
      const body = await res.json() as { systemPrompt: string };
      expect(typeof body.systemPrompt).toBe('string');
      expect(body.systemPrompt.length).toBeGreaterThan(0);
    });

    it('uses getScenario system prompt (includes Constantinople framing)', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: SUCCESS_TEXT });
      await post({ scenarioId: 'constantinople-1453' });
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const systemInstruction = JSON.stringify(
        callArgs.config?.systemInstruction ?? callArgs.systemInstruction ?? callArgs,
      );
      expect(systemInstruction).toMatch(/constantine|constantinople|byzantine/i);
    });

    it('returns 400 for unknown scenarioId', async () => {
      const res = await post({ scenarioId: 'nonexistent-scenario' });
      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/unknown scenario/i);
    });
  });

  describe('with topic', () => {
    it('returns 200 with characterResponse when topic is provided', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: 'The revolution has begun.' });
      const res = await post({ topic: 'French Revolution' });
      expect(res.status).toBe(200);
      const body = await res.json() as { characterResponse: string };
      expect(typeof body.characterResponse).toBe('string');
    });

    it('returns systemPrompt string when using open topic', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: 'The revolution has begun.' });
      const res = await post({ topic: 'French Revolution' });
      const body = await res.json() as { systemPrompt: string };
      expect(typeof body.systemPrompt).toBe('string');
      expect(body.systemPrompt.length).toBeGreaterThan(0);
    });

    it('uses buildOpenTopicPrompt (includes topic text in system instruction)', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: 'The revolution has begun.' });
      await post({ topic: 'French Revolution' });
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const systemInstruction = JSON.stringify(
        callArgs.config?.systemInstruction ?? callArgs.systemInstruction ?? callArgs,
      );
      expect(systemInstruction).toMatch(/french revolution/i);
    });

    it('does not include scenarioId in response when topic is used', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: 'The revolution has begun.' });
      const res = await post({ topic: 'French Revolution' });
      const body = await res.json() as Record<string, unknown>;
      expect(body.scenarioId).toBeUndefined();
    });
  });

  describe('with custom studentMessage', () => {
    it('uses studentMessage as the user content sent to Gemini', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: 'A bold suggestion, stranger.' });
      const studentMessage = 'Tell me about the harbor chain strategy.';
      await post({ scenarioId: 'moon-landing-1969', studentMessage });
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const contents = JSON.stringify(callArgs.contents ?? callArgs);
      expect(contents).toContain(studentMessage);
    });

    it('uses default greeting when studentMessage is not provided', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: 'A bold suggestion, stranger.' });
      await post({ scenarioId: 'moon-landing-1969' });
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const contents = JSON.stringify(callArgs.contents ?? callArgs);
      expect(contents).toMatch(/hello|calling|situation/i);
    });
  });

  describe('error handling', () => {
    it('returns 500 when Gemini API throws', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Gemini quota exceeded'));
      const res = await post({ scenarioId: 'constantinople-1453' });
      expect(res.status).toBe(500);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/gemini|failed/i);
    });

    it('returns error detail string in 500 response', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Rate limit hit'));
      const res = await post({ scenarioId: 'constantinople-1453' });
      const body = await res.json() as { error: string; detail: string };
      expect(typeof body.detail).toBe('string');
    });

    it('returns 500 when Gemini returns empty text', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: '' });
      const res = await post({ topic: 'Roman Empire' });
      expect(res.status).toBe(500);
    });
  });

  describe('response shape', () => {
    it('always includes characterResponse and systemPrompt fields', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: 'I am here.' });
      const res = await post({ topic: 'Roman Empire' });
      const body = await res.json() as Record<string, unknown>;
      expect('characterResponse' in body).toBe(true);
      expect('systemPrompt' in body).toBe(true);
    });
  });
});
