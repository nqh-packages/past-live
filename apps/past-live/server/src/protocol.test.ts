import { describe, it, expect } from 'vitest';
import { parseClientMessage, serializeServerMessage } from './protocol.js';
import type { ClientMessage, ServerMessage } from './protocol.js';

// ─── parseClientMessage ───────────────────────────────────────────────────────

describe('parseClientMessage', () => {
  describe('invalid JSON', () => {
    it('throws on malformed JSON string', () => {
      expect(() => parseClientMessage('not-json')).toThrow('Invalid JSON');
    });

    it('throws on empty string', () => {
      expect(() => parseClientMessage('')).toThrow('Invalid JSON');
    });
  });

  describe('unknown type', () => {
    it('throws when type field is missing', () => {
      expect(() => parseClientMessage('{"data":"abc"}')).toThrow('Unknown message type');
    });

    it('throws when type is not a recognised value', () => {
      expect(() => parseClientMessage('{"type":"ping"}')).toThrow('Unknown message type');
    });
  });

  describe('audio message', () => {
    it('parses a valid audio message', () => {
      const msg = parseClientMessage(
        JSON.stringify({ type: 'audio', data: 'AAEC', mimeType: 'audio/pcm;rate=16000' }),
      );
      expect(msg).toEqual<ClientMessage>({
        type: 'audio',
        data: 'AAEC',
        mimeType: 'audio/pcm;rate=16000',
      });
    });

    it('throws when data is missing', () => {
      expect(() =>
        parseClientMessage(JSON.stringify({ type: 'audio', mimeType: 'audio/pcm;rate=16000' })),
      ).toThrow('audio requires data');
    });

    it('throws when mimeType is missing', () => {
      expect(() =>
        parseClientMessage(JSON.stringify({ type: 'audio', data: 'AAEC' })),
      ).toThrow('audio requires mimeType');
    });
  });

  describe('text message', () => {
    it('parses a valid text message', () => {
      const msg = parseClientMessage(JSON.stringify({ type: 'text', text: 'Hello' }));
      expect(msg).toEqual<ClientMessage>({ type: 'text', text: 'Hello' });
    });

    it('throws when text field is missing', () => {
      expect(() => parseClientMessage(JSON.stringify({ type: 'text' }))).toThrow(
        'text requires text',
      );
    });
  });

  describe('video message', () => {
    it('parses a valid video message', () => {
      const msg = parseClientMessage(
        JSON.stringify({ type: 'video', data: '/9j/abc', mimeType: 'image/jpeg' }),
      );
      expect(msg).toEqual<ClientMessage>({
        type: 'video',
        data: '/9j/abc',
        mimeType: 'image/jpeg',
      });
    });

    it('throws when data is missing', () => {
      expect(() =>
        parseClientMessage(JSON.stringify({ type: 'video', mimeType: 'image/jpeg' })),
      ).toThrow('video requires data');
    });

    it('throws when mimeType is missing', () => {
      expect(() =>
        parseClientMessage(JSON.stringify({ type: 'video', data: '/9j/abc' })),
      ).toThrow('video requires mimeType');
    });
  });

  describe('audio_end message', () => {
    it('parses a valid audio_end message', () => {
      const msg = parseClientMessage(JSON.stringify({ type: 'audio_end' }));
      expect(msg).toEqual<ClientMessage>({ type: 'audio_end' });
    });

    it('ignores extra fields on audio_end', () => {
      const msg = parseClientMessage(JSON.stringify({ type: 'audio_end', extra: 'ignored' }));
      expect(msg.type).toBe('audio_end');
    });
  });

  describe('start message', () => {
    it('parses start with scenarioId only', () => {
      const msg = parseClientMessage(
        JSON.stringify({ type: 'start', scenarioId: 'constantinople' }),
      );
      expect(msg).toEqual<ClientMessage>({ type: 'start', scenarioId: 'constantinople' });
    });

    it('parses start with topic only', () => {
      const msg = parseClientMessage(JSON.stringify({ type: 'start', topic: 'french revolution' }));
      expect(msg).toEqual<ClientMessage>({ type: 'start', topic: 'french revolution' });
    });

    it('parses start with optional studentName alongside scenarioId', () => {
      const msg = parseClientMessage(
        JSON.stringify({ type: 'start', scenarioId: 'moon', studentName: 'Ana' }),
      );
      expect(msg).toEqual<ClientMessage>({
        type: 'start',
        scenarioId: 'moon',
        studentName: 'Ana',
      });
    });

    it('parses start with optional studentName alongside topic', () => {
      const msg = parseClientMessage(
        JSON.stringify({ type: 'start', topic: 'vikings', studentName: 'Luca' }),
      );
      expect(msg).toEqual<ClientMessage>({
        type: 'start',
        topic: 'vikings',
        studentName: 'Luca',
      });
    });

    it('throws when both scenarioId and topic are provided', () => {
      expect(() =>
        parseClientMessage(
          JSON.stringify({ type: 'start', scenarioId: 'moon', topic: 'french revolution' }),
        ),
      ).toThrow('start requires exactly one of scenarioId or topic');
    });

    it('throws when neither scenarioId nor topic is provided', () => {
      expect(() => parseClientMessage(JSON.stringify({ type: 'start' }))).toThrow(
        'start requires exactly one of scenarioId or topic',
      );
    });

    it('throws when only studentName is provided with no scenarioId or topic', () => {
      expect(() =>
        parseClientMessage(JSON.stringify({ type: 'start', studentName: 'Ana' })),
      ).toThrow('start requires exactly one of scenarioId or topic');
    });

    it('parses start with voiceName alongside scenarioId', () => {
      const msg = parseClientMessage(
        JSON.stringify({ type: 'start', scenarioId: 'constantinople', voiceName: 'Gacrux' }),
      );
      expect(msg).toEqual<ClientMessage>({
        type: 'start',
        scenarioId: 'constantinople',
        voiceName: 'Gacrux',
      });
    });

    it('parses start with voiceName alongside topic', () => {
      const msg = parseClientMessage(
        JSON.stringify({ type: 'start', topic: 'moon landing', voiceName: 'Charon' }),
      );
      expect(msg).toEqual<ClientMessage>({
        type: 'start',
        topic: 'moon landing',
        voiceName: 'Charon',
      });
    });

    it('parses start without voiceName (backward compat)', () => {
      const msg = parseClientMessage(
        JSON.stringify({ type: 'start', scenarioId: 'moon' }),
      );
      expect(msg).toEqual<ClientMessage>({ type: 'start', scenarioId: 'moon' });
      expect((msg as { voiceName?: string }).voiceName).toBeUndefined();
    });

    it('parses start with all optional fields: studentName + voiceName + scenarioId', () => {
      const msg = parseClientMessage(
        JSON.stringify({ type: 'start', scenarioId: 'mongol', studentName: 'Luca', voiceName: 'Algenib' }),
      );
      expect(msg).toEqual<ClientMessage>({
        type: 'start',
        scenarioId: 'mongol',
        studentName: 'Luca',
        voiceName: 'Algenib',
      });
    });
  });
});

