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

// ─── Constants ────────────────────────────────────────────────────────────────

/** At 9 min, inject a graceful wrap-up instruction to the model. */
const WRAP_UP_MS = 9 * 60 * 1000;
/** At 10 min, force-close regardless of model state. */
const FORCE_CLOSE_MS = 10 * 60 * 1000;

// ─── State ────────────────────────────────────────────────────────────────────

interface RelayState {
  session: GeminiSession | null;
  started: boolean;
  sessionId: string | null;
  audioCunkCount: number;
  wrapUpTimer: ReturnType<typeof setTimeout> | null;
  forceCloseTimer: ReturnType<typeof setTimeout> | null;
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

function clearTimers(state: RelayState): void {
  if (state.wrapUpTimer) {
    clearTimeout(state.wrapUpTimer);
    state.wrapUpTimer = null;
  }
  if (state.forceCloseTimer) {
    clearTimeout(state.forceCloseTimer);
    state.forceCloseTimer = null;
  }
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
  const state: RelayState = {
    session: null,
    started: false,
    sessionId: null,
    audioCunkCount: 0,
    wrapUpTimer: null,
    forceCloseTimer: null,
  };

  logger.debug({ event: 'ws_open' }, 'WebSocket connection opened');

  // Register raw event listeners via the underlying WebSocket
  const raw = (ws as unknown as { raw: { addEventListener(e: string, h: (...a: unknown[]) => void): void } }).raw;

  raw.addEventListener('message', (event: unknown) => {
    const data = (event as MessageEvent).data;
    const rawStr = typeof data === 'string' ? data : String(data);
    handleClientMessage(ws, state, rawStr);
  });

  raw.addEventListener('close', () => {
    handleBrowserClose(ws, state);
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
  msg: { type: 'start'; scenarioId?: string; topic?: string; voiceName?: string; studentName?: string },
): Promise<void> {
  // Guard against double-start
  if (state.started) return;
  state.started = true;

  logger.info(
    { event: 'session_start', scenarioId: msg.scenarioId, topic: msg.topic, studentName: msg.studentName, voiceName: msg.voiceName },
    'Session start received',
  );

  // Resolve system prompt and voice
  let systemPrompt: string;
  let voiceName: string | undefined = msg.voiceName;

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
    // Use preset voice if not overridden by the browser
    voiceName ??= scenario.voiceName;
  } else if (msg.topic) {
    systemPrompt = buildOpenTopicPrompt(msg.topic);
  } else {
    logger.warn({ event: 'start_missing_params', code: 'RELAY_START_002' }, 'start message missing scenarioId and topic');
    sendToClient(ws, { type: 'error', message: 'start requires scenarioId or topic' });
    state.started = false;
    return;
  }

  const sessionId = generateSessionId();
  state.sessionId = sessionId;

  // Open Gemini session with tool call handler
  const session = await createGeminiSession({
    systemPrompt,
    voiceName,
    onAudio: (data) => sendToClient(ws, { type: 'audio', data }),
    onOutputTranscription: (text) => {
      logger.debug({ event: 'output_transcription', sessionId, textLength: text.length }, 'Output transcription received');
      sendToClient(ws, { type: 'output_transcription', text });
    },
    onInputTranscription: (text) => {
      logger.debug({ event: 'input_transcription', sessionId, textLength: text.length }, 'Input transcription received');
      sendToClient(ws, { type: 'input_transcription', text });
    },
    onInterrupted: () => {
      logger.debug({ event: 'interrupted', sessionId }, 'Gemini interrupted signal received');
      sendToClient(ws, { type: 'interrupted' });
    },
    onError: (error) => {
      logger.error(
        { event: 'gemini_error', code: 'RELAY_GEMINI_001', err: error, sessionId, action: 'Check Gemini API status' },
        'Gemini session error',
      );
      sendToClient(ws, { type: 'error', message: error.message });
      clearTimers(state);
    },
    onClose: () => {
      logger.info({ event: 'gemini_close', sessionId }, 'Gemini session closed');
      sendToClient(ws, { type: 'ended', reason: 'session_closed' });
      clearTimers(state);
    },
    onToolCall: (name, args) => {
      logger.info({ event: 'tool_call_forward', name, args, sessionId }, 'Forwarding tool call to browser');

      if (name === 'end_session') {
        const reason = (args as { reason?: string }).reason ?? 'story_complete';
        sendToClient(ws, { type: 'ended', reason });
        state.session?.close();
        clearTimers(state);
        return;
      }

      if (name === 'switch_speaker') {
        const a = args as { speaker?: string; name?: string };
        if (a.name) {
          sendToClient(ws, { type: 'speaker_switch', speaker: 'character', name: a.name });
        }
        return;
      }

      if (name === 'announce_choice') {
        const a = args as { choices?: { title: string; description: string }[] };
        if (a.choices) {
          sendToClient(ws, { type: 'choices', choices: a.choices });
        }
        return;
      }

      logger.warn({ event: 'unknown_tool_call', name, sessionId }, 'Received unknown tool call from Gemini');
    },
  });

  state.session = session;

  logger.info({ event: 'gemini_session_created', sessionId, scenarioId: msg.scenarioId, topic: msg.topic, voiceName }, 'Gemini session created successfully');

  // ── Safety net timers ─────────────────────────────────────────────────────

  state.wrapUpTimer = setTimeout(() => {
    logger.info({ event: 'wrap_up_inject', sessionId }, 'Injecting wrap-up at 9 min');
    state.session?.sendText('Begin wrapping up naturally. Deliver your closing observation and call end_session.');
  }, WRAP_UP_MS);

  state.forceCloseTimer = setTimeout(() => {
    logger.warn({ event: 'force_close', sessionId }, 'Force-closing at 10 min');
    state.session?.close();
    sendToClient(ws, { type: 'ended', reason: 'timeout' });
    clearTimers(state);
  }, FORCE_CLOSE_MS);

  // Trigger the model's first turn before notifying the browser
  session.sendText('The student has called you. Pick up the call.');

  // Notify browser that the session is ready
  sendToClient(ws, { type: 'connected', sessionId });
}

// ─── Disconnect handler ───────────────────────────────────────────────────────

function handleBrowserClose(ws: WSContext, state: RelayState): void {
  logger.info({ event: 'ws_close', sessionId: state.sessionId }, 'Browser WebSocket closed');
  state.session?.close();
  state.session = null;
  clearTimers(state);
}
