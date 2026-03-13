/**
 * Tests for relay.ts — WebSocket relay orchestrator
 * Uses vi.mock to avoid real Gemini API calls.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { GeminiSession, GeminiSessionConfig } from './gemini.js';
import type { WSContext } from 'hono/ws';

// ─── Mock @google/genai before importing relay ────────────────────────────────

vi.mock('./gemini.js', () => ({
  createGeminiSession: vi.fn(),
}));

import { createGeminiSession } from './gemini.js';
import { createRelay } from './relay.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWsMock() {
  const sent: string[] = [];
  let closeHandler: (() => void) | undefined;
  let messageHandler: ((event: MessageEvent) => void) | undefined;

  const ws = {
    send: vi.fn((data: string) => sent.push(data)),
    close: vi.fn(),
    raw: {
      addEventListener: vi.fn(
        (event: string, handler: (...args: unknown[]) => void) => {
          if (event === 'message') {
            messageHandler = handler as (event: MessageEvent) => void;
          }
          if (event === 'close') {
            closeHandler = handler as () => void;
          }
        },
      ),
    },
    sent,
    triggerMessage: (data: string) => {
      messageHandler?.({ data } as MessageEvent);
    },
    triggerClose: () => {
      closeHandler?.();
    },
  } as unknown as WSContext & {
    sent: string[];
    triggerMessage(data: string): void;
    triggerClose(): void;
  };

  return ws;
}

function makeGeminiMock() {
  let capturedConfig: GeminiSessionConfig | undefined;

  const session: GeminiSession = {
    sendAudio: vi.fn(),
    sendText: vi.fn(),
    sendVideo: vi.fn(),
    sendAudioEnd: vi.fn(),
    close: vi.fn(),
  };

  (createGeminiSession as Mock).mockImplementation(
    async (config: GeminiSessionConfig) => {
      capturedConfig = config;
      return session;
    },
  );

  return {
    session,
    getConfig: () => capturedConfig,
  };
}

function parseSent(ws: ReturnType<typeof makeWsMock>, index = -1) {
  const arr = ws.sent;
  const idx = index < 0 ? arr.length + index : index;
  return JSON.parse(arr[idx] ?? '{}');
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('createRelay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('start with scenarioId', () => {
    it('creates Gemini session with the scenario system prompt', async () => {
      const ws = makeWsMock();
      const { getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(
        JSON.stringify({ type: 'start', scenarioId: 'constantinople-1453' }),
      );

      // Wait for async createGeminiSession
      await vi.waitFor(() => getConfig() !== undefined);

      const config = getConfig()!;
      expect(config.systemPrompt).toContain('Constantine XI');
    });

    it('sends connected message after Gemini session is established', async () => {
      const ws = makeWsMock();
      const { getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(
        JSON.stringify({ type: 'start', scenarioId: 'moon-landing-1969' }),
      );

      await vi.waitFor(() => getConfig() !== undefined);
      // Allow the promise chain to settle
      await vi.waitFor(() => ws.sent.length > 0);

      const msg = parseSent(ws);
      expect(msg.type).toBe('connected');
      expect(typeof msg.sessionId).toBe('string');
      expect(msg.sessionId.length).toBeGreaterThan(0);
    });
  });

  describe('start with topic', () => {
    it('creates Gemini session with open topic prompt', async () => {
      const ws = makeWsMock();
      const { getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(
        JSON.stringify({ type: 'start', topic: 'French Revolution' }),
      );

      await vi.waitFor(() => getConfig() !== undefined);

      const config = getConfig()!;
      expect(config.systemPrompt).toContain('French Revolution');
    });
  });

  describe('audio forwarding', () => {
    it('forwards audio data to Gemini sendAudio', async () => {
      const ws = makeWsMock();
      const { session, getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(
        JSON.stringify({ type: 'start', scenarioId: 'mongol-empire-1206' }),
      );
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      ws.triggerMessage(
        JSON.stringify({
          type: 'audio',
          data: 'base64pcm',
          mimeType: 'audio/pcm;rate=16000',
        }),
      );

      expect(session.sendAudio).toHaveBeenCalledWith('base64pcm');
    });

    it('ignores audio messages received before start', () => {
      const ws = makeWsMock();
      makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(
        JSON.stringify({
          type: 'audio',
          data: 'base64pcm',
          mimeType: 'audio/pcm;rate=16000',
        }),
      );

      expect(createGeminiSession).not.toHaveBeenCalled();
    });
  });

  describe('text forwarding', () => {
    it('forwards text to Gemini sendText', async () => {
      const ws = makeWsMock();
      const { session, getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(
        JSON.stringify({ type: 'start', scenarioId: 'constantinople-1453' }),
      );
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      ws.triggerMessage(JSON.stringify({ type: 'text', text: 'Hello there' }));

      expect(session.sendText).toHaveBeenCalledWith('Hello there');
    });
  });

  describe('video forwarding', () => {
    it('forwards video data to Gemini sendVideo', async () => {
      const ws = makeWsMock();
      const { session, getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(
        JSON.stringify({ type: 'start', scenarioId: 'moon-landing-1969' }),
      );
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      ws.triggerMessage(
        JSON.stringify({
          type: 'video',
          data: 'base64jpeg',
          mimeType: 'image/jpeg',
        }),
      );

      expect(session.sendVideo).toHaveBeenCalledWith('base64jpeg');
    });
  });

  describe('audio_end forwarding', () => {
    it('calls sendAudioEnd on Gemini session', async () => {
      const ws = makeWsMock();
      const { session, getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(
        JSON.stringify({ type: 'start', scenarioId: 'mongol-empire-1206' }),
      );
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      ws.triggerMessage(JSON.stringify({ type: 'audio_end' }));

      expect(session.sendAudioEnd).toHaveBeenCalledOnce();
    });
  });

  describe('Gemini callbacks → browser messages', () => {
    async function setupActiveSession() {
      const ws = makeWsMock();
      const { session, getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(
        JSON.stringify({ type: 'start', scenarioId: 'constantinople-1453' }),
      );
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      return { ws, session, config: getConfig()! };
    }

    it('sends audio message to browser when Gemini emits audio', async () => {
      const { ws, config } = await setupActiveSession();

      config.onAudio('pcm24kbase64');

      const msg = parseSent(ws);
      expect(msg).toEqual({ type: 'audio', data: 'pcm24kbase64' });
    });

    it('sends output_transcription message to browser', async () => {
      const { ws, config } = await setupActiveSession();

      config.onOutputTranscription('The harbor chain is holding.');

      const msg = parseSent(ws);
      expect(msg).toEqual({
        type: 'output_transcription',
        text: 'The harbor chain is holding.',
      });
    });

    it('sends input_transcription message to browser', async () => {
      const { ws, config } = await setupActiveSession();

      config.onInputTranscription('We should reinforce the sea walls.');

      const msg = parseSent(ws);
      expect(msg).toEqual({
        type: 'input_transcription',
        text: 'We should reinforce the sea walls.',
      });
    });

    it('sends interrupted message to browser', async () => {
      const { ws, config } = await setupActiveSession();

      config.onInterrupted();

      const msg = parseSent(ws);
      expect(msg).toEqual({ type: 'interrupted' });
    });

    it('sends error message to browser when Gemini errors', async () => {
      const { ws, config } = await setupActiveSession();

      config.onError(new Error('Connection lost'));

      const msg = parseSent(ws);
      expect(msg.type).toBe('error');
      expect(msg.message).toBe('Connection lost');
    });

    it('sends ended message to browser when Gemini closes', async () => {
      const { ws, config } = await setupActiveSession();

      config.onClose();

      const msg = parseSent(ws);
      expect(msg).toEqual({ type: 'ended', reason: 'session_closed' });
    });
  });

  describe('browser disconnect', () => {
    it('closes the Gemini session when browser disconnects', async () => {
      const ws = makeWsMock();
      const { session, getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(
        JSON.stringify({ type: 'start', scenarioId: 'mongol-empire-1206' }),
      );
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      ws.triggerClose();

      expect(session.close).toHaveBeenCalledOnce();
    });

    it('does not error if browser disconnects before start', () => {
      const ws = makeWsMock();
      makeGeminiMock();

      createRelay(ws as WSContext);

      // Should not throw
      expect(() => ws.triggerClose()).not.toThrow();
    });
  });

  describe('invalid messages', () => {
    it('sends error to browser on invalid JSON', () => {
      const ws = makeWsMock();
      makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage('not-json{{{');

      expect(ws.sent.length).toBeGreaterThan(0);
      const msg = parseSent(ws);
      expect(msg.type).toBe('error');
    });

    it('ignores unknown message type gracefully before start', () => {
      const ws = makeWsMock();
      makeGeminiMock();

      createRelay(ws as WSContext);

      // Should not throw — unknown type is just dropped
      expect(() =>
        ws.triggerMessage(JSON.stringify({ type: 'audio_end' })),
      ).not.toThrow();
    });
  });
});
