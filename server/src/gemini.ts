/**
 * @what - Thin wrapper around Gemini Live API for audio/video/text streaming sessions
 * @why - Single point of contact for @google/genai — no other file imports it
 * @exports - createGeminiSession, GeminiSession, GeminiSessionConfig
 */

import {
  GoogleGenAI,
  Modality,
  StartSensitivity,
  EndSensitivity,
  ActivityHandling,
  TurnCoverage,
  type Tool,
} from '@google/genai';
import { TOOL_DECLARATIONS } from './behavioral-rules.js';
import { logger } from './logger.js';
import { logApiCall, completeApiCall } from './api-call-logger.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeminiSessionConfig {
  systemPrompt: string;
  /** Voice name from the 30-voice catalog. Falls back to 'Charon' if omitted. */
  voiceName?: string;
  /** Resume a previous session using a stored handle (from GoAway reconnection). */
  resumptionHandle?: string;
  /** Override tool declarations. Pass empty array to disable all tools. */
  tools?: Tool[];
  onAudio(data: string): void;
  onOutputTranscription(text: string): void;
  onInputTranscription(text: string): void;
  onInterrupted(): void;
  onError(error: Error): void;
  onClose(code?: number, reason?: string): void;
  /**
   * Called when Gemini invokes a function tool. Relay handles routing to browser.
   * @param name - Function name: 'end_session' | 'switch_speaker' | 'announce_choice'
   * @param args - Parsed arguments object from the function call
   */
  onToolCall?(name: string, args: Record<string, unknown>): void;
  /**
   * Called when server sends GoAway — connection will terminate soon.
   * Relay should reconnect using the latest resumption handle.
   * @param timeLeft - Duration string before forced disconnect (e.g. "30s")
   */
  onGoAway?(timeLeft: string): void;
  /**
   * Called when server sends a new resumption handle. Store the latest one
   * so relay can reconnect transparently after GoAway.
   */
  onResumptionUpdate?(handle: string, resumable: boolean): void;
  /**
   * Called when Gemini signals turnComplete on serverContent.
   * Used for mid-sentence truncation detection (GitHub #2117).
   */
  onTurnComplete?(): void;
}

export interface GeminiSession {
  sendAudio(data: string): void;
  sendText(text: string): void;
  sendVideo(data: string): void;
  sendAudioEnd(): void;
  /** Inject context into history WITHOUT triggering VAD. Use for re-anchoring. */
  sendContext(text: string): void;
  close(): void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const DEFAULT_VOICE = 'Charon';
const MAX_CONNECT_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

// ─── Retry helpers ────────────────────────────────────────────────────────────

/**
 * Returns false for auth/permission errors that should NOT be retried.
 * Returns true for transient errors (network, 1008, etc.) that can be retried.
 *
 * @pitfall - SDK may not export typed auth error classes. Inspect message string
 *   as fallback. Auth errors from Gemini contain "401", "403", "auth", or "permission".
 */
function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if (
    msg.includes('401') || msg.includes('403') ||
    msg.includes('auth') || msg.includes('permission')
  ) {
    return false;
  }
  return true;
}

/**
 * Wraps a Gemini Live connect call with exponential-backoff retry logic.
 * Handles WebSocket 1008 "Operation not supported" transient errors (GitHub #1236).
 *
 * @param fn - Factory that produces the connect Promise. Called per attempt.
 * @returns Resolved session value on success.
 * @throws Last error after all retries exhausted, or immediately on auth errors.
 *
 * @inference - T is inferred from fn's return type; no explicit annotation needed.
 */
