/**
 * @what - Fire-and-forget Firestore writer for session lifecycle events
 * @why - Sessions were ephemeral before this module — a server crash lost all context.
 *   Persistent docs enable reconnection context replay, post-mortem analysis, and
 *   future session history features without blocking or crashing live sessions.
 * @exports - createSession, updateSession, appendTranscriptTurn, getSessionSummary,
 *   TranscriptTurn, CreateSessionParams
 */

import { FieldValue } from '@google-cloud/firestore';
import { getDb } from './firestore.js';
import { logger } from './logger.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TranscriptTurn {
  speaker: string;
  text: string;
  /** Unix timestamp in milliseconds. */
  ts: number;
}

export interface CreateSessionParams {
  sessionId: string;
  /** null for anonymous users — Firestore rejects undefined but accepts null */
  userId?: string | null;
  characterName: string;
  historicalSetting: string;
  voiceName?: string;
  scenarioId?: string;
  topic?: string;
}

// ─── Collection ───────────────────────────────────────────────────────────────

const COLLECTION = 'sessions';

// ─── Functions ────────────────────────────────────────────────────────────────

/**
 * Creates a session document in Firestore at session start.
 *
 * Initialises status, empty transcript, and reconnect counter.
 * Fire-and-forget — never throws. Firestore failures are logged as warnings only.
 */
export async function createSession(params: CreateSessionParams): Promise<void> {
  try {
    const db = getDb();
    if (!db) return;

    // Strip undefined fields — Firestore rejects them (null is allowed, undefined is not)
    const doc = Object.fromEntries(
      Object.entries({ ...params, status: 'active', startedAt: FieldValue.serverTimestamp(), transcriptTurns: [], reconnectCount: 0 })
        .filter(([, v]) => v !== undefined),
    );
    await db.collection(COLLECTION).doc(params.sessionId).set(doc);
  } catch (err) {
    logger.warn(
      { event: 'session_create_failed', err, sessionId: params.sessionId },
      'Failed to create session doc',
    );
  }
}

/**
 * Patches arbitrary fields on an existing session document.
 *
 * Used for status transitions (active → ended), duration writes, reconnect counts, etc.
 * Fire-and-forget — never throws.
 */
export async function updateSession(
  sessionId: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (!sessionId) {
    logger.warn(
      { event: 'session_update_skipped', reason: 'empty_session_id', data },
      'Skipped session update — empty sessionId (Firestore rejects empty doc IDs)',
    );
    return;
  }

  try {
    const db = getDb();
    if (!db) return;

    await db.collection(COLLECTION).doc(sessionId).set(data, { merge: true });
  } catch (err) {
    logger.warn(
      { event: 'session_update_failed', err, sessionId },
      'Failed to update session doc',
    );
  }
}

/**
 * Appends a single transcript turn to the session's transcriptTurns array.
 *
 * Uses Firestore arrayUnion to avoid overwriting concurrent writes.
 * Fire-and-forget — never throws. Transcript loss is acceptable; session crash is not.
 */
/**
 * Reads a session document and returns its summary data if available.
 * Returns null if session not found or no summary persisted.
 */
export async function getSessionSummary(
  sessionId: string,
): Promise<Record<string, unknown> | null> {
  if (!sessionId) return null;

  try {
    const db = getDb();
    if (!db) return null;

    const doc = await db.collection(COLLECTION).doc(sessionId).get();
    if (!doc.exists) return null;

    const data = doc.data();
    if (!data?.['summary']) return null;

    return {
      summary: data['summary'],
      characterName: data['characterName'] ?? '',
      historicalSetting: data['historicalSetting'] ?? '',
      durationMs: data['durationMs'] ?? 0,
      status: data['status'] ?? 'unknown',
    };
  } catch (err) {
    logger.warn(
      { event: 'session_read_failed', err, sessionId },
      'Failed to read session doc',
    );
    return null;
  }
}

export async function appendTranscriptTurn(
  sessionId: string,
  turn: TranscriptTurn,
): Promise<void> {
  if (!sessionId) return;

  try {
    const db = getDb();
    if (!db) return;

    await db.collection(COLLECTION).doc(sessionId).set({
      transcriptTurns: FieldValue.arrayUnion(turn),
    }, { merge: true });
  } catch (err) {
    logger.warn(
      { event: 'transcript_append_failed', err, sessionId },
      'Failed to append transcript turn',
    );
  }
}
