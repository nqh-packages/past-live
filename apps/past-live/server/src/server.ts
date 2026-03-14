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

// ─── Startup guards ────────────────────────────────────────────────────────────

// Skip API key check in test environments — tests mock Gemini at the module level
if (process.env['VITEST'] === undefined && !process.env['GEMINI_API_KEY']) {
  console.error('FATAL: GEMINI_API_KEY required');
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

app.get('/health', (c) => c.json({ status: 'ok' }));

// POST routes for home multimodal input and session preview overlay
app.route('/', extractTopicRoute);
app.route('/', sessionPreviewRoute);

// Text-only test endpoint — no audio hardware required, for CI and dev tooling
app.route('/', testSessionRoute);

app.get(
  '/ws',
  upgradeWebSocket((c) => {
    let relay: ReturnType<typeof createRelay> | undefined;

    return {
      onOpen: (_event, ws) => {
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
  console.log(`Past, Live server listening on :${port}`);
  return server;
}

export { app };

// ─── Entry point ──────────────────────────────────────────────────────────────

// Auto-start when run directly (node dist/server.js or tsx src/server.ts)
// Skip when imported by tests
if (process.env['VITEST'] === undefined) {
  startServer();
}
