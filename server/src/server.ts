/**
 * @what - Hono HTTP + WebSocket server with health check and relay entry point
 * @why - Single entry point that wires @hono/node-ws to the relay orchestrator
 * @exports - app, startServer
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { createRelay } from './relay.js';
import { extractTopicRoute } from './extract-topic.js';
import { sessionPreviewRoute } from './session-preview.js';
import { testSessionRoute } from './test-session.js';
import { callHistoryRoute } from './call-history.js';
import { debugLogsRoute } from './debug-logs.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { logger } from './logger.js';

// ─── Startup guards ────────────────────────────────────────────────────────────

// Skip API key check in test environments — tests mock Gemini at the module level
if (process.env['VITEST'] === undefined && !process.env['GEMINI_API_KEY']) {
  logger.fatal({ event: 'startup_fatal', code: 'SERVER_ENV_001', action: 'Set GEMINI_API_KEY environment variable' }, 'FATAL: GEMINI_API_KEY required');
  process.exit(1);
}

// ─── App ──────────────────────────────────────────────────────────────────────

const app = new Hono();

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// CORS: allow all in dev, restrict to frontend domain in prod
// Split comma-separated origins so multiple prod domains work
app.use(
  '/*',
  cors({
    origin: process.env['ALLOWED_ORIGIN']
      ? process.env['ALLOWED_ORIGIN'].split(',').map((s) => s.trim())
      : '*',
  }),
);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (c) => {
  logger.debug({ event: 'health_check' }, 'GET /health');
  return c.json({ status: 'ok' });
});

// Dev-only: serve story script test page at /test-script
app.get('/test-script', (c) => {
  logger.info({ event: 'test_script_page_served' }, 'GET /test-script — serving story script test page');
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const html = readFileSync(join(__dirname, '../../design/test-story-script.html'), 'utf-8');
    return c.html(html);
  } catch (err) {
    logger.warn({ event: 'test_script_page_not_found', err }, '/test-script: test-story-script.html not found');
    return c.text('test-story-script.html not found', 404);
  }
});

// Dev-only: serve test call page at /test (mic requires localhost, not file://)
app.get('/test', (c) => {
  logger.info({ event: 'test_page_served' }, 'GET /test — serving test call page');
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const html = readFileSync(join(__dirname, '../../design/test-call.html'), 'utf-8');
    return c.html(html);
  } catch (err) {
    logger.warn(
      { event: 'test_page_not_found', err, action: 'Run server from apps/past-live/server/ so relative path resolves' },
      '/test: test-call.html not found',
    );
    return c.text('test-call.html not found — run from apps/past-live/server/', 404);
  }
});

// Dev-only: serve camera test page at /test-camera (mic + camera require localhost)
app.get('/test-camera', (c) => {
  logger.info({ event: 'test_camera_page_served' }, 'GET /test-camera');
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const html = readFileSync(join(__dirname, '../../design/test-camera.html'), 'utf-8');
    return c.html(html);
  } catch (err) {
    logger.warn({ event: 'test_camera_page_not_found', err }, '/test-camera: not found');
    return c.text('test-camera.html not found', 404);
  }
});

// POST routes for home multimodal input and session preview overlay
app.route('/', extractTopicRoute);
app.route('/', sessionPreviewRoute);

// Text-only test endpoint — no audio hardware required, for CI and dev tooling
app.route('/', testSessionRoute);

// Call history for student profiles — powers "Recent Calls" section on /app
app.route('/', callHistoryRoute);

// Debug: query Cloud Logging for a session's structured log entries (agents + dogfood testing)
app.route('/', debugLogsRoute);

app.get(
  '/ws',
  upgradeWebSocket((c) => {
    let relay: ReturnType<typeof createRelay> | undefined;

    return {
      onOpen: (_event, ws) => {
        logger.info({ event: 'ws_upgrade', remoteAddr: c.req.header('x-forwarded-for') ?? 'unknown' }, 'WebSocket upgrade accepted — creating relay');
        // createRelay attaches message + close listeners to ws.raw internally
        relay = createRelay(ws);
      },
      // onMessage is intentionally omitted — relay.ts attaches its own listener
      // to ws.raw so it can handle the MessageEvent directly, preserving DRY.
      onClose: () => {
        // relay.ts handles its own close cleanup via ws.raw 'close' listener;
        // this hook is kept for Hono lifecycle completeness.
        relay;
      },
    };
  }),
);

// ─── Server ───────────────────────────────────────────────────────────────────

/**
 * Starts the HTTP + WebSocket server.
 * injectWebSocket MUST be called after serve() — this is @hono/node-ws's requirement.
 */
export function startServer() {
  const port = Number(process.env['PORT'] ?? 8787);
  const server = serve({ fetch: app.fetch, port });
  // Wire WebSocket upgrade support into the underlying Node.js http.Server
  injectWebSocket(server);
  logger.info(
    { event: 'server_start', port, env: process.env['NODE_ENV'] ?? 'development', allowedOrigin: process.env['ALLOWED_ORIGIN'] ?? '*' },
    `Past, Live server listening on :${port}`,
  );
  return server;
}

export { app };

// ─── Entry point ──────────────────────────────────────────────────────────────

// Auto-start when run directly (node dist/server.js or tsx src/server.ts)
// Skip when imported by tests
if (process.env['VITEST'] === undefined) {
  startServer();
}
