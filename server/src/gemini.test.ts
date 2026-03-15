/**
 * Tests for gemini.ts — retry logic and truncation detection.
 *
 * createGeminiSession itself is exercised through relay.test.ts (mocked).
 * This file tests the internal retry/detection behavior via controlled
 * @google/genai SDK mocking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mock — must be declared before vi.mock() calls ──────────────────

const { mockConnect } = vi.hoisted(() => ({ mockConnect: vi.fn() }));

// ─── Mock @google/genai before any imports ────────────────────────────────────

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    live: { connect: mockConnect },
  })),
  Modality: { AUDIO: 'AUDIO' },
  MediaResolution: { MEDIA_RESOLUTION_LOW: 'MEDIA_RESOLUTION_LOW' },
  StartSensitivity: { START_SENSITIVITY_LOW: 'START_SENSITIVITY_LOW', START_SENSITIVITY_HIGH: 'START_SENSITIVITY_HIGH' },
  EndSensitivity: { END_SENSITIVITY_HIGH: 'END_SENSITIVITY_HIGH', END_SENSITIVITY_LOW: 'END_SENSITIVITY_LOW' },
  ActivityHandling: { START_OF_ACTIVITY_INTERRUPTS: 'START_OF_ACTIVITY_INTERRUPTS' },
  TurnCoverage: { TURN_INCLUDES_ONLY_ACTIVITY: 'TURN_INCLUDES_ONLY_ACTIVITY' },
}));

vi.mock('./behavioral-rules.js', () => ({ TOOL_DECLARATIONS: [] }));

const { mockLogApiCall, mockCompleteApiCall } = vi.hoisted(() => ({
  mockLogApiCall: vi.fn(() => Promise.resolve('mock-doc-id')),
  mockCompleteApiCall: vi.fn(() => Promise.resolve(undefined)),
}));

vi.mock('./api-call-logger.js', () => ({
  logApiCall: mockLogApiCall,
  completeApiCall: mockCompleteApiCall,
}));

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./logger.js', () => ({ logger: mockLogger }));

import { createGeminiSession, type GeminiSessionConfig } from './gemini.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMinimalConfig(overrides: Partial<GeminiSessionConfig> = {}): GeminiSessionConfig {
  return {
    systemPrompt: 'You are Constantine XI.',
    onAudio: vi.fn(),
    onOutputTranscription: vi.fn(),
    onInputTranscription: vi.fn(),
    onInterrupted: vi.fn(),
    onError: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

type GeminiCallbacks = {
  onopen?: () => void;
  onmessage?: (r: unknown) => void;
  onerror?: (e: unknown) => void;
  onclose?: (code?: number, reason?: string) => void;
};

function makeSessionStub() {
  const capturedCallbacks: GeminiCallbacks = {};
  const session = {
    sendRealtimeInput: vi.fn(),
    sendToolResponse: vi.fn(),
    close: vi.fn(),
  };

  mockConnect.mockImplementation(
    async ({ callbacks }: { callbacks: GeminiCallbacks }) => {
      Object.assign(capturedCallbacks, callbacks);
      capturedCallbacks.onopen?.();
      return session;
    },
  );

  return { session, callbacks: capturedCallbacks };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('createGeminiSession', () => {
  // resetAllMocks clears call history AND implementations — prevents mock bleed between tests
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('connectWithRetry — retry on transient errors', () => {
    it('connects successfully on the first attempt when no error occurs', async () => {
      makeSessionStub();
      await createGeminiSession(makeMinimalConfig());
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('retries and succeeds on the third attempt after two transient failures', async () => {
      const { session } = makeSessionStub();
      // Once queues run before the default mockImplementation
      mockConnect
        .mockRejectedValueOnce(new Error('WebSocket error: 1008 Operation not supported'))
        .mockRejectedValueOnce(new Error('WebSocket error: 1008 Operation not supported'))
        .mockResolvedValueOnce(session);

      await createGeminiSession(makeMinimalConfig());
      expect(mockConnect).toHaveBeenCalledTimes(3);
    }, 10000); // Allow real delays: 1000ms + 2000ms

    it('logs a warn for each retry attempt', async () => {
      const { session } = makeSessionStub();
      mockConnect
        .mockRejectedValueOnce(new Error('transient network error'))
        .mockResolvedValueOnce(session);

      await createGeminiSession(makeMinimalConfig());

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'gemini_connect_retry', attempt: 1 }),
        expect.any(String),
      );
    }, 5000); // Allow real delay: 1000ms

    it('throws immediately on 401 error without retrying', async () => {
      mockConnect.mockRejectedValue(new Error('401 Unauthorized: invalid API key'));

      await expect(createGeminiSession(makeMinimalConfig())).rejects.toThrow('401');
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('throws immediately on 403 error without retrying', async () => {
      mockConnect.mockRejectedValue(new Error('403 Forbidden: permission denied'));

      await expect(createGeminiSession(makeMinimalConfig())).rejects.toThrow('403');
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('throws immediately on error containing "auth" without retrying', async () => {
      mockConnect.mockRejectedValue(new Error('authentication failed'));

      await expect(createGeminiSession(makeMinimalConfig())).rejects.toThrow('authentication');
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('throws immediately on error containing "permission" without retrying', async () => {
      mockConnect.mockRejectedValue(new Error('permission denied by server'));

      await expect(createGeminiSession(makeMinimalConfig())).rejects.toThrow('permission');
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('throws after all 3 retries exhausted for persistent transient errors', async () => {
      mockConnect.mockRejectedValue(new Error('1008 Operation not supported'));

      await expect(createGeminiSession(makeMinimalConfig())).rejects.toThrow('1008');
      expect(mockConnect).toHaveBeenCalledTimes(3);
    }, 10000); // Allow real delays: 1000ms + 2000ms

    it('logs retry attempts with increasing delay values (exponential backoff)', async () => {
      const { session } = makeSessionStub();
      mockConnect
        .mockRejectedValueOnce(new Error('transient'))
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce(session);

      await createGeminiSession(makeMinimalConfig());

      const warnCalls = mockLogger.warn.mock.calls as [{ event: string; delayMs: number }, string][];
      const retryCalls = warnCalls.filter(([ctx]) => ctx.event === 'gemini_connect_retry');

      expect(retryCalls.length).toBe(2);
      // attempt 1 → BASE * 2^0 = 1000ms, attempt 2 → BASE * 2^1 = 2000ms
      expect(retryCalls[0][0].delayMs).toBe(1000);
      expect(retryCalls[1][0].delayMs).toBe(2000);
    }, 10000); // Allow real delays: 1000ms + 2000ms
  });

  describe('turnComplete detection — FIX-5 (GitHub #2117)', () => {
    it('calls onTurnComplete when serverContent.turnComplete is true', async () => {
      const { callbacks } = makeSessionStub();
      const onTurnComplete = vi.fn();
      await createGeminiSession(makeMinimalConfig({ onTurnComplete }));

      callbacks.onmessage?.({ serverContent: { turnComplete: true } });

      expect(onTurnComplete).toHaveBeenCalledOnce();
    });

    it('logs warn when turnComplete arrives within 500ms of last audio chunk', async () => {
      const { callbacks } = makeSessionStub();
      const onTurnComplete = vi.fn();
      await createGeminiSession(makeMinimalConfig({ onTurnComplete }));

      // Emit audio to set lastAudioOutputMs
      callbacks.onmessage?.({
        serverContent: {
          modelTurn: { parts: [{ inlineData: { data: 'base64audio' } }] },
        },
      });

      // Immediately emit turnComplete — gapMs ~0ms, well under 500ms threshold
      callbacks.onmessage?.({ serverContent: { turnComplete: true } });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'possible_truncation', code: 'GEMINI_TRUNC_001' }),
        expect.any(String),
      );
    });

    it('does not warn when no audio preceded turnComplete (lastAudioOutputMs is 0)', async () => {
      const { callbacks } = makeSessionStub();
      await createGeminiSession(makeMinimalConfig({ onTurnComplete: vi.fn() }));

      // No audio chunk first — lastAudioOutputMs stays 0
      callbacks.onmessage?.({ serverContent: { turnComplete: true } });

      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        expect.objectContaining({ event: 'possible_truncation' }),
        expect.any(String),
      );
    });

    it('logs debug for normal turn completion (audio then long gap)', async () => {
      vi.useFakeTimers();
      const { callbacks } = makeSessionStub();
      await createGeminiSession(makeMinimalConfig({ onTurnComplete: vi.fn() }));

      // Emit audio chunk
      callbacks.onmessage?.({
        serverContent: {
          modelTurn: { parts: [{ inlineData: { data: 'base64audio' } }] },
        },
      });

      // Advance time by 600ms so gapMs > 500ms threshold
      vi.advanceTimersByTime(600);

      callbacks.onmessage?.({ serverContent: { turnComplete: true } });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'turn_complete' }),
        expect.any(String),
      );

      vi.useRealTimers();
    });

    it('does not throw when onTurnComplete callback is omitted', async () => {
      const { callbacks } = makeSessionStub();
      // Config has NO onTurnComplete
      await createGeminiSession(makeMinimalConfig());

      expect(() => {
        callbacks.onmessage?.({ serverContent: { turnComplete: true } });
      }).not.toThrow();
    });
  });
});
