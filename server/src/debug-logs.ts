/**
 * @what - Query Cloud Logging for all structured log entries from a specific session
 * @why - Dogfood agents need to inspect session transcripts, tool calls, errors after testing
 * @exports - debugLogsRoute
 */

import { Logging } from '@google-cloud/logging';
import { Hono } from 'hono';
import { logger } from './logger.js';
import { getSessionSummary } from './session-persistence.js';

// ─── Config ────────────────────────────────────────────────────────────────────

const PROJECT_ID = process.env['GOOGLE_CLOUD_PROJECT'] ?? 'past-live-490122';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SessionLogEntry {
  ts: string;
  level: string;
  event: string;
  msg: string;
  data: Record<string, unknown>;
}

export interface SessionLogsResponse {
  sessionId: string;
  count: number;
  events: SessionLogEntry[];
}

export interface SessionLogsSummary {
  sessionId: string;
  transcript: { speaker: string; text: unknown; ts: string }[];
  toolCalls: { tool: unknown; args: unknown; ts: string }[];
  reanchors: { type: string; turn: unknown; ts: string }[];
  errors: { event: string; code: unknown; msg: string; ts: string }[];
  images: { event: string; ts: string; duration: unknown }[];
  connection: { event: string; code: unknown; reason: unknown; ts: string }[];
}

// ─── Query ─────────────────────────────────────────────────────────────────────

export async function getSessionLogs(sessionId: string, limit = 200): Promise<SessionLogEntry[]> {
  const logging = new Logging({ projectId: PROJECT_ID });

  // Cloud Run logs are streamed to the "run.googleapis.com" resource.
  // Every Pino log includes sessionId in the structured jsonPayload.
  const filter = [
    `resource.type="cloud_run_revision"`,
    `resource.labels.service_name="past-live-backend"`,
    `jsonPayload.sessionId="${sessionId}"`,
  ].join(' AND ');

  try {
    const [entries] = await logging.getEntries({
      filter,
      orderBy: 'timestamp asc',
      pageSize: limit,
    });

    return entries.map((entry) => {
      const payload = (entry.data as Record<string, unknown>) ?? {};
      return {
        ts: (entry.metadata?.timestamp as string) ?? '',
        level: levelName(payload['level'] as number),
        event: (payload['event'] as string) ?? '',
        msg: (payload['msg'] as string) ?? '',
        data: payload,
      };
    });
  } catch (err) {
    logger.error(
      { event: 'debug_logs_query_failed', err, sessionId },
      'Failed to query Cloud Logging',
    );
    throw err;
  }
}

function levelName(n: number): string {
  if (n >= 60) return 'fatal';
  if (n >= 50) return 'error';
  if (n >= 40) return 'warn';
  if (n >= 30) return 'info';
  if (n >= 20) return 'debug';
  return 'trace';
}

// ─── Route ─────────────────────────────────────────────────────────────────────

export const debugLogsRoute = new Hono();

/**
 * GET /api/debug/:sessionId
 *
 * Returns all structured log entries for the given session from Cloud Logging.
 * Wait 30-60s after session end for log ingestion before querying.
 */
debugLogsRoute.get('/api/debug/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');

  if (!sessionId) {
    return c.json({ error: 'sessionId required' }, 400);
  }

  logger.info({ event: 'debug_logs_requested', sessionId }, 'Debug logs requested');

  try {
    const logs = await getSessionLogs(sessionId);

    logger.info(
      { event: 'debug_logs_served', sessionId, count: logs.length },
      `Returning ${logs.length} log entries`,
    );

    return c.json<SessionLogsResponse>({
      sessionId,
      count: logs.length,
      events: logs,
    });
  } catch (err) {
    return c.json(
      {
        error: 'Failed to fetch logs',
        detail: String(err),
        suggestions: [
          'Wait 30-60s after session end for log ingestion',
          'Verify sessionId is correct',
          'Check Cloud Logging API is enabled: gcloud services enable logging.googleapis.com',
        ],
      },
      500,
    );
  }
});

/**
 * GET /api/debug/:sessionId/summary
 *
 * Condensed view of the session — transcript, tool calls, re-anchors, errors,
 * image gen events, and connection lifecycle. Designed for agent inspection.
 */
debugLogsRoute.get('/api/debug/:sessionId/summary', async (c) => {
  const sessionId = c.req.param('sessionId');

  if (!sessionId) {
    return c.json({ error: 'sessionId required' }, 400);
  }

  logger.info({ event: 'debug_summary_requested', sessionId }, 'Debug summary requested');

  try {
    const logs = await getSessionLogs(sessionId);

    const summary: SessionLogsSummary = {
      sessionId,
      transcript: logs
        .filter((l) => l.event === 'output_utterance' || l.event === 'input_utterance')
        .map((l) => ({
          speaker: l.event === 'output_utterance' ? 'CHARACTER' : 'STUDENT',
          text: l.data['text'] ?? l.msg,
          ts: l.ts,
        })),
      toolCalls: logs
        .filter((l) => l.event === 'tool_call_forward')
        .map((l) => ({ tool: l.data['name'], args: l.data['args'], ts: l.ts })),
      reanchors: logs
        .filter(
          (l) =>
            l.event === 'reanchor_injected' ||
            l.event === 'reanchor_tool_nudge' ||
            l.event === 'reanchor_tool_nudge_scene',
        )
        .map((l) => ({ type: l.event, turn: l.data['modelTurnCount'], ts: l.ts })),
      errors: logs
        .filter((l) => l.level === 'error' || l.level === 'warn')
        .map((l) => ({ event: l.event, code: l.data['code'], msg: l.msg, ts: l.ts })),
      images: logs
        .filter(
          (l) =>
            l.event === 'scene_image_saved' ||
            l.event === 'scene_image_failed' ||
            l.event === 'image_gen_success',
        )
        .map((l) => ({ event: l.event, ts: l.ts, duration: l.data['durationMs'] })),
      connection: logs
        .filter(
          (l) =>
            l.event === 'gemini_session_close' ||
            l.event === 'gemini_session_start' ||
            l.event === 'ws_close',
        )
        .map((l) => ({
          event: l.event,
          code: l.data['code'],
          reason: l.data['reason'],
          ts: l.ts,
        })),
    };

    logger.info(
      {
        event: 'debug_summary_served',
        sessionId,
        transcriptLines: summary.transcript.length,
        errors: summary.errors.length,
      },
      'Debug summary served',
    );

    return c.json<SessionLogsSummary>(summary);
  } catch (err) {
    return c.json(
      {
        error: 'Failed to fetch summary',
        detail: String(err),
        suggestions: [
          'Wait 30-60s after session end for log ingestion',
          'Verify sessionId is correct',
          'Check Cloud Logging API is enabled: gcloud services enable logging.googleapis.com',
        ],
      },
      500,
    );
  }
});

/**
 * GET /api/summary/:sessionId
 *
 * Returns the persisted post-call summary from Firestore.
 * Used by /summary page when sessionStorage is empty (browser close, tab refresh).
 */
debugLogsRoute.get('/api/summary/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  if (!sessionId) return c.json({ error: 'sessionId required' }, 400);

  const data = await getSessionSummary(sessionId);
  if (!data) return c.json({ status: 'not_found' }, 404);

  return c.json(data);
});
