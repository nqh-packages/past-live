/**
 * @what - Tests for tool argument validation and handleToolCall routing
 * @why - Gemini can send garbage tool args; validation prevents silent failures
 */

import { describe, it, expect, vi } from 'vitest';
import { validateToolArgs, handleToolCall, buildGeminiCallbacks, type CallbackState, type CallbackActions } from './relay-callbacks.js';

vi.mock('./scene-image.js', () => ({
  generateSceneImage: vi.fn().mockResolvedValue(null),
}));

vi.mock('./logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('./session-persistence.js', () => ({
  updateSession: vi.fn().mockResolvedValue(undefined),
  appendTranscriptTurn: vi.fn().mockResolvedValue(undefined),
}));

function makeState(overrides?: Partial<CallbackState>): CallbackState {
  return {
    sessionId: 'test-session',
    outputTranscripts: [],
    inputTranscripts: [],
    timeline: [],
    resumptionHandle: undefined,
    reconnecting: false,
    reconnectAttempts: 0,
    session: { close: vi.fn() },
    characterName: 'Constantine XI',
    preGeneratedScenes: null,
    toolCallResults: [],
    ...overrides,
  };
}

function makeActions(): CallbackActions & { sent: unknown[] } {
  const sent: unknown[] = [];
  return {
    sent,
    sendToClient: vi.fn((msg: unknown) => sent.push(msg)),
    clearTimers: vi.fn(),
    endSessionWithSummary: vi.fn(),
    handleGoAwayReconnect: vi.fn(),
    reconnectAfter1011: vi.fn(),
  };
}

