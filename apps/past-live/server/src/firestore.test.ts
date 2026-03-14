/**
 * Tests for firestore.ts — Firestore student profile CRUD
 * Mocks @google-cloud/firestore to avoid real network calls.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ─── Firestore mock setup ──────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();

const mockDocRef = {
  get: mockGet,
  set: mockSet,
  update: mockUpdate,
};

const mockDoc = vi.fn(() => mockDocRef);
const mockCollection = vi.fn(() => ({ doc: mockDoc }));

vi.mock('@google-cloud/firestore', () => ({
  Firestore: vi.fn().mockImplementation(() => ({
    collection: mockCollection,
  })),
  FieldValue: {
    arrayUnion: vi.fn((...items: unknown[]) => ({ _type: 'arrayUnion', items })),
  },
}));

import {
  getProfile,
  upsertProfile,
  addCallToProfile,
} from './firestore.js';
import type { StudentProfile, SessionRecord } from './firestore.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_SESSION: SessionRecord = {
  scenarioId: 'constantinople-1453',
  characterName: 'Constantine XI',
  date: new Date('2026-03-14T10:00:00Z'),
  duration: 420,
  topicsCovered: ['harbor chain', 'land walls'],
  agentInsight: 'You asked the right questions.',
};

const VALID_PROFILE: StudentProfile = {
  id: 'student-123',
  name: 'Huy',
  createdAt: new Date('2026-03-01T00:00:00Z'),
  lastSessionAt: new Date('2026-03-14T10:00:00Z'),
  sessions: [VALID_SESSION],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when document does not exist', async () => {
    mockGet.mockResolvedValueOnce({ exists: false });

    const result = await getProfile('nonexistent-id');

    expect(result).toBeNull();
  });

  it('returns StudentProfile when document exists', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        id: 'student-123',
        name: 'Huy',
        createdAt: VALID_PROFILE.createdAt,
        lastSessionAt: VALID_PROFILE.lastSessionAt,
        sessions: VALID_PROFILE.sessions,
      }),
    });

    const result = await getProfile('student-123');

    expect(result).not.toBeNull();
    expect(result?.id).toBe('student-123');
    expect(result?.name).toBe('Huy');
  });

  it('returns sessions array when profile has sessions', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ ...VALID_PROFILE }),
    });

    const result = await getProfile('student-123');

    expect(Array.isArray(result?.sessions)).toBe(true);
    expect(result?.sessions.length).toBe(1);
  });

  it('logs and returns null when Firestore throws', async () => {
    mockGet.mockRejectedValueOnce(new Error('Firestore unavailable'));

    const result = await getProfile('student-123');

    expect(result).toBeNull();
  });
});

describe('upsertProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls set on the document with provided data', async () => {
    mockSet.mockResolvedValueOnce(undefined);

    await upsertProfile('student-123', { name: 'Huy' });

    expect(mockSet).toHaveBeenCalledOnce();
    const [data, options] = (mockSet as Mock).mock.calls[0] as [Record<string, unknown>, { merge: boolean }];
    expect(data['name']).toBe('Huy');
    expect(options).toEqual({ merge: true });
  });

  it('resolves without error on successful write', async () => {
    mockSet.mockResolvedValueOnce(undefined);

    await expect(upsertProfile('student-456', { name: 'Test' })).resolves.toBeUndefined();
  });

  it('does not throw when Firestore set fails — logs error instead', async () => {
    mockSet.mockRejectedValueOnce(new Error('Write quota exceeded'));

    await expect(upsertProfile('student-123', { name: 'Huy' })).resolves.toBeUndefined();
  });
});

describe('addCallToProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls update with arrayUnion containing the session record', async () => {
    mockUpdate.mockResolvedValueOnce(undefined);

    await addCallToProfile('student-123', VALID_SESSION);

    expect(mockUpdate).toHaveBeenCalledOnce();
    const [data] = (mockUpdate as Mock).mock.calls[0] as [Record<string, unknown>];
    expect(data).toHaveProperty('sessions');
    expect(data).toHaveProperty('lastSessionAt');
  });

  it('resolves without error on successful update', async () => {
    mockUpdate.mockResolvedValueOnce(undefined);

    await expect(addCallToProfile('student-123', VALID_SESSION)).resolves.toBeUndefined();
  });

  it('does not throw when Firestore update fails — logs error instead', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('Firestore connection refused'));

    await expect(addCallToProfile('student-123', VALID_SESSION)).resolves.toBeUndefined();
  });

  it('targets the correct collection and document id', async () => {
    mockUpdate.mockResolvedValueOnce(undefined);

    await addCallToProfile('student-abc', VALID_SESSION);

    expect(mockCollection).toHaveBeenCalledWith('students');
    expect(mockDoc).toHaveBeenCalledWith('student-abc');
  });
});
