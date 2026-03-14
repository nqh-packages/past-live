/**
 * @what - Structured pino logger for the past-live backend
 * @why - All server-side events must be observable; silent failures kill hackathon demos
 * @exports - logger
 */

import pino from 'pino';

// ─── Level resolution ─────────────────────────────────────────────────────────

// Silent in production — Cloud Run captures stdout but we don't want log volume
// debug in dev — every event visible
const level =
  process.env['LOG_LEVEL'] ??
  (process.env['NODE_ENV'] === 'production' ? 'silent' : 'debug');

// ─── Singleton ────────────────────────────────────────────────────────────────

export const logger = pino({
  level,
  // Pretty-print in dev when a tty is attached
  transport:
    process.env['NODE_ENV'] !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }
      : undefined,
});