async function connectWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_CONNECT_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryableError(err) || attempt === MAX_CONNECT_RETRIES) throw err;
      const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn(
        { event: 'gemini_connect_retry', attempt, maxAttempts: MAX_CONNECT_RETRIES, delayMs, err },
        'Retrying Gemini Live connection',
      );
      await new Promise<void>((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

// ─── Client (singleton per process) ──────────────────────────────────────────

// v1alpha MANDATORY for enableAffectiveDialog — see plan + GitHub issue #865
const ai = new GoogleGenAI({
  apiKey: process.env['GEMINI_API_KEY'] ?? '',
  httpOptions: { apiVersion: 'v1alpha' },
});

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Opens a Gemini Live session with the given system prompt and event callbacks.
 * The returned GeminiSession wraps sendRealtimeInput for all input types.
 *
 * @inference - GeminiSessionConfig callbacks are called from the Gemini onmessage
 *   handler on the same event loop tick; callers must not assume ordering between
 *   onAudio / onOutputTranscription within a single model turn.
 *
 * @pitfall - voiceName is locked at connect time. Cannot change mid-session.
 *   Flash selects the voice during session-preview; relay passes it here.
 */
export async function createGeminiSession(
  config: GeminiSessionConfig,
): Promise<GeminiSession> {
  const voice = config.voiceName ?? DEFAULT_VOICE;

  logger.debug({ event: 'gemini_connecting', model: MODEL, voice }, 'Connecting to Gemini Live API');

  let audioChunkCount = 0;
  const connectStartMs = Date.now();
  // FIX-5: Track when the last audio output chunk arrived so we can detect
  // premature turnComplete signals (GitHub #2117 — mid-sentence truncation).
  let lastAudioOutputMs = 0;

  // Fire-and-forget API call logging — stored as promise so we can complete it after connect.
  // The await below is for promise resolution only; Firestore errors are swallowed inside logApiCall.
  const apiCallIdPromise = logApiCall({ sessionId: 'pending', type: 'live_connect', model: MODEL });

  let session: Awaited<ReturnType<typeof ai.live.connect>>;
  try {
    session = await connectWithRetry(() => ai.live.connect({
    model: MODEL,
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: { parts: [{ text: config.systemPrompt }] },
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
      },
      enableAffectiveDialog: true,
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      // mediaResolution removed — none of the working video implementations set this.
      // MEDIA_RESOLUTION_LOW may conflict with native audio pipeline, causing 1011 crashes.
      realtimeInputConfig: {
        automaticActivityDetection: {
          // LOW start = reject background noise, don't trigger on ambient sounds
          startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
          // HIGH end = let natural pauses happen, don't cut mid-sentence (#2117)
          endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
          prefixPaddingMs: 20,
          silenceDurationMs: 500,
        },
        // Explicit barge-in: student speech interrupts model immediately
        activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
        // Filter background noise from turns — only actual speech counts
        turnCoverage: TurnCoverage.TURN_INCLUDES_ONLY_ACTIVITY,
      },
      contextWindowCompression: {
        triggerTokens: '10000',
        slidingWindow: { targetTokens: '5000' },
      },
      sessionResumption: {
        handle: config.resumptionHandle,
      },
      tools: config.tools ?? TOOL_DECLARATIONS,
    },
    callbacks: {
      onopen: () => {
        logger.info({ event: 'gemini_connected', model: MODEL, voice }, 'Gemini Live session connected');
      },
      onmessage: (response) => {
        // ── Tool calls ───────────────────────────────────────────────────────
        // NON_BLOCKING: model continues speaking while tool response is sent.
        if (response.toolCall?.functionCalls) {
          for (const fc of response.toolCall.functionCalls) {
            const name = fc.name ?? '';
            const args = (fc.args ?? {}) as Record<string, unknown>;

            logger.info(
              { event: 'tool_call', name, args },
              'Gemini tool call received',
            );

            config.onToolCall?.(name, args);

            // Respond immediately so the model isn't blocked
            session.sendToolResponse({
              functionResponses: [
                {
                  id: fc.id,
                  name: fc.name,
                  response: { result: 'ok' },
                },
              ],
            });
          }
        }

        const content = response.serverContent;
        if (!content) return;

        // ── Audio from model turn parts ──────────────────────────────────────
        if (content.modelTurn?.parts) {
          for (const part of content.modelTurn.parts) {
            if (part.inlineData?.data) {
              audioChunkCount++;
              lastAudioOutputMs = Date.now();
              if (audioChunkCount % 10 === 0) {
                logger.debug(
                  { event: 'audio_output_chunks', count: audioChunkCount },
                  'Audio output chunks received from Gemini',
                );
              }
              config.onAudio(part.inlineData.data);
            }
          }
        }

        // ── Input transcription (what the student said) ──────────────────────
        if (content.inputTranscription?.text) {
          logger.debug(
            { event: 'input_transcription', text: content.inputTranscription.text },
            'Input transcription received',
          );
          config.onInputTranscription(content.inputTranscription.text);
        }

        // ── Output transcription (what the agent said) ───────────────────────
        if (content.outputTranscription?.text) {
          logger.debug(
            { event: 'output_transcription', text: content.outputTranscription.text },
            'Output transcription received',
          );
          config.onOutputTranscription(content.outputTranscription.text);
        }

        // ── Interruption signal — browser should clear playback queue ────────
        if (content.interrupted) {
          logger.debug({ event: 'gemini_interrupted' }, 'Gemini interrupted signal received');
          config.onInterrupted();
        }

        // ── Turn complete — detect possible mid-sentence truncation ───────────
        // GitHub #2117: Gemini intermittently sends turnComplete while still
        // speaking. We cannot fix it (server-side bug) but we can detect it.
        // A gap <500ms between last audio chunk and turnComplete is suspicious.
        if (content.turnComplete) {
          const gapMs = Date.now() - lastAudioOutputMs;
          if (lastAudioOutputMs > 0 && gapMs < 500) {
            logger.warn(
              {
                event: 'possible_truncation',
                code: 'GEMINI_TRUNC_001',
                gapMs,
                audioChunkCount,
                action: 'Gemini sent turnComplete within 500ms of last audio — possible mid-sentence cut (GitHub #2117)',
              },
              'Possible mid-sentence truncation detected',
            );
          } else {
            logger.debug(
              { event: 'turn_complete', gapMs, audioChunkCount },
              'Model turn completed normally',
            );
          }
          config.onTurnComplete?.();
        }

        // ── GoAway — server will disconnect soon, reconnect proactively ────
        if (response.goAway) {
          const timeLeft = response.goAway.timeLeft ?? 'unknown';
          logger.warn(
            { event: 'gemini_go_away', timeLeft },
            'Gemini GoAway received — server will disconnect soon',
          );
          config.onGoAway?.(timeLeft);
        }

        // ── Session resumption handle — store for transparent reconnection ──
        if (response.sessionResumptionUpdate) {
          const { newHandle, resumable } = response.sessionResumptionUpdate;
          if (newHandle) {
            logger.debug(
              { event: 'resumption_handle_update', resumable, handleLength: newHandle.length },
              'Session resumption handle updated',
            );
            config.onResumptionUpdate?.(newHandle, resumable ?? false);
          }
        }
      },
      onerror: (error) => {
        const errorStr = error instanceof Error ? error.message : String(error);
        const elapsedMs = Date.now() - connectStartMs;
        logger.error(
          {
            event: 'gemini_error',
            code: 'GEMINI_SESSION_001',
            err: error,
            errorStr,
            elapsedMs,
            action: 'Check GEMINI_API_KEY validity and Gemini API status',
          },
          `Gemini Live session error after ${Math.round(elapsedMs / 1000)}s: ${errorStr}`,
        );
        config.onError(error instanceof Error ? error : new Error(String(error)));
      },
      onclose: (event) => {
        const elapsedMs = Date.now() - connectStartMs;
        const closeEvent = event as { code?: number; reason?: string } | undefined;
        logger.info(
          {
            event: 'gemini_session_close',
            totalAudioChunks: audioChunkCount,
            elapsedMs,
            closeCode: closeEvent?.code,
            closeReason: closeEvent?.reason,
          },
          `Gemini Live session closed after ${Math.round(elapsedMs / 1000)}s (code=${closeEvent?.code ?? 'none'}, reason=${closeEvent?.reason || 'none'})`,
        );
        config.onClose(closeEvent?.code, closeEvent?.reason);
      },
    },
  }));
  } catch (err) {
    // Complete API call log with failure status — fire-and-forget
    void apiCallIdPromise.then((id) => completeApiCall(id, { status: 'failed', error: String(err), durationMs: Date.now() - connectStartMs }));
    throw err;
  }

  // Complete API call log with success status — fire-and-forget
  void apiCallIdPromise.then((id) => completeApiCall(id, { status: 'completed', durationMs: Date.now() - connectStartMs }));

  return {
    sendAudio(data: string): void {
      session.sendRealtimeInput({
        audio: { data, mimeType: 'audio/pcm;rate=16000' },
      });
    },

    sendText(text: string): void {
      session.sendRealtimeInput({ text });
    },

    sendVideo(data: string): void {
      session.sendRealtimeInput({
        video: { data, mimeType: 'image/jpeg' },
      });
    },

    sendAudioEnd(): void {
      // Flush cached audio — maps to mute button press
      session.sendRealtimeInput({ audioStreamEnd: true });
    },

    sendContext(text: string): void {
      // Inject into history WITHOUT triggering VAD — model keeps speaking.
      // sendRealtimeInput({ text }) triggers VAD → interrupts model mid-sentence.
      // sendClientContent with turnComplete: false injects context silently.
      session.sendClientContent({
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: false,
      });
    },

    close(): void {
      session.close();
    },
  };
}
