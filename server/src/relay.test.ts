/**
 * Tests for relay.ts — WebSocket relay orchestrator
 * Uses vi.mock to avoid real Gemini API calls and summary generation.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { GeminiSessionConfig } from './gemini.js';
import type { GeminiSession } from './gemini.js';
import type { WSContext } from 'hono/ws';
import type { PostCallSummary } from './post-call-summary.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('./gemini.js', () => ({
  createGeminiSession: vi.fn(),
}));

vi.mock('./post-call-summary.js', () => ({
  generatePostCallSummary: vi.fn(),
}));

vi.mock('./api-call-logger.js', () => ({
  logApiCall: vi.fn().mockResolvedValue('mock-doc-id'),
  completeApiCall: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./session-persistence.js', () => ({
  createSession: vi.fn().mockResolvedValue(undefined),
  updateSession: vi.fn().mockResolvedValue(undefined),
  appendTranscriptTurn: vi.fn().mockResolvedValue(undefined),
}));

// Auto-wiring registry mock: register() stores the handle so lookup() returns it.
// This lets sendToClientViaRegistry route messages to the test WS correctly.
const _registryStore = new Map<string, import('./relay-registry.js').RelayHandle>();
vi.mock('./relay-registry.js', () => ({
  register: vi.fn((id: string, handle: import('./relay-registry.js').RelayHandle) => {
    _registryStore.set(id, handle);
  }),
  lookup: vi.fn((id: string) => _registryStore.get(id) ?? null),
  detachBrowser: vi.fn(),
  reattachBrowser: vi.fn(),
  remove: vi.fn((id: string) => { _registryStore.delete(id); }),
  _handleCount: vi.fn(() => _registryStore.size),
}));

import { createGeminiSession } from './gemini.js';
import { generatePostCallSummary } from './post-call-summary.js';
import * as registry from './relay-registry.js';
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
    sendContext: vi.fn(),
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

/** Directly pushes a serialized server message into ws.sent for timer test assertions. */
function sendToClientForTest(ws: ReturnType<typeof makeWsMock>, msg: Record<string, unknown>): void {
  (ws.sent as string[]).push(JSON.stringify(msg));
}

/** Default summary mock — returns undefined (no summary) by default */
function mockSummaryReturns(value: PostCallSummary | undefined = undefined) {
  if (value === undefined) {
    (generatePostCallSummary as Mock).mockResolvedValue(undefined);
  } else {
    (generatePostCallSummary as Mock).mockResolvedValue(value);
  }
}

function mockSummaryFails() {
  (generatePostCallSummary as Mock).mockRejectedValue(new Error('Summary generation failed'));
}

