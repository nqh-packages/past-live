/**
 * @what - sessionStorage-backed persistence for the active live session
 * @why - Allows UI to restore state if the tab refreshes during a long reconnect
 * @exports - persistSession, loadSession, clearPersistedSession, PersistedSession
 */

const SESSION_KEY = 'past-live:active-session';

/**
 * Minimal session data needed to restore UI state across a tab refresh.
 * Written on `connected`, updated on `reconnected`, removed on `ended`.
 */
export interface PersistedSession {
  sessionId: string;
  characterName: string;
  /** Present when session started from a scenario card */
  scenarioId?: string;
  /** Present when session started from a free-form topic */
  topic?: string;
  /** Unix timestamp (ms) of session start — used for timer restoration */
  startTime: number;
}

/**
 * Persists session data to sessionStorage.
 * Safe to call in SSR — swallows errors when storage is unavailable.
 */
export function persistSession(data: PersistedSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    /* SSR or storage full — silent, never crash session */
  }
}

/**
 * Loads the persisted session from sessionStorage.
 * Returns null if nothing is stored, storage is unavailable, or JSON is corrupt.
 */
export function loadSession(): PersistedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PersistedSession) : null;
  } catch {
    return null;
  }
}

/**
 * Removes the active session key from sessionStorage.
 * Called on `ended` to prevent stale session restoration.
 * Safe to call in SSR.
 */
export function clearPersistedSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* SSR — silent */
  }
}
