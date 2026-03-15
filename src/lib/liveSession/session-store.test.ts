/**
 * @what - Tests for sessionStorage-backed session persistence
 * @why - Verify browser backup survives tab refresh during reconnect
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { persistSession, loadSession, clearPersistedSession } from './session-store';
import type { PersistedSession } from './session-store';

// ─── SSR guard (no sessionStorage) ─────────────────────────────────────────

describe('session-store in SSR environment (no sessionStorage)', () => {
  let original: typeof globalThis.sessionStorage;

  beforeEach(() => {
    original = globalThis.sessionStorage;
    // @ts-expect-error - simulating SSR where sessionStorage is undefined
    delete globalThis.sessionStorage;
  });

  afterEach(() => {
    globalThis.sessionStorage = original;
  });

  it('persistSession does not throw when sessionStorage is unavailable', () => {
    expect(() =>
      persistSession({ sessionId: 'x', characterName: 'Gene Kranz', startTime: 0 }),
    ).not.toThrow();
  });

  it('loadSession returns null when sessionStorage is unavailable', () => {
    expect(loadSession()).toBeNull();
  });

  it('clearPersistedSession does not throw when sessionStorage is unavailable', () => {
    expect(() => clearPersistedSession()).not.toThrow();
  });
});

// ─── Normal browser environment ─────────────────────────────────────────────

describe('session-store', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  const baseSession: PersistedSession = {
    sessionId: 'sess-123',
    characterName: 'Constantine XI',
    startTime: 1710000000000,
  };

  describe('persistSession', () => {
    it('saves session to sessionStorage', () => {
      persistSession(baseSession);
      const raw = sessionStorage.getItem('past-live:active-session');
      expect(raw).not.toBeNull();
    });

    it('stores all required fields', () => {
      persistSession(baseSession);
      const loaded = loadSession();
      expect(loaded?.sessionId).toBe('sess-123');
      expect(loaded?.characterName).toBe('Constantine XI');
      expect(loaded?.startTime).toBe(1710000000000);
    });

    it('stores optional scenarioId when provided', () => {
      persistSession({ ...baseSession, scenarioId: 'constantinople-1453' });
      const loaded = loadSession();
      expect(loaded?.scenarioId).toBe('constantinople-1453');
    });

    it('stores optional topic when provided', () => {
      persistSession({ ...baseSession, topic: 'moon landing' });
      const loaded = loadSession();
      expect(loaded?.topic).toBe('moon landing');
    });

    it('overwrites previous persisted session on second call', () => {
      persistSession(baseSession);
      persistSession({ ...baseSession, sessionId: 'sess-456' });
      const loaded = loadSession();
      expect(loaded?.sessionId).toBe('sess-456');
    });
  });

  describe('loadSession', () => {
    it('returns null when nothing is stored', () => {
      expect(loadSession()).toBeNull();
    });

    it('reads back exactly what was persisted', () => {
      const session: PersistedSession = {
        sessionId: 'sess-789',
        characterName: 'Jamukha',
        scenarioId: 'mongol-empire-1206',
        topic: undefined,
        startTime: 1710000001234,
      };
      persistSession(session);
      const loaded = loadSession();
      expect(loaded?.sessionId).toBe('sess-789');
      expect(loaded?.characterName).toBe('Jamukha');
      expect(loaded?.scenarioId).toBe('mongol-empire-1206');
      expect(loaded?.startTime).toBe(1710000001234);
    });

    it('returns null when sessionStorage contains invalid JSON', () => {
      sessionStorage.setItem('past-live:active-session', 'not-valid-json{');
      expect(loadSession()).toBeNull();
    });
  });

  describe('clearPersistedSession', () => {
    it('removes the session key from sessionStorage', () => {
      persistSession(baseSession);
      clearPersistedSession();
      expect(sessionStorage.getItem('past-live:active-session')).toBeNull();
    });

    it('does not throw when no session is stored', () => {
      expect(() => clearPersistedSession()).not.toThrow();
    });

    it('loadSession returns null after clear', () => {
      persistSession(baseSession);
      clearPersistedSession();
      expect(loadSession()).toBeNull();
    });
  });
});
