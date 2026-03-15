/**
 * @what - Module-level registry of active relay handles, keyed by sessionId
 * @why - When a browser disconnects, the relay and Gemini session must survive
 *   until TTL expires or the browser reconnects. A module-level Map (not per-request
 *   state) is the only structure that outlives a single WS connection in Hono.
 * @exports - register, lookup, detachBrowser, reattachBrowser, remove, RelayHandle
 */

import type { WSContext } from 'hono/ws';
import { logger } from './logger.js';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Minimal relay state needed by the registry.
 * Matches RelayState in relay.ts — the full state object is stored by reference.
 */
export interface RelayStateRef {
  session: { close(): void } | null;
  sessionId: string | null;
  characterName: string;
  historicalSetting: string;
  studentId: string | undefined;
  scenarioId: string | undefined;
  sessionStartMs: number | undefined;
  outputTranscripts: string[];
  inputTranscripts: string[];
  timeline: { ts: number; event: string; detail?: string }[];
  wrapUpTimer: ReturnType<typeof setTimeout> | null;
  forceCloseTimer: ReturnType<typeof setTimeout> | null;
}

export interface RelayHandle {
  /** Full relay state. Passed by reference — mutations in relay.ts are visible here. */
  state: RelayStateRef;
  /** Current browser WS connection — null when browser has disconnected. */
  browserWs: WSContext | null;
  /** Timer that fires TTL_MS after browser disconnects — triggers cleanup. */
  abandonTimer: ReturnType<typeof setTimeout> | null;
  /** Unix ms when browser last disconnected — used for TTL check in scan interval. */
  detachedAt: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** How long to keep a relay alive after browser disconnect before force-closing. */
const ABANDON_TTL_MS = 180_000; // 3 minutes

/**
 * Interval at which the registry scans for handles past their TTL.
 * Acts as a safety net for cases where the abandon timer doesn't fire
 * (e.g., process restart or timer leak).
 */
const SCAN_INTERVAL_MS = 60_000; // 1 minute

// ─── Module-level state ───────────────────────────────────────────────────────

/** Survives individual WS connections. Keyed by sessionId. */
const handles = new Map<string, RelayHandle>();

// ─── Cleanup scan ─────────────────────────────────────────────────────────────

/**
 * Called by `detachBrowser` abandon timer AND by the periodic scan.
 * Closes Gemini, updates Firestore status, removes from registry.
 */
async function forceAbandon(sessionId: string): Promise<void> {
  const handle = handles.get(sessionId);
  if (!handle) return;

  logger.info(
    { event: 'relay_abandon', sessionId, characterName: handle.state.characterName },
    'Relay TTL expired — abandoning session',
  );

  // Close Gemini session to free API quota
  handle.state.session?.close();
  handle.state.session = null;

  // Clear any remaining session timers
  if (handle.state.wrapUpTimer) { clearTimeout(handle.state.wrapUpTimer); handle.state.wrapUpTimer = null; }
  if (handle.state.forceCloseTimer) { clearTimeout(handle.state.forceCloseTimer); handle.state.forceCloseTimer = null; }

  handles.delete(sessionId);

  // Lazily import to avoid circular dep (relay.ts → relay-registry.ts → session-persistence.ts)
  const { updateSession } = await import('./session-persistence.js');
  void updateSession(sessionId, { status: 'abandoned', abandonedAt: new Date() });
}

/** Periodic safety-net scan for handles that missed their abandon timer. */
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, handle] of handles) {
    if (handle.browserWs === null && handle.detachedAt !== null) {
      const age = now - handle.detachedAt;
      if (age > ABANDON_TTL_MS) {
        logger.warn(
          { event: 'relay_scan_abandon', sessionId, ageMs: age },
          'Relay scan found stale detached handle — forcing abandon',
        );
        void forceAbandon(sessionId);
      }
    }
  }
}, SCAN_INTERVAL_MS);

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Registers a newly-created relay handle.
 * Called once per session at the end of handleStart in relay.ts.
 */
export function register(sessionId: string, handle: RelayHandle): void {
  handles.set(sessionId, handle);
  logger.debug({ event: 'relay_registered', sessionId, total: handles.size }, 'Relay registered');
}

/**
 * Returns the handle for a given sessionId, or null if not found.
 */
export function lookup(sessionId: string): RelayHandle | null {
  return handles.get(sessionId) ?? null;
}

/**
 * Called when the browser WS closes unexpectedly (not a graceful hang-up).
 * Sets browserWs to null and starts the abandon timer.
 */
export function detachBrowser(sessionId: string): void {
  const handle = handles.get(sessionId);
  if (!handle) return;

  handle.browserWs = null;
  handle.detachedAt = Date.now();

  // Cancel any previous abandon timer before starting a fresh one
  if (handle.abandonTimer) clearTimeout(handle.abandonTimer);

  handle.abandonTimer = setTimeout(() => {
    void forceAbandon(sessionId);
  }, ABANDON_TTL_MS);

  logger.info(
    { event: 'relay_detached', sessionId, ttlMs: ABANDON_TTL_MS },
    'Browser detached — relay kept alive for reconnect window',
  );
}

/**
 * Called when a browser sends a `resume` message and the session is still alive.
 * Cancels the abandon timer and attaches the new WS as the active browser connection.
 */
export function reattachBrowser(sessionId: string, ws: WSContext): void {
  const handle = handles.get(sessionId);
  if (!handle) return;

  if (handle.abandonTimer) {
    clearTimeout(handle.abandonTimer);
    handle.abandonTimer = null;
  }

  handle.browserWs = ws;
  handle.detachedAt = null;

  logger.info(
    { event: 'relay_reattached', sessionId },
    'Browser reattached — relay resumed',
  );
}

/**
 * Removes the handle from the registry (session fully ended or force-closed).
 */
export function remove(sessionId: string): void {
  const deleted = handles.delete(sessionId);
  if (deleted) {
    logger.debug({ event: 'relay_removed', sessionId, remaining: handles.size }, 'Relay removed from registry');
  }
}

/** Exposed for tests only. */
export function _handleCount(): number {
  return handles.size;
}
