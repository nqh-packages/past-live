/**
 * WebSocket protocol types and parse/serialize functions.
 * Single source of truth for all message shapes between browser and Hono.
 * Pure functions only — no I/O, no external imports.
 */

// ─── Client → Hono ───────────────────────────────────────────────────────────

export type ClientMessage =
  | { type: 'audio'; data: string; mimeType: 'audio/pcm;rate=16000' }
  | { type: 'text'; text: string }
  | { type: 'video'; data: string; mimeType: 'image/jpeg' }
  | { type: 'audio_end' }
  | { type: 'start'; scenarioId?: string; topic?: string; studentName?: string };

// ─── Hono → Client ───────────────────────────────────────────────────────────

export type ServerMessage =
  | { type: 'connected'; sessionId: string }
  | { type: 'audio'; data: string }
  | { type: 'output_transcription'; text: string }
  | { type: 'input_transcription'; text: string }
  | { type: 'interrupted' }
  | { type: 'error'; message: string }
  | { type: 'ended'; reason: string };

// ─── Derived union members ────────────────────────────────────────────────────

export type ClientMessageType = ClientMessage['type'];
export type ServerMessageType = ServerMessage['type'];

// ─── Parse ────────────────────────────────────────────────────────────────────

const CLIENT_TYPES = new Set<ClientMessageType>([
  'audio', 'text', 'video', 'audio_end', 'start',
]);

/**
 * Parse and validate a raw WebSocket message string from the browser.
 * Throws a descriptive Error on any validation failure.
 */
export function parseClientMessage(raw: string): ClientMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid JSON');
  }

  const obj = parsed as Record<string, unknown>;
  const type = obj['type'];

  if (typeof type !== 'string' || !CLIENT_TYPES.has(type as ClientMessageType)) {
    throw new Error(`Unknown message type: ${String(type)}`);
  }

  switch (type as ClientMessageType) {
    case 'audio':
      if (typeof obj['data'] !== 'string') throw new Error('audio requires data');
      if (typeof obj['mimeType'] !== 'string') throw new Error('audio requires mimeType');
      return { type: 'audio', data: obj['data'], mimeType: obj['mimeType'] as 'audio/pcm;rate=16000' };

    case 'text':
      if (typeof obj['text'] !== 'string') throw new Error('text requires text');
      return { type: 'text', text: obj['text'] };

    case 'video':
      if (typeof obj['data'] !== 'string') throw new Error('video requires data');
      if (typeof obj['mimeType'] !== 'string') throw new Error('video requires mimeType');
      return { type: 'video', data: obj['data'], mimeType: obj['mimeType'] as 'image/jpeg' };

    case 'audio_end':
      return { type: 'audio_end' };

    case 'start': {
      const hasScenario = typeof obj['scenarioId'] === 'string';
      const hasTopic = typeof obj['topic'] === 'string';
      if (hasScenario === hasTopic) {
        throw new Error('start requires exactly one of scenarioId or topic');
      }
      const studentName = typeof obj['studentName'] === 'string' ? obj['studentName'] : undefined;
      return hasScenario
        ? { type: 'start', scenarioId: obj['scenarioId'] as string, studentName }
        : { type: 'start', topic: obj['topic'] as string, studentName };
    }
  }
}

// ─── Serialize ────────────────────────────────────────────────────────────────

/**
 * Serialize a server message to a JSON string for sending over WebSocket.
 * Always uses `output_transcription` — never `subtitle`.
 */
export function serializeServerMessage(msg: ServerMessage): string {
  return JSON.stringify(msg);
}
