/**
 * @what - GET /call-history endpoint for student call history
 * @why - Powers the "Recent Calls" section on /app. Reads past sessions from
 *        the student's Firestore profile and returns them in display order.
 * @exports - callHistoryRoute
 */

import { Hono } from 'hono';
import { getProfile } from './firestore.js';
import { logger } from './logger.js';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CallHistoryEntry {
  scenarioId: string;
  characterName: string;
  /** ISO date string. */
  date: string;
  /** Duration in seconds. */
  duration: number;
  topicsCovered: string[];
  /** Character's closing observation about the student, written in character. */
  agentInsight: string;
}

export interface CallHistoryResponse {
  calls: CallHistoryEntry[];
}

// ─── Route ─────────────────────────────────────────────────────────────────────

export const callHistoryRoute = new Hono();

/**
 * GET /call-history?studentId=<id>
 *
 * Returns up to 10 most recent calls for the student, newest first.
 * Returns an empty list (not an error) when the student has no profile yet.
 */
callHistoryRoute.get('/call-history', async (c) => {
  const studentId = c.req.query('studentId');

  if (!studentId) {
    return c.json<CallHistoryResponse>({ calls: [] });
  }

  try {
    const profile = await getProfile(studentId);

    if (!profile || !profile.sessions.length) {
      return c.json<CallHistoryResponse>({ calls: [] });
    }

    const calls: CallHistoryEntry[] = [...profile.sessions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map((s) => ({
        scenarioId: s.scenarioId,
        characterName: s.characterName,
        date: s.date instanceof Date ? s.date.toISOString() : String(s.date),
        duration: s.duration,
        topicsCovered: s.topicsCovered,
        agentInsight: s.agentInsight,
      }));

    logger.info(
      { event: 'call_history_fetched', studentId, count: calls.length },
      'Call history fetched',
    );

    return c.json<CallHistoryResponse>({ calls });
  } catch (err) {
    logger.error(
      {
        event: 'call_history_failed',
        code: 'CALL_HISTORY_001',
        err,
        studentId,
        action: 'Check Firestore connectivity',
      },
      'Failed to fetch call history',
    );
    // Graceful degradation — empty list rather than 500
    return c.json<CallHistoryResponse>({ calls: [] });
  }
});
