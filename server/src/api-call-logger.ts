/**
 * @what - Fire-and-forget Firestore logger for every Gemini API call
 * @why - Every API call costs money and needs an audit trail. Zero calls were logged
 *   before this module — no cost tracking, no failure attribution, no userId coupling.
 * @exports - logApiCall, completeApiCall, ApiCallType, ApiCallLogParams
 */

import { FieldValue } from '@google-cloud/firestore';
import { getDb } from './firestore.js';
import { logger } from './logger.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApiCallType =
  | 'live_connect'
  | 'live_reconnect'
  | 'flash_metadata'
  | 'flash_summary'
  | 'image_gen'
  | 'extract_topic';

export interface ApiCallLogParams {
  sessionId: string;
  userId?: string;
  type: ApiCallType;
  model: string;
  metadata?: Record<string, unknown>;
}

// ─── Collection ───────────────────────────────────────────────────────────────

const COLLECTION = 'api_calls';

// ─── Functions ────────────────────────────────────────────────────────────────

/**
 * Logs the start of a Gemini API call to Firestore.
 *
 * Returns the Firestore doc ID for later completion via `completeApiCall`.
 * Fire-and-forget — never throws. Returns empty string on any failure so callers
 * can unconditionally pass the result to `completeApiCall` (which skips on '').
 */
export async function logApiCall(params: ApiCallLogParams): Promise<string> {
  try {
    const db = getDb();
    if (!db) return '';

    const ref = await db.collection(COLLECTION).add({
      ...params,
      status: 'started',
      startedAt: FieldValue.serverTimestamp(),
    });

    return ref.id;
  } catch (err) {
    logger.warn(
      { event: 'api_call_log_failed', err, ...params },
      'Failed to log API call start',
    );
    return '';
  }
}

/**
 * Marks a previously started API call doc as completed or failed.
 *
 * Fire-and-forget — never throws. Silently skips when `docId` is empty string
 * (returned by `logApiCall` on failure), so the caller needs no guard.
 */
export async function completeApiCall(
  docId: string,
  params: {
    status: 'completed' | 'failed';
    durationMs?: number;
    error?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  if (!docId) return;

  try {
    const db = getDb();
    if (!db) return;

    await db.collection(COLLECTION).doc(docId).set({
      ...params,
      endedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    logger.warn(
      { event: 'api_call_complete_failed', err, docId },
      'Failed to log API call completion',
    );
  }
}
