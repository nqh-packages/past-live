/**
 * Tests for session-persistence.ts — fire-and-forget Firestore session lifecycle docs
 * Mocks ./firestore.js to avoid real Firestore calls.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ─── Firestore mock setup ──────────────────────────────────────────────────────

const mockSet = vi.fn();
const mockUpdate = vi.fn();

const mockDocRef = {
  set: mockSet,
  update: mockUpdate,
};

const mockCollectionRef = {
  doc: vi.fn(() => mockDocRef),
};

const mockDb = {
  collection: vi.fn(() => mockCollectionRef),
};

vi.mock('./firestore.js', () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock('@google-cloud/firestore', () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => ({ _type: 'serverTimestamp' })),
    arrayUnion: vi.fn((...items: unknown[]) => ({ _type: 'arrayUnion', items })),
  },
}));

// ─── Import after mock ────────────────────────────────────────────────────────

import {
  createSession,
  updateSession,
  appendTranscriptTurn,
} from './session-persistence.js';
import type { TranscriptTurn } from './session-persistence.js';
import { getDb } from './firestore.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_CREATE_PARAMS = {
  sessionId: 'session-abc',
  characterName: 'Constantine XI',
  historicalSetting: 'Constantinople, 1453',
};

const TRANSCRIPT_TURN: TranscriptTurn = {
  speaker: 'Constantine XI',
  text: 'The walls are holding — for now.',
  ts: 1710000000000,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('createSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as Mock).mockReturnValue(mockDb);
    mockSet.mockResolvedValue(undefined);
  });

  it('writes the session doc to the sessions collection', async () => {
    await createSession(BASE_CREATE_PARAMS);

    expect(mockDb.collection).toHaveBeenCalledWith('sessions');
    expect(mockCollectionRef.doc).toHaveBeenCalledWith('session-abc');
    expect(mockSet).toHaveBeenCalledOnce();
  });

  it('writes status active, transcriptTurns empty array, and reconnectCount 0', async () => {
    await createSession(BASE_CREATE_PARAMS);

    const [data] = (mockSet as Mock).mock.calls[0] as [Record<string, unknown>];
    expect(data['status']).toBe('active');
    expect(data['transcriptTurns']).toEqual([]);
    expect(data['reconnectCount']).toBe(0);
    expect(data).toHaveProperty('startedAt');
  });

  it('includes characterName and historicalSetting in the doc', async () => {
    await createSession(BASE_CREATE_PARAMS);

    const [data] = (mockSet as Mock).mock.calls[0] as [Record<string, unknown>];
    expect(data['characterName']).toBe('Constantine XI');
    expect(data['historicalSetting']).toBe('Constantinople, 1453');
  });

  it('includes optional userId when provided', async () => {
    await createSession({ ...BASE_CREATE_PARAMS, userId: 'user-xyz' });

    const [data] = (mockSet as Mock).mock.calls[0] as [Record<string, unknown>];
    expect(data['userId']).toBe('user-xyz');
  });

  it('includes optional scenarioId and topic when provided', async () => {
    await createSession({
      ...BASE_CREATE_PARAMS,
      scenarioId: 'constantinople-1453',
      topic: 'the fall',
    });

    const [data] = (mockSet as Mock).mock.calls[0] as [Record<string, unknown>];
    expect(data['scenarioId']).toBe('constantinople-1453');
    expect(data['topic']).toBe('the fall');
  });

  it('silently skips when getDb returns null', async () => {
    (getDb as Mock).mockReturnValueOnce(null);

    await createSession(BASE_CREATE_PARAMS);

    expect(mockSet).not.toHaveBeenCalled();
  });

  it('does not throw when Firestore set fails', async () => {
    mockSet.mockRejectedValueOnce(new Error('Write quota exceeded'));

    await expect(createSession(BASE_CREATE_PARAMS)).resolves.toBeUndefined();
  });
});

describe('updateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as Mock).mockReturnValue(mockDb);
    mockUpdate.mockResolvedValue(undefined);
  });

  it('calls update on the correct session doc', async () => {
    await updateSession('session-abc', { status: 'ended' });

    expect(mockDb.collection).toHaveBeenCalledWith('sessions');
    expect(mockCollectionRef.doc).toHaveBeenCalledWith('session-abc');
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it('passes the provided data fields to update', async () => {
    await updateSession('session-abc', { status: 'ended', durationMs: 42000 });

    const [data] = (mockUpdate as Mock).mock.calls[0] as [Record<string, unknown>];
    expect(data['status']).toBe('ended');
    expect(data['durationMs']).toBe(42000);
  });

  it('silently skips when getDb returns null', async () => {
    (getDb as Mock).mockReturnValueOnce(null);

    await updateSession('session-abc', { status: 'ended' });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('does not throw when Firestore update fails', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('Permission denied'));

    await expect(updateSession('session-abc', { status: 'ended' })).resolves.toBeUndefined();
  });
});

describe('appendTranscriptTurn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as Mock).mockReturnValue(mockDb);
    mockUpdate.mockResolvedValue(undefined);
  });

  it('calls update on the correct session doc', async () => {
    await appendTranscriptTurn('session-abc', TRANSCRIPT_TURN);

    expect(mockDb.collection).toHaveBeenCalledWith('sessions');
    expect(mockCollectionRef.doc).toHaveBeenCalledWith('session-abc');
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it('uses FieldValue.arrayUnion for the transcriptTurns field', async () => {
    await appendTranscriptTurn('session-abc', TRANSCRIPT_TURN);

    const [data] = (mockUpdate as Mock).mock.calls[0] as [Record<string, unknown>];
    // arrayUnion is mocked to return a sentinel object — verify it was called with the turn
    expect(data).toHaveProperty('transcriptTurns');
    const sentinel = data['transcriptTurns'] as { _type: string; items: unknown[] };
    expect(sentinel._type).toBe('arrayUnion');
    expect(sentinel.items).toContainEqual(TRANSCRIPT_TURN);
  });

  it('silently skips when getDb returns null', async () => {
    (getDb as Mock).mockReturnValueOnce(null);

    await appendTranscriptTurn('session-abc', TRANSCRIPT_TURN);

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('does not throw when Firestore update fails', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('Firestore connection refused'));

    await expect(appendTranscriptTurn('session-abc', TRANSCRIPT_TURN)).resolves.toBeUndefined();
  });
});
