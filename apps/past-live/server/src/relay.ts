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
import { logger } from './logger.js';

// ─── State ────────────────────────────────────────────────────────────────────

interface RelayState {
  session: GeminiSession | null;
  started: boolean;
  sessionId: string | null;
  audioCunkCount: number;
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
  const state: RelayState = { session: null, started: false, sessionId: null, audioCunkCount: 0 };

  logger.debug({ event: 'ws_open' }, 'WebSocket connection opened');

  // Register raw event listeners via the underlying WebSocket
  const raw = (ws as unknown as { raw: { addEventListener(e: string, h: (...a: unknown[]) => void): void } }).raw;

  raw.addEventListener('message', (event: unknown) => {
    const data = (event as MessageEvent).data;
    const rawStr = typeof data === 'string' ? data : String(data);
    handleClientMessage(ws, state, rawStr);
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
    logger.warn(
      { event: 'parse_error', code: 'RELAY_PARSE_001', err, action: 'Check browser sends valid JSON' },
      'Failed to parse client message',
    );
    sendToClient(ws, {
      type: 'error',
      message: err instanceof Error ? err.message : 'Invalid message',
    });
    return;
  }

  switch (msg.type) {
    case 'start':
      handleStart(ws, state, msg).catch((err: unknown) => {
        logger.error(
          {
            event: 'start_error',
            code: 'RELAY_START_001',
            err,
            scenarioId: msg.type === 'start' ? msg.scenarioId : undefined,
            topic: msg.type === 'start' ? msg.topic : undefined,
            action: 'Check GEMINI_API_KEY and network connectivity',
          },
          'Failed to start Gemini session',
        );
        sendToClient(ws, {
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to start session',
        });
      });
      break;

    case 'audio':
      state.audioCunkCount++;
      if (state.audioCunkCount % 10 === 0) {
        logger.debug(
          { event: 'audio_chunks_sent', sessionId: state.sessionId, count: state.audioCunkCount },
          'Audio chunks forwarded to Gemini',
        );
      }
      state.session?.sendAudio(msg.data);
      break;

    case 'text':
      logger.debug({ event: 'text_forwarded', sessionId: state.sessionId, textLength: msg.text.length }, 'Text message forwarded to Gemini');
      state.session?.sendText(msg.text);
      break;

    case 'video':
      logger.debug({ event: 'video_forwarded', sessionId: state.sessionId }, 'Video frame forwarded to Gemini');
      state.session?.sendVideo(msg.data);
      break;

    case 'audio_end':
      logger.debug({ event: 'audio_end', sessionId: state.sessionId }, 'Audio stream end forwarded to Gemini');
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

  logger.info(
    { event: 'session_start', scenarioId: msg.scenarioId, topic: msg.topic, studentName: msg.studentName },
    'Session start received',
  );

  // Resolve system prompt
  let systemPrompt: string;

  if (msg.scenarioId) {
    const scenario = getScenario(msg.scenarioId);
    if (!scenario) {
      logger.warn(
        { event: 'unknown_scenario', code: 'RELAY_SCENARIO_001', scenarioId: msg.scenarioId, action: 'Check scenarios.ts for valid IDs' },
        'Unknown scenarioId',
      );
      sendToClient(ws, { type: 'error', message: `Unknown scenarioId: ${msg.scenarioId}` });
      state.started = false;
      return;
    }
    systemPrompt = scenario.systemPrompt;
  } else if (msg.topic) {
    systemPrompt = buildOpenTopicPrompt(msg.topic);
  } else {
    logger.warn({ event: 'start_missing_params', code: 'RELAY_START_002' }, 'start message missing scenarioId and topic');
    sendToClient(ws, { type: 'error', message: 'start requires scenarioId or topic' });
    state.started = false;
    return;
  }

  // Open Gemini session
  const session = await createGeminiSession({
    systemPrompt,
    onAudio: (data) => sendToClient(ws, { type: 'audio', data }),
    onOutputTranscription: (text) => {
      logger.debug({ event: 'output_transcription', sessionId: state.sessionId, textLength: text.length }, 'Output transcription received');
      sendToClient(ws, { type: 'output_transcription', text });
    },
    onInputTranscription: (text) => {
      logger.debug({ event: 'input_transcription', sessionId: state.sessionId, textLength: text.length }, 'Input transcription received');
      sendToClient(ws, { type: 'input_transcription', text });
    },
    onInterrupted: () => {
      logger.debug({ event: 'interrupted', sessionId: state.sessionId }, 'Gemini interrupted signal received');
      sendToClient(ws, { type: 'interrupted' });
    },
    onError: (error) => {
      logger.error(
        { event: 'gemini_error', code: 'RELAY_GEMINI_001', err: error, sessionId: state.sessionId, action: 'Check Gemini API status' },
        'Gemini session error',
      );
      sendToClient(ws, { type: 'error', message: error.message });
    },
    onClose: () => {
      logger.info({ event: 'gemini_close', sessionId: state.sessionId }, 'Gemini session closed');
      sendToClient(ws, { type: 'ended', reason: 'session_closed' });
    },
  });

  const sessionId = generateSessionId();
  state.session = session;
  state.sessionId = sessionId;

  logger.info({ event: 'gemini_session_created', sessionId, scenarioId: msg.scenarioId, topic: msg.topic }, 'Gemini session created successfully');

  // Trigger the model's first narration turn before notifying the browser
  session.sendText('Begin the scene.');

  // Notify browser that the session is ready
  sendToClient(ws, { type: 'connected', sessionId });
}

// ─── Disconnect handler ───────────────────────────────────────────────────────

function handleBrowserClose(state: RelayState): void {
  logger.info({ event: 'ws_close', sessionId: state.sessionId }, 'Browser WebSocket closed');
  state.session?.close();
  state.session = null;
}
