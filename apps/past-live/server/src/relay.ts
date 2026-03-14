/**
 * @what - WebSocket relay orchestrator — bridges browser WS ↔ Gemini Live session
 * @why - Single file responsible for protocol translation between browser and Gemini
 * @exports - createRelay
 */

import type { WSContext } from 'hono/ws';
import { parseClientMessage, serializeServerMessage } from './protocol.js';
import { getScenario, buildOpenTopicPrompt } from './scenarios.js';
import { createGeminiSession } from './gemini.js';
import type { GeminiSession } from './gemini.js';

// ─── State ────────────────────────────────────────────────────────────────────

interface RelayState {
  session: GeminiSession | null;
  started: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sendToClient(ws: WSContext, msg: Parameters<typeof serializeServerMessage>[0]): void {
  try {
    ws.send(serializeServerMessage(msg));
  } catch {
    // Client may have already disconnected — ignore send errors
  }
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Attaches relay logic to a Hono WSContext.
 * Lifecycle: idle → starting → active → closed.
 *
 * @pitfall - Messages arriving before the Gemini session resolves are silently
 *   dropped (except start, which is idempotent on first call). This is safe for
 *   hold-to-speak UX since the user cannot transmit before `connected` is received.
 */
export function createRelay(ws: WSContext): void {
  const state: RelayState = { session: null, started: false };

  // Register raw event listeners via the underlying WebSocket
  const raw = (ws as unknown as { raw: { addEventListener(e: string, h: (...a: unknown[]) => void): void } }).raw;

  raw.addEventListener('message', (event: unknown) => {
    const data = (event as MessageEvent).data;
    const raw = typeof data === 'string' ? data : String(data);
    handleClientMessage(ws, state, raw);
  });

  raw.addEventListener('close', () => {
    handleBrowserClose(state);
  });
}

// ─── Message handler ──────────────────────────────────────────────────────────

function handleClientMessage(ws: WSContext, state: RelayState, raw: string): void {
  let msg: ReturnType<typeof parseClientMessage>;

  try {
    msg = parseClientMessage(raw);
  } catch (err) {
    sendToClient(ws, {
      type: 'error',
      message: err instanceof Error ? err.message : 'Invalid message',
    });
    return;
  }

  switch (msg.type) {
    case 'start':
      handleStart(ws, state, msg).catch((err: unknown) => {
        sendToClient(ws, {
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to start session',
        });
      });
      break;

    case 'audio':
      state.session?.sendAudio(msg.data);
      break;

    case 'text':
      state.session?.sendText(msg.text);
      break;

    case 'video':
      state.session?.sendVideo(msg.data);
      break;

    case 'audio_end':
      state.session?.sendAudioEnd();
      break;
  }
}

// ─── Start handler ────────────────────────────────────────────────────────────

async function handleStart(
  ws: WSContext,
  state: RelayState,
  msg: { type: 'start'; scenarioId?: string; topic?: string; studentName?: string },
): Promise<void> {
  // Guard against double-start
  if (state.started) return;
  state.started = true;

  // Resolve system prompt
  let systemPrompt: string;

  if (msg.scenarioId) {
    const scenario = getScenario(msg.scenarioId);
    if (!scenario) {
      sendToClient(ws, { type: 'error', message: `Unknown scenarioId: ${msg.scenarioId}` });
      state.started = false;
      return;
    }
    systemPrompt = scenario.systemPrompt;
  } else if (msg.topic) {
    systemPrompt = buildOpenTopicPrompt(msg.topic);
  } else {
    sendToClient(ws, { type: 'error', message: 'start requires scenarioId or topic' });
    state.started = false;
    return;
  }

  // Open Gemini session
  const session = await createGeminiSession({
    systemPrompt,
    onAudio: (data) => sendToClient(ws, { type: 'audio', data }),
    onOutputTranscription: (text) => sendToClient(ws, { type: 'output_transcription', text }),
    onInputTranscription: (text) => sendToClient(ws, { type: 'input_transcription', text }),
    onInterrupted: () => sendToClient(ws, { type: 'interrupted' }),
    onError: (error) => sendToClient(ws, { type: 'error', message: error.message }),
    onClose: () => sendToClient(ws, { type: 'ended', reason: 'session_closed' }),
  });

  state.session = session;

  // Trigger the model's first narration turn before notifying the browser
  session.sendText('Begin the scene.');

  // Notify browser that the session is ready
  sendToClient(ws, { type: 'connected', sessionId: generateSessionId() });
}

// ─── Disconnect handler ───────────────────────────────────────────────────────

function handleBrowserClose(state: RelayState): void {
  state.session?.close();
  state.session = null;
}
