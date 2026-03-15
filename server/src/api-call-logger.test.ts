/**
 * Tests for api-call-logger.ts — fire-and-forget Firestore API call logging
 * Mocks ./firestore.js to avoid real Firestore calls.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ─── Firestore mock setup ──────────────────────────────────────────────────────

const mockAdd = vi.fn();
const mockUpdate = vi.fn();

const mockDocRef = { update: mockUpdate };
const mockCollectionRef = {
  add: mockAdd,
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

import { logApiCall, completeApiCall } from './api-call-logger.js';
import { getDb } from './firestore.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_PARAMS = {
  sessionId: 'session-abc',
  type: 'live_connect' as const,
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('logApiCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as Mock).mockReturnValue(mockDb);
    mockAdd.mockResolvedValue({ id: 'doc-123' });
  });

  it('creates a doc in the api_calls collection', async () => {
    await logApiCall(BASE_PARAMS);

    expect(mockDb.collection).toHaveBeenCalledWith('api_calls');
    expect(mockAdd).toHaveBeenCalledOnce();
  });

  it('writes status started and all required fields', async () => {
    await logApiCall(BASE_PARAMS);

    const [data] = (mockAdd as Mock).mock.calls[0] as [Record<string, unknown>];
    expect(data['status']).toBe('started');
    expect(data['sessionId']).toBe('session-abc');
    expect(data['type']).toBe('live_connect');
    expect(data['model']).toBe('gemini-2.5-flash-native-audio-preview-12-2025');
    expect(data).toHaveProperty('startedAt');
  });

  it('returns the Firestore doc ID', async () => {
    const id = await logApiCall(BASE_PARAMS);

    expect(id).toBe('doc-123');
  });

  it('includes optional userId when provided', async () => {
    await logApiCall({ ...BASE_PARAMS, userId: 'user-xyz' });

    const [data] = (mockAdd as Mock).mock.calls[0] as [Record<string, unknown>];
    expect(data['userId']).toBe('user-xyz');
  });

  it('includes optional metadata when provided', async () => {
    await logApiCall({ ...BASE_PARAMS, metadata: { scenarioId: 'moon-landing' } });

    const [data] = (mockAdd as Mock).mock.calls[0] as [Record<string, unknown>];
    expect(data['metadata']).toEqual({ scenarioId: 'moon-landing' });
  });

  it('returns empty string when getDb returns null', async () => {
    (getDb as Mock).mockReturnValueOnce(null);

    const id = await logApiCall(BASE_PARAMS);

    expect(id).toBe('');
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('returns empty string and does not throw when Firestore add fails', async () => {
    mockAdd.mockRejectedValueOnce(new Error('Quota exceeded'));

    const id = await logApiCall(BASE_PARAMS);

    expect(id).toBe('');
  });
});

describe('completeApiCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as Mock).mockReturnValue(mockDb);
    mockUpdate.mockResolvedValue(undefined);
  });

  it('updates the doc with status completed and endedAt', async () => {
    await completeApiCall('doc-123', { status: 'completed', durationMs: 850 });

    expect(mockDb.collection).toHaveBeenCalledWith('api_calls');
    expect(mockCollectionRef.doc).toHaveBeenCalledWith('doc-123');
    expect(mockUpdate).toHaveBeenCalledOnce();

    const [data] = (mockUpdate as Mock).mock.calls[0] as [Record<string, unknown>];
    expect(data['status']).toBe('completed');
    expect(data['durationMs']).toBe(850);
    expect(data).toHaveProperty('endedAt');
  });

  it('updates the doc with status failed and optional error', async () => {
    await completeApiCall('doc-123', { status: 'failed', error: 'Gemini 1011' });

    const [data] = (mockUpdate as Mock).mock.calls[0] as [Record<string, unknown>];
    expect(data['status']).toBe('failed');
    expect(data['error']).toBe('Gemini 1011');
  });

  it('silently skips when docId is empty string', async () => {
    await completeApiCall('', { status: 'completed' });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('does not throw when Firestore update fails', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('Network error'));

    await expect(completeApiCall('doc-123', { status: 'completed' })).resolves.toBeUndefined();
  });

  it('silently skips when getDb returns null', async () => {
    (getDb as Mock).mockReturnValueOnce(null);

    await completeApiCall('doc-123', { status: 'completed' });

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
