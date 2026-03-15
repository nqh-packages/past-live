/**
 * @what - Structured pino logger for the past-live backend
 * @why - All server-side events must be observable — silent failures kill demos AND debugging
 * @exports - logger
 */

import pino from 'pino';
import { createWriteStream, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Level resolution ─────────────────────────────────────────────────────────

// ALWAYS log info+ in production. Never silent. You can't debug what you can't see.
// Override with LOG_LEVEL env var if needed.
const level =
  process.env['LOG_LEVEL'] ??
  (process.env['NODE_ENV'] === 'production' ? 'info' : 'debug');

// ─── Log file setup ──────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const logDir = resolve(__dirname, '..', 'logs');
mkdirSync(logDir, { recursive: true });

const logFilePath = resolve(logDir, 'server.log');
const fileStream = createWriteStream(logFilePath, { flags: 'a' });

// ─── Singleton ────────────────────────────────────────────────────────────────

const isDev = process.env['NODE_ENV'] !== 'production';

export const logger = pino(
  { level },
  pino.multistream([
    // Stdout: pretty in dev, JSON in prod
    isDev
      ? { level, stream: pino.transport({ target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }) }
      : { level, stream: process.stdout },
    // File: always JSON for machine parsing
    { level, stream: fileStream },
  ]),
);

logger.info({ event: 'logger_init', logFile: logFilePath }, `Logging to ${logFilePath}`);
