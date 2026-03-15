/**
 * Tests for relay-registry.ts — module-level relay handle store
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock session-persistence before importing registry (dynamic import in forceAbandon)
vi.mock('./session-persistence.js', () => ({
  updateSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { register, lookup, detachBrowser, reattachBrowser, remove, _handleCount } from './relay-registry.js';
import type { RelayHandle } from './relay-registry.js';
import type { WSContext } from 'hono/ws';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWs(): WSContext {
  return { send: vi.fn(), close: vi.fn() } as unknown as WSContext;
}

function makeHandle(ws: WSContext | null = null): RelayHandle {
  return {
    state: {
      session: { close: vi.fn() },
      sessionId: 'test-session',
      characterName: 'Constantine XI',
      historicalSetting: 'Constantinople, 1453',
      studentId: undefined,
      scenarioId: 'constantinople-1453',
      sessionStartMs: Date.now(),
      outputTranscripts: [],
      inputTranscripts: [],
      timeline: [],
      wrapUpTimer: null,
      forceCloseTimer: null,
    },
    browserWs: ws,
    abandonTimer: null,
    detachedAt: null,
  };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('relay-registry', () => {
  describe('register and lookup', () => {
    it('returns null for unknown sessionId', () => {
      expect(lookup('nonexistent-session-xyz')).toBeNull();
    });

    it('returns handle after register', () => {
      const ws = makeWs();
      const handle = makeHandle(ws);
      register('sess-register-1', handle);

      const found = lookup('sess-register-1');
      expect(found).toBe(handle);
      remove('sess-register-1');
    });

    it('returns the same handle reference (not a copy)', () => {
      const handle = makeHandle();
      register('sess-ref-1', handle);
      const found = lookup('sess-ref-1');
      expect(found).toBe(handle); // same object, mutations are visible
      remove('sess-ref-1');
    });
  });

  describe('remove', () => {
    it('lookup returns null after remove', () => {
      const handle = makeHandle();
      register('sess-remove-1', handle);
      remove('sess-remove-1');
      expect(lookup('sess-remove-1')).toBeNull();
    });

    it('silently ignores remove for unknown sessionId', () => {
      expect(() => remove('nonexistent-remove-xyz')).not.toThrow();
    });
  });

  describe('detachBrowser', () => {
    it('sets browserWs to null', () => {
      const ws = makeWs();
      const handle = makeHandle(ws);
      register('sess-detach-1', handle);

      detachBrowser('sess-detach-1');

      expect(handle.browserWs).toBeNull();
      remove('sess-detach-1');
    });

    it('records detachedAt timestamp', () => {
      const before = Date.now();
      const ws = makeWs();
      const handle = makeHandle(ws);
      register('sess-detach-ts', handle);

      detachBrowser('sess-detach-ts');

      expect(handle.detachedAt).not.toBeNull();
      expect(handle.detachedAt!).toBeGreaterThanOrEqual(before);
      remove('sess-detach-ts');
    });

    it('starts an abandon timer', () => {
      vi.useFakeTimers();
      const ws = makeWs();
      const handle = makeHandle(ws);
      register('sess-detach-timer', handle);

      detachBrowser('sess-detach-timer');

      expect(handle.abandonTimer).not.toBeNull();
      vi.useRealTimers();
      remove('sess-detach-timer');
    });

    it('silently ignores detach for unknown sessionId', () => {
      expect(() => detachBrowser('nonexistent-detach-xyz')).not.toThrow();
    });

    it('replaces existing abandon timer on repeated detach', () => {
      vi.useFakeTimers();
      const ws = makeWs();
      const handle = makeHandle(ws);
      register('sess-detach-repeat', handle);

      detachBrowser('sess-detach-repeat');
      const firstTimer = handle.abandonTimer;

      // Simulate browser reconnecting and disconnecting again
      handle.browserWs = makeWs();
      detachBrowser('sess-detach-repeat');

      expect(handle.abandonTimer).not.toBe(firstTimer);
      vi.useRealTimers();
      remove('sess-detach-repeat');
    });
  });

  describe('reattachBrowser', () => {
    it('sets new browserWs on the handle', () => {
      const oldWs = makeWs();
      const newWs = makeWs();
      const handle = makeHandle(oldWs);
      register('sess-reattach-1', handle);

      detachBrowser('sess-reattach-1');
      expect(handle.browserWs).toBeNull();

      reattachBrowser('sess-reattach-1', newWs);
      expect(handle.browserWs).toBe(newWs);
      remove('sess-reattach-1');
    });

    it('cancels the abandon timer on reattach', () => {
      vi.useFakeTimers();
      const ws = makeWs();
      const handle = makeHandle(ws);
      register('sess-reattach-timer', handle);

      detachBrowser('sess-reattach-timer');
      expect(handle.abandonTimer).not.toBeNull();

      reattachBrowser('sess-reattach-timer', makeWs());
      expect(handle.abandonTimer).toBeNull();

      vi.useRealTimers();
      remove('sess-reattach-timer');
    });

    it('clears detachedAt on reattach', () => {
      const ws = makeWs();
      const handle = makeHandle(ws);
      register('sess-reattach-ts', handle);

      detachBrowser('sess-reattach-ts');
      expect(handle.detachedAt).not.toBeNull();

      reattachBrowser('sess-reattach-ts', makeWs());
      expect(handle.detachedAt).toBeNull();
      remove('sess-reattach-ts');
    });

    it('silently ignores reattach for unknown sessionId', () => {
      expect(() => reattachBrowser('nonexistent-reattach-xyz', makeWs())).not.toThrow();
    });

    it('does NOT invoke abandon after reattach even when timer would have fired', async () => {
      vi.useFakeTimers();
      const ws = makeWs();
      const handle = makeHandle(ws);
      register('sess-reattach-no-abandon', handle);

      detachBrowser('sess-reattach-no-abandon');
      reattachBrowser('sess-reattach-no-abandon', makeWs());

      // Advance past the 180s TTL — abandon should NOT fire
      await vi.advanceTimersByTimeAsync(200_000);
      // Handle should still exist
      expect(lookup('sess-reattach-no-abandon')).not.toBeNull();

      vi.useRealTimers();
      remove('sess-reattach-no-abandon');
    });
  });

  describe('abandon timer fires after TTL', () => {
    it('removes handle from registry when abandon timer fires', async () => {
      vi.useFakeTimers();
      const ws = makeWs();
      const handle = makeHandle(ws);
      register('sess-abandon-ttl', handle);

      detachBrowser('sess-abandon-ttl');
      expect(lookup('sess-abandon-ttl')).not.toBeNull();

      // Advance past 180s TTL
      await vi.advanceTimersByTimeAsync(181_000);

      expect(lookup('sess-abandon-ttl')).toBeNull();
      vi.useRealTimers();
    });

    it('closes Gemini session when abandon timer fires', async () => {
      vi.useFakeTimers();
      const ws = makeWs();
      const handle = makeHandle(ws);
      const closeSpy = handle.state.session!.close as ReturnType<typeof vi.fn>;
      register('sess-abandon-close', handle);

      detachBrowser('sess-abandon-close');
      await vi.advanceTimersByTimeAsync(181_000);

      expect(closeSpy).toHaveBeenCalledOnce();
      vi.useRealTimers();
    });
  });
});
