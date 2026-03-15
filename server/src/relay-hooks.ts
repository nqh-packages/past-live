/**
 * @what - Session lifecycle hooks invoked by relay.ts on significant events
 * @why - Keeps relay.ts at its 350 LOC limit; isolates Firestore side-effects
 *   from the core WebSocket relay orchestration logic.
 * @exports - onSessionEnd
 */

import { addCallToProfile } from './firestore.js';
import type { PostCallSummary } from './post-call-summary.js';
import { logger } from './logger.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionEndParams {
  /** Clerk user ID or sessionId. If undefined, Firestore write is skipped. */
  studentId?: string;
  characterName: string;
  historicalSetting: string;
  /** Call duration in seconds. */
  duration: number;
  summary?: PostCallSummary;
  scenarioId?: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Called after a session ends. Saves the call record to the student's Firestore profile.
 * No-ops silently when studentId is absent. Never throws — relay must not crash.
 */
export async function onSessionEnd(params: SessionEndParams): Promise<void> {
  const { studentId, characterName, historicalSetting, duration, summary, scenarioId } = params;

  if (!studentId) {
    logger.debug(
      { event: 'session_end_no_student', characterName, historicalSetting },
      'onSessionEnd skipped — no studentId provided',
    );
    return;
  }

  logger.info(
    {
      event: 'session_end_save',
      studentId,
      characterName,
      scenarioId,
      duration,
    },
    'Saving call record to student profile',
  );

  try {
    await addCallToProfile(studentId, {
      scenarioId: scenarioId ?? historicalSetting,
      characterName,
      date: new Date(),
      duration,
      topicsCovered: summary?.keyFacts ?? [],
      agentInsight: summary?.characterMessage ?? '',
    });
  } catch (err) {
    logger.error(
      {
        event: 'session_end_save_failed',
        code: 'HOOKS_END_001',
        err,
        studentId,
        action: 'Call record lost for this session. Check Firestore connectivity.',
      },
      'Failed to save call record to Firestore',
    );
  }
}