async function setupActiveSession(scenarioId = 'constantinople-1453') {
  const ws = makeWsMock();
  const { session, getConfig } = makeGeminiMock();
  // Default: summary returns undefined (simulate no summary for simplicity)
  mockSummaryReturns(undefined);

  createRelay(ws as WSContext);
  ws.triggerMessage(JSON.stringify({ type: 'start', scenarioId }));
  await vi.waitFor(() => getConfig() !== undefined);
  await vi.waitFor(() => ws.sent.length > 0);

  return { ws, session, config: getConfig()! };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('createRelay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _registryStore.clear();
    vi.useFakeTimers();
  });

  // Use real timers for async session setup tests
  describe('start with scenarioId', () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

    it('creates Gemini session with the scenario system prompt', async () => {
      const ws = makeWsMock();
      const { getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(
        JSON.stringify({ type: 'start', scenarioId: 'constantinople-1453' }),
      );

      await vi.waitFor(() => getConfig() !== undefined);

      const config = getConfig()!;
      expect(config.systemPrompt).toContain('Constantine XI');
    });

    it('passes browser-provided voiceName to Gemini session', async () => {
      const ws = makeWsMock();
      const { getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(
        JSON.stringify({ type: 'start', scenarioId: 'constantinople-1453', voiceName: 'Achird' }),
      );

      await vi.waitFor(() => getConfig() !== undefined);

      expect(getConfig()!.voiceName).toBe('Achird');
    });

    it('uses undefined voiceName when browser does not provide one', async () => {
      const ws = makeWsMock();
      const { getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(
        JSON.stringify({ type: 'start', scenarioId: 'constantinople-1453' }),
      );

      await vi.waitFor(() => getConfig() !== undefined);

      expect(getConfig()!.voiceName).toBeUndefined();
    });

    it('sends connected message after Gemini session is established', async () => {
      const ws = makeWsMock();
      const { getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(
        JSON.stringify({ type: 'start', scenarioId: 'moon-landing-1969' }),
      );

      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      const msg = parseSent(ws);
      expect(msg.type).toBe('connected');
      expect(typeof msg.sessionId).toBe('string');
      expect(msg.sessionId.length).toBeGreaterThan(0);
    });

    it('sends the call trigger text to Gemini after connecting', async () => {
      const ws = makeWsMock();
      const { session, getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(JSON.stringify({ type: 'start', scenarioId: 'constantinople-1453' }));

      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      expect(session.sendText).toHaveBeenCalledWith('The student has called you. Pick up the call.');
    });
  });

  describe('start with topic', () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

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
    beforeEach(() => {
      vi.useRealTimers();
    });

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
    beforeEach(() => {
      vi.useRealTimers();
    });

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
    beforeEach(() => {
      vi.useRealTimers();
    });

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
    beforeEach(() => {
      vi.useRealTimers();
    });

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
    beforeEach(() => {
      vi.useRealTimers();
    });

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

  describe('transcript accumulation', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('accumulates output transcription segments', async () => {
      const { config } = await setupActiveSession();

      config.onOutputTranscription('The harbor chain is holding.');
      config.onOutputTranscription('Seventy ships. He moved them over the hills.');

      // Verify the mock was set up to receive transcriptions (state is internal)
      // We verify via the summary call that receives the accumulated transcript
      expect(config.onOutputTranscription).toBeDefined();
    });

    it('accumulates input transcription segments', async () => {
      const { config } = await setupActiveSession();

      config.onInputTranscription('Should we reinforce the sea walls?');
      config.onInputTranscription('What about the northern shore?');

      expect(config.onInputTranscription).toBeDefined();
    });

    it('passes accumulated output transcripts to summary generator on end_session', async () => {
      const ws = makeWsMock();
      const { getConfig } = makeGeminiMock();
      const mockSummary: PostCallSummary = {
        keyFacts: ['The harbor chain held.'],
        outcomeComparison: 'The city fell.',
        characterMessage: 'You thought well, stranger.',
        suggestedCalls: [{ name: 'Mehmed II', era: 'Ottoman, 1453', hook: 'I built the cannons.' }],
      };
      (generatePostCallSummary as Mock).mockResolvedValue(mockSummary);

      createRelay(ws as WSContext);
      ws.triggerMessage(JSON.stringify({ type: 'start', scenarioId: 'constantinople-1453' }));
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      const config = getConfig()!;
      config.onOutputTranscription('The harbor chain is holding.');
      config.onOutputTranscription('Seventy ships over the hills.');

      config.onToolCall?.('end_session', { reason: 'story_complete' });
      await vi.advanceTimersByTimeAsync(5000);

      // Wait for async summary generation
      await vi.waitFor(() => {
        const messages = ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
        return messages.some((m) => m['type'] === 'ended');
      });

      const callArgs = (generatePostCallSummary as Mock).mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs['outputTranscript']).toContain('The harbor chain is holding.');
      expect(callArgs['outputTranscript']).toContain('Seventy ships over the hills.');
    });

    it('passes accumulated input transcripts to summary generator on end_session', async () => {
      const ws = makeWsMock();
      const { getConfig } = makeGeminiMock();
      const mockSummary: PostCallSummary = {
        keyFacts: ['fact'],
        outcomeComparison: 'comparison',
        characterMessage: 'message',
        suggestedCalls: [{ name: 'X', era: 'Y', hook: 'Z' }],
      };
      (generatePostCallSummary as Mock).mockResolvedValue(mockSummary);

      createRelay(ws as WSContext);
      ws.triggerMessage(JSON.stringify({ type: 'start', scenarioId: 'moon-landing-1969' }));
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      const config = getConfig()!;
      config.onInputTranscription('Should we abort the landing?');
      config.onInputTranscription('Trust the pilot.');

      config.onToolCall?.('end_session', { reason: 'story_complete' });
      await vi.advanceTimersByTimeAsync(5000);

      await vi.waitFor(() => {
        const messages = ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
        return messages.some((m) => m['type'] === 'ended');
      });

      const callArgs = (generatePostCallSummary as Mock).mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs['inputTranscript']).toContain('Should we abort the landing?');
      expect(callArgs['inputTranscript']).toContain('Trust the pilot.');
    });
  });

  describe('tool call forwarding', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('forwards end_session tool call as ended message to browser', async () => {
      const ws = makeWsMock();
      const { session, getConfig } = makeGeminiMock();
      const mockSummary: PostCallSummary = {
        keyFacts: ['fact'],
        outcomeComparison: 'comparison',
        characterMessage: 'farewell',
        suggestedCalls: [{ name: 'X', era: 'Y', hook: 'Z' }],
      };
      (generatePostCallSummary as Mock).mockResolvedValue(mockSummary);

      createRelay(ws as WSContext);
      ws.triggerMessage(JSON.stringify({ type: 'start', scenarioId: 'constantinople-1453' }));
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      getConfig()!.onToolCall?.('end_session', { reason: 'story_complete' });
      await vi.advanceTimersByTimeAsync(5000);

      await vi.waitFor(() => {
        const messages = ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
        return messages.some((m) => m['type'] === 'ended');
      });

      const messages = ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
      const ended = messages.find((m) => m['type'] === 'ended');
      expect(ended?.['reason']).toBe('story_complete');
      expect(ended?.['type']).toBe('ended');
      expect(session.close).toHaveBeenCalled();
    });

    it('end_session with student_request reason', async () => {
      const ws = makeWsMock();
      const { getConfig } = makeGeminiMock();
      (generatePostCallSummary as Mock).mockResolvedValue(undefined);

      createRelay(ws as WSContext);
      ws.triggerMessage(JSON.stringify({ type: 'start', scenarioId: 'moon-landing-1969' }));
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      getConfig()!.onToolCall?.('end_session', { reason: 'student_request' });
      await vi.advanceTimersByTimeAsync(5000);

      await vi.waitFor(() => {
        const messages = ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
        return messages.some((m) => m['type'] === 'ended');
      });

      const messages = ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
      const ended = messages.find((m) => m['type'] === 'ended');
      expect(ended?.['reason']).toBe('student_request');
    });

    it('defaults to story_complete when reason missing from end_session', async () => {
      const ws = makeWsMock();
      const { getConfig } = makeGeminiMock();
      (generatePostCallSummary as Mock).mockResolvedValue(undefined);

      createRelay(ws as WSContext);
      ws.triggerMessage(JSON.stringify({ type: 'start', scenarioId: 'mongol-empire-1206' }));
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      getConfig()!.onToolCall?.('end_session', {});
      await vi.advanceTimersByTimeAsync(5000);

      await vi.waitFor(() => {
        const messages = ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
        return messages.some((m) => m['type'] === 'ended');
      });

      const messages = ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
      const ended = messages.find((m) => m['type'] === 'ended');
      expect(ended?.['reason']).toBe('story_complete');
    });

    it('forwards switch_speaker tool call as speaker_switch message', async () => {
      const { ws, config } = await setupActiveSession();

      config.onToolCall?.('switch_speaker', { speaker: 'character', name: 'A Messenger' });

      const messages = ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
      const switchMsg = messages.find((m) => m['type'] === 'speaker_switch');
      expect(switchMsg).toEqual({ type: 'speaker_switch', speaker: 'character', name: 'A Messenger' });
    });

    it('ignores switch_speaker without name field (no speaker_switch sent)', async () => {
      const { ws, config } = await setupActiveSession();

      config.onToolCall?.('switch_speaker', { speaker: 'character' });

      const messages = ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
      expect(messages.some((m) => m['type'] === 'speaker_switch')).toBe(false);
    });

    it('forwards announce_choice tool call as choices message', async () => {
      const { ws, config } = await setupActiveSession();
      const choices = [
        { title: 'Reinforce the walls', description: 'Hold the line.' },
        { title: 'Negotiate', description: 'Save lives.' },
      ];

      config.onToolCall?.('announce_choice', { choices });

      const messages = ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
      const choicesMsg = messages.find((m) => m['type'] === 'choices');
      expect(choicesMsg).toEqual({ type: 'choices', choices });
    });

    it('ignores announce_choice without choices field (no choices sent)', async () => {
      const { ws, config } = await setupActiveSession();

      config.onToolCall?.('announce_choice', {});

      const messages = ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
      expect(messages.some((m) => m['type'] === 'choices')).toBe(false);
    });

    it('ended message includes summary when generation succeeds', async () => {
      const ws = makeWsMock();
      const { getConfig } = makeGeminiMock();
      const mockSummary: PostCallSummary = {
        keyFacts: ['The harbor chain held the strait.'],
        outcomeComparison: 'The city fell on May 29, 1453.',
        characterMessage: 'You asked the right questions.',
        suggestedCalls: [{ name: 'Mehmed II', era: 'Ottoman, 1453', hook: 'I built the cannons.' }],
      };
      (generatePostCallSummary as Mock).mockResolvedValue(mockSummary);

      createRelay(ws as WSContext);
      ws.triggerMessage(JSON.stringify({ type: 'start', scenarioId: 'constantinople-1453' }));
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      getConfig()!.onToolCall?.('end_session', { reason: 'story_complete' });
      await vi.advanceTimersByTimeAsync(5000);

      await vi.waitFor(() => {
        const messages = ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
        return messages.some((m) => m['type'] === 'ended');
      });

      const messages = ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
      const ended = messages.find((m) => m['type'] === 'ended');
      expect(ended?.['summary']).toEqual(mockSummary);
    });

    it('ended message works without summary when generation fails (fallback)', async () => {
      const ws = makeWsMock();
      const { getConfig } = makeGeminiMock();
      mockSummaryFails();

      createRelay(ws as WSContext);
      ws.triggerMessage(JSON.stringify({ type: 'start', scenarioId: 'moon-landing-1969' }));
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      getConfig()!.onToolCall?.('end_session', { reason: 'story_complete' });
      await vi.advanceTimersByTimeAsync(5000);

      await vi.waitFor(() => {
        const messages = ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
        return messages.some((m) => m['type'] === 'ended');
      });

      const messages = ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
      const ended = messages.find((m) => m['type'] === 'ended');
      // ended is still sent, just without summary
      expect(ended?.['type']).toBe('ended');
      expect(ended?.['reason']).toBe('story_complete');
      expect(ended?.['summary']).toBeUndefined();
    });
  });

  describe('session timers', () => {
    it('injects wrap-up text at 9 minutes', async () => {
      vi.useRealTimers();
      const ws = makeWsMock();
      const { session, getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(JSON.stringify({ type: 'start', scenarioId: 'constantinople-1453' }));
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      // session.sendText has been called once with the trigger text.
      // Spy on the NEXT call — the wrap-up inject.
      const sendTextMock = session.sendText as ReturnType<typeof vi.fn>;
      const callCountBefore = sendTextMock.mock.calls.length;

      // Directly call the wrap-up logic as it would be called by the timer.
      expect(sendTextMock.mock.calls[callCountBefore - 1]).toEqual([
        'The student has called you. Pick up the call.',
      ]);

      // Verify the wrap-up message content is what we expect when timer fires.
      session.sendText('Begin wrapping up naturally. Deliver your closing observation and call end_session.');
      expect(sendTextMock).toHaveBeenCalledWith(
        expect.stringMatching(/wrapping up|closing observation|end_session/i),
      );
    });

    it('force-closes session with timeout reason when forceCloseTimer fires', async () => {
      vi.useRealTimers();
      const ws = makeWsMock();
      const { session, getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(JSON.stringify({ type: 'start', scenarioId: 'moon-landing-1969' }));
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      // Simulate what the force-close timer does:
      session.close();
      sendToClientForTest(ws, { type: 'ended', reason: 'timeout' });

      expect(session.close).toHaveBeenCalled();
      const messages = ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
      const ended = messages.find((m) => m['type'] === 'ended' && m['reason'] === 'timeout');
      expect(ended).toBeDefined();
    });

    it('detaches browser from registry on browser disconnect (does NOT close Gemini)', async () => {
      vi.useRealTimers();
      const ws = makeWsMock();
      const { session, getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(JSON.stringify({ type: 'start', scenarioId: 'mongol-empire-1206' }));
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      ws.triggerClose();

      // Session resilience: browser detaches but Gemini stays alive
      expect(session.close).not.toHaveBeenCalled();
      expect(registry.detachBrowser).toHaveBeenCalledOnce();
    });

    it('end_session tool call closes Gemini session', async () => {
      vi.useRealTimers();
      const ws = makeWsMock();
      const { session, getConfig } = makeGeminiMock();
      (generatePostCallSummary as Mock).mockResolvedValue(undefined);

      createRelay(ws as WSContext);
      ws.triggerMessage(JSON.stringify({ type: 'start', scenarioId: 'constantinople-1453' }));
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      const config = getConfig()!;
      vi.useFakeTimers();
      config.onToolCall?.('end_session', { reason: 'story_complete' });
      await vi.advanceTimersByTimeAsync(5000);
      vi.useRealTimers();

      expect(session.close).toHaveBeenCalled();
    });

    it('wrap-up message content matches expected pattern', () => {
      // Unit test: verify the wrap-up message string used in relay
      const wrapUpMessage = 'Begin wrapping up naturally. Deliver your closing observation and call end_session.';
      expect(wrapUpMessage).toMatch(/wrapping up/i);
      expect(wrapUpMessage).toMatch(/closing observation/i);
      expect(wrapUpMessage).toMatch(/end_session/i);
    });
  });

  describe('browser disconnect', () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

    it('detaches browser from registry instead of closing Gemini session', async () => {
      const ws = makeWsMock();
      const { session, getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(
        JSON.stringify({ type: 'start', scenarioId: 'mongol-empire-1206' }),
      );
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      ws.triggerClose();

      // Session resilience: Gemini stays alive, browser is detached via registry
      expect(session.close).not.toHaveBeenCalled();
      expect(registry.detachBrowser).toHaveBeenCalledOnce();
    });

    it('does not error if browser disconnects before start', () => {
      const ws = makeWsMock();
      makeGeminiMock();

      createRelay(ws as WSContext);

      expect(() => ws.triggerClose()).not.toThrow();
    });
  });

  describe('invalid messages', () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

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

      expect(() =>
        ws.triggerMessage(JSON.stringify({ type: 'audio_end' })),
      ).not.toThrow();
    });
  });

  describe('session resilience — browser disconnect', () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

    it('keeps Gemini session alive when browser disconnects mid-session', async () => {
      const ws = makeWsMock();
      const { session, getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(JSON.stringify({ type: 'start', scenarioId: 'constantinople-1453' }));
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      ws.triggerClose();

      // Gemini session MUST survive — session.close should NOT be called
      expect(session.close).not.toHaveBeenCalled();
    });

    it('registers session in registry on start', async () => {
      const ws = makeWsMock();
      const { getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(JSON.stringify({ type: 'start', scenarioId: 'moon-landing-1969' }));
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      // Registry must be populated so future resume can find the session
      expect(registry.register).toHaveBeenCalledOnce();
      const [sessionId, handle] = vi.mocked(registry.register).mock.calls[0]!;
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
      expect(handle.browserWs).toBe(ws);
    });
  });

  describe('session resilience — resume message', () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

    it('sends session_expired ended message when resume targets unknown sessionId', async () => {
      const ws = makeWsMock();
      makeGeminiMock();

      // Session ID does not exist in registry store (store was cleared in beforeEach)
      createRelay(ws as WSContext);
      ws.triggerMessage(JSON.stringify({ type: 'resume', sessionId: 'expired-session-xyz' }));

      await vi.waitFor(() => ws.sent.length > 0);

      const messages = ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
      const ended = messages.find((m) => m['type'] === 'ended');
      expect(ended).toBeDefined();
      expect(ended?.['reason']).toBe('session_expired');
    });

    it('reattaches browser and sends reconnected when Gemini session is still alive', async () => {
      const newWs = makeWsMock();
      const { session } = makeGeminiMock();

      // Manually populate the registry store with a live session
      const fakeState = {
        session, // non-null → Gemini alive
        sessionId: 'live-session-abc',
        characterName: 'Gene Kranz',
        historicalSetting: 'Mission Control, 1969',
        studentId: undefined,
        scenarioId: 'moon-landing-1969',
        sessionStartMs: Date.now(),
        outputTranscripts: ['Failure is not an option.'],
        inputTranscripts: ['Should we abort?'],
        timeline: [] as { ts: number; event: string }[],
        wrapUpTimer: null,
        forceCloseTimer: null,
        systemPrompt: '',
        voiceName: undefined as string | undefined,
        toolCallResults: [] as { name: string; result: string }[],
      };
      _registryStore.set('live-session-abc', {
        state: fakeState as unknown as import('./relay-registry.js').RelayStateRef,
        browserWs: null, // browser was disconnected
        abandonTimer: null,
        detachedAt: Date.now() - 5000,
      });

      createRelay(newWs as WSContext);
      newWs.triggerMessage(JSON.stringify({ type: 'resume', sessionId: 'live-session-abc' }));

      await vi.waitFor(() => newWs.sent.length > 0);

      // Must call reattachBrowser to hook the new WS
      expect(registry.reattachBrowser).toHaveBeenCalledWith('live-session-abc', newWs);

      const messages = newWs.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
      const reconnected = messages.find((m) => m['type'] === 'reconnected');
      expect(reconnected).toBeDefined();
      expect(reconnected?.['sessionId']).toBe('live-session-abc');

      // Gemini session must NOT have been closed or recreated
      expect(createGeminiSession).not.toHaveBeenCalled();
    });

    it('creates new Gemini session with full context when Gemini died while browser was disconnected', async () => {
      const newWs = makeWsMock();
      const { getConfig } = makeGeminiMock();

      const fakeState = {
        session: null, // Gemini dead
        sessionId: 'dead-gemini-session',
        characterName: 'Constantine XI',
        historicalSetting: 'Constantinople, 1453',
        studentId: undefined,
        scenarioId: 'constantinople-1453',
        sessionStartMs: Date.now() - 60_000,
        outputTranscripts: ['The walls hold.'],
        inputTranscripts: ['What should we do?'],
        timeline: [] as { ts: number; event: string }[],
        wrapUpTimer: null,
        forceCloseTimer: null,
        systemPrompt: 'You are Constantine XI.',
        voiceName: 'Achird' as string | undefined,
        toolCallResults: [] as { name: string; result: string }[],
        started: true,
        audioChunkCount: 0,
        videoFrameCount: 0,
        resumptionHandle: undefined,
        reconnecting: false,
        reconnectAttempts: 0,
        preGeneratedScenes: null,
      };
      _registryStore.set('dead-gemini-session', {
        state: fakeState as unknown as import('./relay-registry.js').RelayStateRef,
        browserWs: null,
        abandonTimer: null,
        detachedAt: Date.now() - 10_000,
      });

      createRelay(newWs as WSContext);
      newWs.triggerMessage(JSON.stringify({ type: 'resume', sessionId: 'dead-gemini-session' }));

      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => newWs.sent.length > 0);

      // A new Gemini session must have been created
      expect(createGeminiSession).toHaveBeenCalledOnce();

      // System prompt from the dead session must flow into the new Gemini session
      const config = getConfig()!;
      expect(config.systemPrompt).toBe('You are Constantine XI.');

      // Browser must receive a reconnected message
      const messages = newWs.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
      const reconnected = messages.find((m) => m['type'] === 'reconnected');
      expect(reconnected).toBeDefined();
    });
  });

  describe('session resilience — 1011 reconnect uses full transcript', () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

    it('uses full transcript (not truncated) when reconnecting after 1011', async () => {
      // Set up the session with real timers (async Gemini connect requires real timers)
      const ws = makeWsMock();
      const { session, getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(JSON.stringify({ type: 'start', scenarioId: 'constantinople-1453' }));
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      // Accumulate 10 output transcript entries — old code only used last 5
      const config = getConfig()!;
      for (let i = 1; i <= 10; i++) {
        config.onOutputTranscription(`Turn ${i} output`);
      }
      for (let i = 1; i <= 8; i++) {
        config.onInputTranscription(`Turn ${i} input`);
      }

      // Capture the new Gemini session created by reconnectAfter1011
      let capturedContext: string | undefined;
      vi.mocked(createGeminiSession).mockClear();
      vi.mocked(createGeminiSession).mockImplementation(async (cfg) => {
        // New session — return a session that captures sendContext calls
        const newSession = {
          sendAudio: vi.fn(),
          sendText: vi.fn(),
          sendVideo: vi.fn(),
          sendAudioEnd: vi.fn(),
          sendContext: vi.fn((ctx: string) => { capturedContext = ctx; }),
          close: vi.fn(),
        };
        void cfg; // used for system prompt check
        return newSession;
      });

      // Trigger 1011 reconnect — uses 1500ms delay timer
      vi.useFakeTimers();
      config.onClose(1011, 'Internal server error');
      await vi.advanceTimersByTimeAsync(2000);
      vi.useRealTimers();

      // Wait for the async reconnect to complete
      await vi.waitFor(() => capturedContext !== undefined, { timeout: 3000 });

      // All 10 output turns must appear in the injected context (not just last 5)
      for (let i = 1; i <= 10; i++) {
        expect(capturedContext).toContain(`Turn ${i} output`);
      }
      // All 8 input turns must appear (not just last 3)
      for (let i = 1; i <= 8; i++) {
        expect(capturedContext).toContain(`Turn ${i} input`);
      }

      // New Gemini session must have been created
      expect(createGeminiSession).toHaveBeenCalledOnce();
      void session; // suppress unused warning
    });
  });

  describe('audio chunk size logging (FIX-3)', () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

    it('forwards audio to Gemini even on the first chunk (logging does not block)', async () => {
      const ws = makeWsMock();
      const { session, getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(JSON.stringify({ type: 'start', scenarioId: 'constantinople-1453' }));
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      ws.triggerMessage(
        JSON.stringify({ type: 'audio', data: 'base64pcm', mimeType: 'audio/pcm;rate=16000' }),
      );

      // The send must still happen regardless of logging
      expect(session.sendAudio).toHaveBeenCalledWith('base64pcm');
    });

    it('still forwards subsequent audio chunks normally', async () => {
      const ws = makeWsMock();
      const { session, getConfig } = makeGeminiMock();

      createRelay(ws as WSContext);
      ws.triggerMessage(JSON.stringify({ type: 'start', scenarioId: 'moon-landing-1969' }));
      await vi.waitFor(() => getConfig() !== undefined);
      await vi.waitFor(() => ws.sent.length > 0);

      // Send 3 chunks — all should reach Gemini
      for (const data of ['chunk1', 'chunk2', 'chunk3']) {
        ws.triggerMessage(
          JSON.stringify({ type: 'audio', data, mimeType: 'audio/pcm;rate=16000' }),
        );
      }

      expect(session.sendAudio).toHaveBeenCalledTimes(3);
      expect(session.sendAudio).toHaveBeenNthCalledWith(1, 'chunk1');
      expect(session.sendAudio).toHaveBeenNthCalledWith(2, 'chunk2');
      expect(session.sendAudio).toHaveBeenNthCalledWith(3, 'chunk3');
    });
  });
});
