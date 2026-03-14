/**
 * @what - Thin wrapper around Gemini Live API for audio/video/text streaming sessions
 * @why - Single point of contact for @google/genai — no other file imports it
 * @exports - createGeminiSession, GeminiSession, GeminiSessionConfig
 */

import {
  GoogleGenAI,
  Modality,
  MediaResolution,
  StartSensitivity,
  EndSensitivity,
} from '@google/genai';
import { logger } from './logger.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeminiSessionConfig {
  systemPrompt: string;
  onAudio(data: string): void;
  onOutputTranscription(text: string): void;
  onInputTranscription(text: string): void;
  onInterrupted(): void;
  onError(error: Error): void;
  onClose(): void;
}

export interface GeminiSession {
  sendAudio(data: string): void;
  sendText(text: string): void;
  sendVideo(data: string): void;
  sendAudioEnd(): void;
  close(): void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const VOICE = 'Charon';

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
 */
export async function createGeminiSession(
  config: GeminiSessionConfig,
): Promise<GeminiSession> {
  logger.debug({ event: 'gemini_connecting', model: MODEL, voice: VOICE }, 'Connecting to Gemini Live API');

  let audioChunkCount = 0;

  const session = await ai.live.connect({
    model: MODEL,
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: { parts: [{ text: config.systemPrompt }] },
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } },
      },
      enableAffectiveDialog: true,
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
      realtimeInputConfig: {
        automaticActivityDetection: {
          startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
          endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
          prefixPaddingMs: 20,
          silenceDurationMs: 500,
        },
      },
      contextWindowCompression: { slidingWindow: {} },
    },
    callbacks: {
      onopen: () => {
        logger.info({ event: 'gemini_connected', model: MODEL, voice: VOICE }, 'Gemini Live session connected');
      },
      onmessage: (response) => {
        const content = response.serverContent;
        if (!content) return;

        // Audio from model turn parts
        if (content.modelTurn?.parts) {
          for (const part of content.modelTurn.parts) {
            if (part.inlineData?.data) {
              audioChunkCount++;
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

        // Input transcription (what the student said)
        if (content.inputTranscription?.text) {
          logger.debug(
            { event: 'input_transcription', text: content.inputTranscription.text },
            'Input transcription received',
          );
          config.onInputTranscription(content.inputTranscription.text);
        }

        // Output transcription (what the agent said)
        if (content.outputTranscription?.text) {
          logger.debug(
            { event: 'output_transcription', text: content.outputTranscription.text },
            'Output transcription received',
          );
          config.onOutputTranscription(content.outputTranscription.text);
        }

        // Interruption signal — browser should clear playback queue
        if (content.interrupted) {
          logger.debug({ event: 'gemini_interrupted' }, 'Gemini interrupted signal received');
          config.onInterrupted();
        }
      },
      onerror: (error) => {
        logger.error(
          {
            event: 'gemini_error',
            code: 'GEMINI_SESSION_001',
            err: error,
            action: 'Check GEMINI_API_KEY validity and Gemini API status',
          },
          'Gemini Live session error',
        );
        config.onError(error instanceof Error ? error : new Error(String(error)));
      },
      onclose: () => {
        logger.info({ event: 'gemini_session_close', totalAudioChunks: audioChunkCount }, 'Gemini Live session closed');
        config.onClose();
      },
    },
  });

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
      // Flush cached audio — maps to hold-to-speak button release
      session.sendRealtimeInput({ audioStreamEnd: true });
    },

    close(): void {
      session.close();
    },
  };
}
