/**
 * Tests for relay-hooks.ts — session lifecycle hooks for relay.ts
 * Mocks firestore.ts to avoid real Firestore calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('./firestore.js', () => ({
  addCallToProfile: vi.fn().mockResolvedValue(undefined),
}));

import { onSessionEnd } from './relay-hooks.js';
import { addCallToProfile } from './firestore.js';
import type { PostCallSummary } from './post-call-summary.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_SUMMARY: PostCallSummary = {
  keyFacts: ['The harbor chain held the strait.'],
  outcomeComparison: 'The city fell on May 29, 1453.',
  characterMessage: 'You asked the right questions.',
  suggestedCalls: [{ name: 'Mehmed II', era: 'Ottoman, 1453', hook: 'I built the cannons.' }],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('onSessionEnd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls addCallToProfile when studentId is provided with summary', async () => {
    await onSessionEnd({
      studentId: 'student-123',
      characterName: 'Constantine XI',
      historicalSetting: 'Constantinople, 1453',
      duration: 300,
      summary: BASE_SUMMARY,
      scenarioId: 'constantinople-1453',
    });

    expect(addCallToProfile).toHaveBeenCalledOnce();
    const [id, call] = (addCallToProfile as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(id).toBe('student-123');
    expect(call['characterName']).toBe('Constantine XI');
    expect(call['scenarioId']).toBe('constantinople-1453');
    expect(call['duration']).toBe(300);
  });

  it('does nothing when studentId is undefined', async () => {
    await onSessionEnd({
      studentId: undefined,
      characterName: 'Constantine XI',
      historicalSetting: 'Constantinople, 1453',
      duration: 300,
    });

    expect(addCallToProfile).not.toHaveBeenCalled();
  });

  it('resolves without throwing when studentId is provided but no summary', async () => {
    await expect(
      onSessionEnd({
        studentId: 'student-456',
        characterName: 'Gene Kranz',
        historicalSetting: 'Moon Landing, 1969',
        duration: 180,
        scenarioId: 'moon-landing-1969',
      }),
    ).resolves.toBeUndefined();

    expect(addCallToProfile).toHaveBeenCalledOnce();
  });

  it('uses agentInsight from summary characterMessage when available', async () => {
    await onSessionEnd({
      studentId: 'student-123',
      characterName: 'Constantine XI',
      historicalSetting: 'Constantinople, 1453',
      duration: 420,
      summary: BASE_SUMMARY,
      scenarioId: 'constantinople-1453',
    });

    const [, call] = (addCallToProfile as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(call['agentInsight']).toBe(BASE_SUMMARY.characterMessage);
  });

  it('uses empty string for agentInsight when no summary provided', async () => {
    await onSessionEnd({
      studentId: 'student-123',
      characterName: 'Jamukha',
      historicalSetting: 'Mongol Empire, 1206',
      duration: 120,
      scenarioId: 'mongol-empire-1206',
    });

    const [, call] = (addCallToProfile as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(call['agentInsight']).toBe('');
  });

  it('catches and swallows Firestore errors — relay must not crash', async () => {
    (addCallToProfile as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Firestore quota exceeded'),
    );

    await expect(
      onSessionEnd({
        studentId: 'student-123',
        characterName: 'Constantine XI',
        historicalSetting: 'Constantinople, 1453',
        duration: 300,
        summary: BASE_SUMMARY,
      }),
    ).resolves.toBeUndefined();
  });
});