// ─── serializeServerMessage ───────────────────────────────────────────────────

describe('serializeServerMessage', () => {
  it('serializes connected message', () => {
    const result = serializeServerMessage({ type: 'connected', sessionId: 'sess-1' });
    expect(JSON.parse(result)).toEqual({ type: 'connected', sessionId: 'sess-1' });
  });

  it('serializes audio message', () => {
    const result = serializeServerMessage({ type: 'audio', data: 'AAEC' });
    expect(JSON.parse(result)).toEqual({ type: 'audio', data: 'AAEC' });
  });

  it('serializes output_transcription message', () => {
    const result = serializeServerMessage({ type: 'output_transcription', text: 'Hello world' });
    expect(JSON.parse(result)).toEqual({ type: 'output_transcription', text: 'Hello world' });
  });

  it('serializes input_transcription message', () => {
    const result = serializeServerMessage({ type: 'input_transcription', text: 'What happened?' });
    expect(JSON.parse(result)).toEqual({ type: 'input_transcription', text: 'What happened?' });
  });

  it('serializes interrupted message', () => {
    const result = serializeServerMessage({ type: 'interrupted' });
    expect(JSON.parse(result)).toEqual({ type: 'interrupted' });
  });

  it('serializes error message', () => {
    const result = serializeServerMessage({ type: 'error', message: 'Connection failed' });
    expect(JSON.parse(result)).toEqual({ type: 'error', message: 'Connection failed' });
  });

  it('serializes ended message', () => {
    const result = serializeServerMessage({ type: 'ended', reason: 'session complete' });
    expect(JSON.parse(result)).toEqual({ type: 'ended', reason: 'session complete' });
  });

  it('returns a string', () => {
    expect(typeof serializeServerMessage({ type: 'interrupted' })).toBe('string');
  });

  it('never emits subtitle type — always output_transcription', () => {
    const result = serializeServerMessage({ type: 'output_transcription', text: 'x' });
    expect(result).not.toContain('"subtitle"');
    expect(result).toContain('"output_transcription"');
  });

  it('serializes speaker_switch message with character speaker and name', () => {
    const result = serializeServerMessage({
      type: 'speaker_switch',
      speaker: 'character',
      name: 'A MESSENGER',
    });
    expect(JSON.parse(result)).toEqual<ServerMessage>({
      type: 'speaker_switch',
      speaker: 'character',
      name: 'A MESSENGER',
    });
  });

  it('serializes choices message with title and description array', () => {
    const result = serializeServerMessage({
      type: 'choices',
      choices: [
        { title: 'Hold the walls', description: 'Focus all defenses on the outer walls.' },
        { title: 'Negotiate', description: 'Send an envoy to the Ottoman camp.' },
      ],
    });
    expect(JSON.parse(result)).toEqual<ServerMessage>({
      type: 'choices',
      choices: [
        { title: 'Hold the walls', description: 'Focus all defenses on the outer walls.' },
        { title: 'Negotiate', description: 'Send an envoy to the Ottoman camp.' },
      ],
    });
  });

  it('serializes choices message with a single choice', () => {
    const result = serializeServerMessage({
      type: 'choices',
      choices: [{ title: 'Stand firm', description: 'Remain in position.' }],
    });
    const parsed = JSON.parse(result) as ServerMessage;
    expect(parsed.type).toBe('choices');
  });
});