describe('validateToolArgs', () => {
  describe('end_session', () => {
    it('passes valid reason through unchanged', () => {
      const result = validateToolArgs('end_session', { reason: 'story_complete' });
      expect(result.valid).toBe(true);
      expect(result.sanitized.reason).toBe('story_complete');
      expect(result.reason).toBeUndefined();
    });

    it('defaults reason to story_complete when invalid', () => {
      const result = validateToolArgs('end_session', { reason: 'garbage_value' });
      expect(result.valid).toBe(true);
      expect(result.sanitized.reason).toBe('story_complete');
      expect(result.reason).toBeDefined();
    });

    it('defaults reason when missing', () => {
      const result = validateToolArgs('end_session', {});
      expect(result.valid).toBe(true);
      expect(result.sanitized.reason).toBe('story_complete');
    });
  });

  describe('switch_speaker', () => {
    it('rejects empty speaker name', () => {
      const result = validateToolArgs('switch_speaker', { speaker: 'character', name: '' });
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('rejects missing name', () => {
      const result = validateToolArgs('switch_speaker', { speaker: 'character' });
      expect(result.valid).toBe(false);
    });

    it('trims and caps name at 100 chars', () => {
      const longName = 'A'.repeat(150);
      const result = validateToolArgs('switch_speaker', { speaker: 'character', name: `  ${longName}  ` });
      expect(result.valid).toBe(true);
      expect((result.sanitized.name as string).length).toBe(100);
    });

    it('passes valid name through trimmed', () => {
      const result = validateToolArgs('switch_speaker', { speaker: 'character', name: '  A Messenger  ' });
      expect(result.valid).toBe(true);
      expect(result.sanitized.name).toBe('A Messenger');
    });
  });

  describe('announce_choice', () => {
    it('rejects non-array choices', () => {
      const result = validateToolArgs('announce_choice', { choices: 'not an array' });
      expect(result.valid).toBe(false);
    });

    it('rejects empty choices array', () => {
      const result = validateToolArgs('announce_choice', { choices: [] });
      expect(result.valid).toBe(false);
    });

    it('rejects choices exceeding 4 items', () => {
      const choices = Array.from({ length: 5 }, (_, i) => ({ title: `Option ${i}`, description: `Desc ${i}` }));
      const result = validateToolArgs('announce_choice', { choices });
      expect(result.valid).toBe(false);
    });

    it('rejects choice with empty title', () => {
      const result = validateToolArgs('announce_choice', { choices: [{ title: '', description: 'Valid' }] });
      expect(result.valid).toBe(false);
    });

    it('rejects choice with empty description', () => {
      const result = validateToolArgs('announce_choice', { choices: [{ title: 'Valid', description: '' }] });
      expect(result.valid).toBe(false);
    });

    it('passes valid 2-choice array', () => {
      const choices = [
        { title: 'Fight', description: 'Stand your ground' },
        { title: 'Flee', description: 'Live to fight another day' },
      ];
      const result = validateToolArgs('announce_choice', { choices });
      expect(result.valid).toBe(true);
      expect(result.sanitized.choices).toEqual(choices);
    });
  });

  describe('show_scene', () => {
    it('derives fallback title from description when title is empty', () => {
      const result = validateToolArgs('show_scene', { title: '', description: 'A long enough description for the scene' });
      expect(result.valid).toBe(true);
      expect(result.sanitized.title).toBe('A long enough description for the scene');
    });

    it('derives fallback title from description when title is missing', () => {
      const result = validateToolArgs('show_scene', { description: 'Ships burning in the harbor. The fleet approaches.' });
      expect(result.valid).toBe(true);
      expect(result.sanitized.title).toBe('Ships burning in the harbor');
    });

    it('rejects description shorter than 10 chars', () => {
      const result = validateToolArgs('show_scene', { title: 'Valid', description: 'Short' });
      expect(result.valid).toBe(false);
    });

    it('trims whitespace from title and description', () => {
      const result = validateToolArgs('show_scene', { title: '  The Harbor  ', description: '  Ships are burning in the distance  ' });
      expect(result.valid).toBe(true);
      expect(result.sanitized.title).toBe('The Harbor');
      expect(result.sanitized.description).toBe('Ships are burning in the distance');
    });

    it('passes valid scene args', () => {
      const result = validateToolArgs('show_scene', { title: 'The Siege', description: 'Ottoman cannons firing at the walls of Constantinople' });
      expect(result.valid).toBe(true);
    });
  });

  describe('unknown tool', () => {
    it('passes through unknown tools as valid', () => {
      const result = validateToolArgs('some_future_tool', { foo: 'bar' });
      expect(result.valid).toBe(true);
      expect(result.sanitized).toEqual({ foo: 'bar' });
    });
  });
});

describe('handleToolCall', () => {
  it('skips tool execution when validation fails', () => {
    const state = makeState();
    const actions = makeActions();
    handleToolCall('announce_choice', { choices: 'not array' }, state, actions);
    // Should NOT send choices to client — only a tool_call_invalid timeline entry
    const choiceMsg = actions.sent.find((m: any) => m.type === 'choices');
    expect(choiceMsg).toBeUndefined();
  });

  it('logs timeline entry on invalid tool call', () => {
    const state = makeState();
    const actions = makeActions();
    handleToolCall('show_scene', { title: '', description: '' }, state, actions);
    const invalidEntry = state.timeline.find((e) => e.event.startsWith('tool_call_invalid'));
    expect(invalidEntry).toBeDefined();
  });

  it('uses sanitized args for valid tool calls', () => {
    const state = makeState();
    const actions = makeActions();
    handleToolCall('switch_speaker', { speaker: 'character', name: '  A Messenger  ' }, state, actions);
    const switchMsg = actions.sent.find((m: any) => m.type === 'speaker_switch') as any;
    expect(switchMsg).toBeDefined();
    expect(switchMsg.name).toBe('A Messenger');
  });
});

describe('buildGeminiCallbacks — onClose', () => {
  it('sends ended message for clean close (no code)', () => {
    const state = makeState();
    const actions = makeActions();
    const callbacks = buildGeminiCallbacks(state, actions);

    callbacks.onClose();

    const msg = actions.sent.find((m: any) => m.type === 'ended') as any;
    expect(msg).toBeDefined();
    expect(msg.reason).toBe('session_closed');
  });

  it('triggers reconnect on first 1011 instead of sending error', () => {
    const state = makeState({ reconnectAttempts: 0 });
    const actions = makeActions();
    const callbacks = buildGeminiCallbacks(state, actions);

    callbacks.onClose(1011, 'Internal server error');

    // Should send reconnecting message, not error
    const reconnectingMsg = actions.sent.find((m: any) => m.type === 'reconnecting') as any;
    expect(reconnectingMsg).toBeDefined();
    expect(reconnectingMsg.attempt).toBe(1);

    const errorMsg = actions.sent.find((m: any) => m.type === 'error');
    expect(errorMsg).toBeUndefined();
  });

  it('triggers reconnect on second 1011 (attempt 2)', () => {
    const state = makeState({ reconnectAttempts: 1 });
    const actions = makeActions();
    const callbacks = buildGeminiCallbacks(state, actions);

    callbacks.onClose(1011, 'Internal server error');

    const reconnectingMsg = actions.sent.find((m: any) => m.type === 'reconnecting') as any;
    expect(reconnectingMsg).toBeDefined();
    expect(reconnectingMsg.attempt).toBe(2);
  });

  it('sends error message on 1011 when reconnect attempts exhausted (>=2)', () => {
    const state = makeState({ reconnectAttempts: 2 });
    const actions = makeActions();
    const callbacks = buildGeminiCallbacks(state, actions);

    callbacks.onClose(1011, 'Internal server error');

    const errorMsg = actions.sent.find((m: any) => m.type === 'error') as any;
    expect(errorMsg).toBeDefined();
    expect(errorMsg.message).toBe('Connection dropped — try again');

    const reconnectingMsg = actions.sent.find((m: any) => m.type === 'reconnecting');
    expect(reconnectingMsg).toBeUndefined();
  });

  it('calls reconnectAfter1011 action after 1011 with attempts remaining', async () => {
    vi.useFakeTimers();
    const state = makeState({ reconnectAttempts: 0 });
    const actions = makeActions();
    const callbacks = buildGeminiCallbacks(state, actions);

    callbacks.onClose(1011, 'Internal server error');
    await vi.advanceTimersByTimeAsync(1500);
    vi.useRealTimers();

    expect(actions.reconnectAfter1011).toHaveBeenCalledOnce();
  });

  it('does not call reconnectAfter1011 when attempts exhausted', async () => {
    vi.useFakeTimers();
    const state = makeState({ reconnectAttempts: 2 });
    const actions = makeActions();
    const callbacks = buildGeminiCallbacks(state, actions);

    callbacks.onClose(1011, 'Internal server error');
    await vi.advanceTimersByTimeAsync(1500);
    vi.useRealTimers();

    expect(actions.reconnectAfter1011).not.toHaveBeenCalled();
  });

  it('sends ended message for clean close with code 1000', () => {
    const state = makeState();
    const actions = makeActions();
    const callbacks = buildGeminiCallbacks(state, actions);

    callbacks.onClose(1000, 'Normal closure');

    const msg = actions.sent.find((m: any) => m.type === 'ended') as any;
    expect(msg).toBeDefined();
    expect(msg.reason).toBe('session_closed');
  });

  it('clears timers when 1011 attempts are exhausted', () => {
    const state = makeState({ reconnectAttempts: 2 });
    const actions = makeActions();
    const callbacks = buildGeminiCallbacks(state, actions);

    callbacks.onClose(1011, 'Internal server error');

    expect(actions.clearTimers).toHaveBeenCalledOnce();
  });

  it('does not clear timers on 1011 when reconnect is triggered (keeps session alive)', () => {
    const state = makeState({ reconnectAttempts: 0 });
    const actions = makeActions();
    const callbacks = buildGeminiCallbacks(state, actions);

    callbacks.onClose(1011, 'Internal server error');

    expect(actions.clearTimers).not.toHaveBeenCalled();
  });

  it('does nothing when reconnecting flag is set', () => {
    const state = makeState({ reconnecting: true });
    const actions = makeActions();
    const callbacks = buildGeminiCallbacks(state, actions);

    callbacks.onClose(1011, 'Internal server error');

    expect(actions.sent).toHaveLength(0);
    expect(actions.clearTimers).not.toHaveBeenCalled();
  });
});
