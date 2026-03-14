/**
 * @what - Firestore client and student profile CRUD operations
 * @why - Student profiles enable personalization (character knows who's calling,
 *   references past calls). Satisfies GCP Firestore requirement for hackathon.
 * @exports - getProfile, upsertProfile, addCallToProfile, StudentProfile, SessionRecord
 */

import { Firestore, FieldValue } from '@google-cloud/firestore';
import { logger } from './logger.js';

// ─── Singleton ────────────────────────────────────────────────────────────────

let _db: Firestore | null = null;

function getFirestore(): Firestore {
  if (!_db) {
    _db = new Firestore({
      projectId: process.env['GOOGLE_CLOUD_PROJECT'],
    });
  }
  return _db;
}

// ─── Collection ───────────────────────────────────────────────────────────────

const COLLECTION = 'students';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionRecord {
  scenarioId: string;
  characterName: string;
  date: Date;
  /** Duration in seconds. */
  duration: number;
  topicsCovered: string[];
  /** Character's positive observation about the student, written in character. */
  agentInsight: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  createdAt: Date;
  lastSessionAt: Date;
  sessions: SessionRecord[];
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Fetches a student profile by ID.
 * Returns null if the document does not exist OR if Firestore is unavailable.
 * Errors are logged but never rethrown — callers should treat null as "no profile found".
 */
export async function getProfile(id: string): Promise<StudentProfile | null> {
  try {
    const doc = await getFirestore().collection(COLLECTION).doc(id).get();

    if (!doc.exists) {
      logger.debug(
        { event: 'profile_not_found', code: 'FIRESTORE_GET_001', studentId: id },
        'Student profile not found',
      );
      return null;
    }

    const data = doc.data() as Omit<StudentProfile, 'id'>;
    logger.debug(
      { event: 'profile_fetched', studentId: id },
      'Student profile fetched',
    );
    return { id, ...data };
  } catch (err) {
    logger.error(
      {
        event: 'profile_fetch_failed',
        code: 'FIRESTORE_GET_002',
        err,
        studentId: id,
        action: 'Check Firestore connectivity and project ID',
      },
      'Failed to fetch student profile',
    );
    return null;
  }
}

/**
 * Creates or updates a student profile (merge strategy — partial updates safe).
 * Errors are logged but never rethrown — Firestore failures must not crash the relay.
 */
export async function upsertProfile(
  id: string,
  data: Partial<StudentProfile>,
): Promise<void> {
  try {
    await getFirestore().collection(COLLECTION).doc(id).set(data, { merge: true });
    logger.info(
      { event: 'profile_upserted', studentId: id },
      'Student profile upserted',
    );
  } catch (err) {
    logger.error(
      {
        event: 'profile_upsert_failed',
        code: 'FIRESTORE_SET_001',
        err,
        studentId: id,
        action: 'Check Firestore write permissions and quota',
      },
      'Failed to upsert student profile',
    );
  }
}

/**
 * Appends a completed call record to the student's sessions array.
 * Also updates lastSessionAt to the call date.
 * Errors are logged but never rethrown — Firestore failures must not crash the relay.
 */
export async function addCallToProfile(
  id: string,
  call: SessionRecord,
): Promise<void> {
  try {
    await getFirestore().collection(COLLECTION).doc(id).update({
      sessions: FieldValue.arrayUnion(call),
      lastSessionAt: call.date,
    });
    logger.info(
      {
        event: 'call_added_to_profile',
        studentId: id,
        scenarioId: call.scenarioId,
        duration: call.duration,
      },
      'Call record appended to student profile',
    );
  } catch (err) {
    logger.error(
      {
        event: 'add_call_failed',
        code: 'FIRESTORE_UPDATE_001',
        err,
        studentId: id,
        scenarioId: call.scenarioId,
        action: 'Check Firestore write permissions. Profile may not exist yet — try upsertProfile first.',
      },
      'Failed to append call to student profile',
    );
  }
}
