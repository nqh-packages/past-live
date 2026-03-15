import { describe, it, expect } from 'vitest';
import { parseClientMessage, serializeServerMessage } from './protocol.js';
import type { ClientMessage, ServerMessage } from './protocol.js';
import type { PostCallSummary } from './post-call-summary.js';

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
        JSON.stringify({ type: 'start', scenarioId: 'constantinople', voiceName: 'Achird' }),
      );
      expect(msg).toEqual<ClientMessage>({
        type: 'start',
        scenarioId: 'constantinople',
        voiceName: 'Achird',
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

  it('serializes reconnecting message with attempt number', () => {
    const result = serializeServerMessage({ type: 'reconnecting', attempt: 1 });
    expect(JSON.parse(result)).toEqual({ type: 'reconnecting', attempt: 1 });
  });

  it('serializes reconnected message with sessionId', () => {
    const result = serializeServerMessage({ type: 'reconnected', sessionId: 'new-session-xyz' });
    expect(JSON.parse(result)).toEqual({ type: 'reconnected', sessionId: 'new-session-xyz' });
  });

  it('serializes reconnecting message with attempt 2', () => {
    const result = serializeServerMessage({ type: 'reconnecting', attempt: 2 });
    const parsed = JSON.parse(result) as Record<string, unknown>;
    expect(parsed['type']).toBe('reconnecting');
    expect(parsed['attempt']).toBe(2);
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

  describe('ended message with optional summary', () => {
    it('serializes ended message without summary (backward compat)', () => {
      const result = serializeServerMessage({ type: 'ended', reason: 'story_complete' });
      const parsed = JSON.parse(result) as Record<string, unknown>;
      expect(parsed['type']).toBe('ended');
      expect(parsed['reason']).toBe('story_complete');
      // summary key should not be present when not provided
      expect('summary' in parsed ? parsed['summary'] : undefined).toBeUndefined();
    });

    it('serializes ended message with summary object', () => {
      const summary: PostCallSummary = {
        keyFacts: ['The harbor chain held the strait.', 'Seventy ships crossed overland.'],
        outcomeComparison: 'The city fell on May 29, 1453.',
        characterMessage: 'You asked the right questions, stranger.',
        suggestedCalls: [
          { name: 'Mehmed II', era: 'Ottoman Empire, 1453', hook: 'I built the cannons that broke your walls.' },
        ],
      };

      const result = serializeServerMessage({ type: 'ended', reason: 'story_complete', summary });
      const parsed = JSON.parse(result) as Record<string, unknown>;

      expect(parsed['type']).toBe('ended');
      expect(parsed['reason']).toBe('story_complete');
      expect(parsed['summary']).toEqual(summary);
    });

    it('serializes ended message with all summary fields intact', () => {
      const summary: PostCallSummary = {
        keyFacts: ['fact one', 'fact two', 'fact three'],
        outcomeComparison: 'Historical outcome here.',
        characterMessage: 'Character farewell message.',
        suggestedCalls: [
          { name: 'Person A', era: 'Era A', hook: 'Hook A' },
          { name: 'Person B', era: 'Era B', hook: 'Hook B' },
          { name: 'Person C', era: 'Era C', hook: 'Hook C' },
        ],
      };

      const result = serializeServerMessage({ type: 'ended', reason: 'timeout', summary });
      const parsed = JSON.parse(result) as { summary: PostCallSummary };

      expect(parsed.summary.keyFacts).toHaveLength(3);
      expect(parsed.summary.suggestedCalls).toHaveLength(3);
      expect(parsed.summary.characterMessage).toBe('Character farewell message.');
    });
  });
});

// ─── parseClientMessage — start with storyScript ─────────────────────────────

describe('parseClientMessage — start with storyScript', () => {
  const minimalStoryScript = {
    personality: {
      voice: 'Casual and direct',
      humor: 'Understatement of absurd facts',
      quirks: 'Ends observations with rhetorical questions',
      energy: 'Calm authority with dry wit',
      celebrityAnchor: 'Jennifer Coolidge playing a pharaoh',
    },
    hooks: [
      { myth: 'She was Egyptian', truth: 'She was Macedonian Greek', surprise: 'She was the first ruler of her dynasty to speak Egyptian', anchor: 'Like learning the language of the team you just joined' },
      { myth: 'She seduced Caesar', truth: 'She smuggled herself to him in a linen sack', surprise: 'Not a carpet — a boat sail', anchor: 'Like showing up to a job interview through the ventilation shaft' },
      { myth: 'She was beautiful', truth: 'Ancient sources rarely mention her looks', surprise: 'They mention her voice and wit', anchor: 'Like someone who walks into a room and everyone just listens' },
    ],
    facts: ['She spoke nine languages', 'She was the last active ruler of the Ptolemaic Kingdom', 'She used poison in experiments on condemned criminals'],
    choices: [{ setup: 'Caesar is dead. Two options.', options: [{ title: 'Flee to Egypt', description: 'Sail home with Caesarion' }, { title: 'Stay in Rome', description: 'Negotiate with the Senate' }], consequences: { 'Flee to Egypt': 'That is what she did.' } }],
    scenes: [{ title: 'The Golden Barge', description: 'Golden barge on the Nile, sails of purple silk, silver oars' }],
    closingThread: 'You asked about power. She had it without the title.',
  };

  it('extracts storyScript object from start message with topic', () => {
    const msg = parseClientMessage(
      JSON.stringify({ type: 'start', topic: 'Cleopatra', storyScript: minimalStoryScript }),
    );
    expect(msg.type).toBe('start');
    expect((msg as { storyScript?: unknown }).storyScript).toEqual(minimalStoryScript);
  });

  it('extracts storyScript object from start message with scenarioId', () => {
    const msg = parseClientMessage(
      JSON.stringify({ type: 'start', scenarioId: 'constantinople-1453', storyScript: minimalStoryScript }),
    );
    expect((msg as { storyScript?: unknown }).storyScript).toEqual(minimalStoryScript);
  });

  it('returns undefined storyScript when field is absent', () => {
    const msg = parseClientMessage(
      JSON.stringify({ type: 'start', topic: 'moon landing' }),
    );
    expect((msg as { storyScript?: unknown }).storyScript).toBeUndefined();
  });

  it('returns undefined storyScript when field is null', () => {
    const msg = parseClientMessage(
      JSON.stringify({ type: 'start', topic: 'moon landing', storyScript: null }),
    );
    expect((msg as { storyScript?: unknown }).storyScript).toBeUndefined();
  });

  it('returns undefined storyScript when field is a string (wrong type)', () => {
    const msg = parseClientMessage(
      JSON.stringify({ type: 'start', topic: 'moon landing', storyScript: 'not-an-object' }),
    );
    expect((msg as { storyScript?: unknown }).storyScript).toBeUndefined();
  });

  it('returns undefined storyScript when field is a number', () => {
    const msg = parseClientMessage(
      JSON.stringify({ type: 'start', topic: 'moon landing', storyScript: 42 }),
    );
    expect((msg as { storyScript?: unknown }).storyScript).toBeUndefined();
  });

  it('still requires exactly one of scenarioId or topic even when storyScript is present', () => {
    expect(() =>
      parseClientMessage(
        JSON.stringify({ type: 'start', storyScript: minimalStoryScript }),
      ),
    ).toThrow('start requires exactly one of scenarioId or topic');
  });

  it('still rejects both scenarioId and topic when storyScript is present', () => {
    expect(() =>
      parseClientMessage(
        JSON.stringify({ type: 'start', scenarioId: 'moon', topic: 'french revolution', storyScript: minimalStoryScript }),
      ),
    ).toThrow('start requires exactly one of scenarioId or topic');
  });

  it('preserves all other start fields alongside storyScript', () => {
    const msg = parseClientMessage(
      JSON.stringify({
        type: 'start',
        topic: 'Cleopatra',
        characterName: 'CLEOPATRA VII',
        historicalSetting: 'Alexandria, Egypt, 48 BC',
        voiceName: 'Achird',
        studentId: 'user-123',
        storyScript: minimalStoryScript,
      }),
    );
    const casted = msg as {
      type: 'start';
      topic?: string;
      characterName?: string;
      historicalSetting?: string;
      voiceName?: string;
      studentId?: string;
      storyScript?: unknown;
    };
    expect(casted.topic).toBe('Cleopatra');
    expect(casted.characterName).toBe('CLEOPATRA VII');
    expect(casted.historicalSetting).toBe('Alexandria, Egypt, 48 BC');
    expect(casted.voiceName).toBe('Achird');
    expect(casted.studentId).toBe('user-123');
    expect(casted.storyScript).toEqual(minimalStoryScript);
  });
});

// ─── parseClientMessage — start with new context fields ──────────────────────

describe('parseClientMessage — start with characterName and historicalSetting', () => {
  it('parses start with characterName alongside topic', () => {
    const msg = parseClientMessage(
      JSON.stringify({ type: 'start', topic: 'French Revolution', characterName: 'ROBESPIERRE' }),
    );
    expect(msg.type).toBe('start');
    expect((msg as { characterName?: string }).characterName).toBe('ROBESPIERRE');
  });

  it('parses start with historicalSetting alongside topic', () => {
    const msg = parseClientMessage(
      JSON.stringify({ type: 'start', topic: 'French Revolution', historicalSetting: 'Paris, 1789' }),
    );
    expect(msg.type).toBe('start');
    expect((msg as { historicalSetting?: string }).historicalSetting).toBe('Paris, 1789');
  });

  it('parses start with both characterName and historicalSetting', () => {
    const msg = parseClientMessage(
      JSON.stringify({
        type: 'start',
        topic: 'French Revolution',
        characterName: 'ROBESPIERRE',
        historicalSetting: 'Paris, 1789',
      }),
    );
    expect((msg as { characterName?: string }).characterName).toBe('ROBESPIERRE');
    expect((msg as { historicalSetting?: string }).historicalSetting).toBe('Paris, 1789');
  });

  it('parses start with characterName alongside scenarioId', () => {
    const msg = parseClientMessage(
      JSON.stringify({ type: 'start', scenarioId: 'moon', characterName: 'GENE KRANZ' }),
    );
    expect((msg as { characterName?: string }).characterName).toBe('GENE KRANZ');
  });

  it('parses start without characterName (backward compat)', () => {
    const msg = parseClientMessage(
      JSON.stringify({ type: 'start', topic: 'moon landing' }),
    );
    expect((msg as { characterName?: string }).characterName).toBeUndefined();
  });

  it('parses start without historicalSetting (backward compat)', () => {
    const msg = parseClientMessage(
      JSON.stringify({ type: 'start', topic: 'moon landing' }),
    );
    expect((msg as { historicalSetting?: string }).historicalSetting).toBeUndefined();
  });

  it('ignores non-string characterName field', () => {
    const msg = parseClientMessage(
      JSON.stringify({ type: 'start', topic: 'test', characterName: 42 }),
    );
    // Non-string values are ignored, field should be undefined
    expect((msg as { characterName?: string }).characterName).toBeUndefined();
  });

  it('ignores non-string historicalSetting field', () => {
    const msg = parseClientMessage(
      JSON.stringify({ type: 'start', topic: 'test', historicalSetting: true }),
    );
    expect((msg as { historicalSetting?: string }).historicalSetting).toBeUndefined();
  });
});
