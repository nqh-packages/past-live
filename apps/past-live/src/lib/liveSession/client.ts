/**
 * @what - WebSocket client for the Past, Live Hono relay
 * @why - Manages WS lifecycle, dispatches server messages to Nano Stores, exposes send helpers
 * @exports - connectSession, sendAudio, sendText, sendAudioEnd, disconnect
 */

import {
  $status,
  $error,
  $sessionId,
  $scenarioId,
  $topic,
  $sessionStartTime,
  appendOutputTranscript,
  appendInputTranscript,
} from '../../stores/liveSession';
import { queueAudio, clearAudioQueue } from './audio';
import { createSummaryArtifact } from './summary';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConnectConfig {
  scenarioId?: string;
  topic?: string;
  backendWsUrl: string;
}

// ─── Module state ─────────────────────────────────────────────────────────────

let ws: WebSocket | null = null;

// ─── Connect ──────────────────────────────────────────────────────────────────

export function connectSession(config: ConnectConfig): void {
  if (ws && ws.readyState !== WebSocket.CLOSED) {
    ws.close();
  }

  $status.set('connecting');
  if (config.scenarioId) $scenarioId.set(config.scenarioId);
  if (config.topic) $topic.set(config.topic);
  $sessionStartTime.set(Date.now());

  try {
    ws = new WebSocket(config.backendWsUrl);
  } catch {
    $status.set('error');
    $error.set('Failed to open connection');
    return;
  }

  ws.onopen = () => {
    const startMsg = config.scenarioId
      ? { type: 'start', scenarioId: config.scenarioId }
      : { type: 'start', topic: config.topic };
    ws!.send(JSON.stringify(startMsg));
  };

  ws.onmessage = (event: MessageEvent) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(typeof event.data === 'string' ? event.data : '') as Record<string, unknown>;
    } catch {
      return;
    }
    handleServerMessage(msg);
  };

  ws.onerror = () => {
    $error.set('Connection error');
    $status.set('error');
  };

  ws.onclose = (event: CloseEvent) => {
    const currentStatus = $status.get();
    if (currentStatus !== 'ended') {
      $error.set(event.wasClean ? 'Connection closed' : 'Connection lost');
      $status.set('error');
    }
    ws = null;
    clearAudioQueue();
  };
}

// ─── Message dispatch ─────────────────────────────────────────────────────────

function handleServerMessage(msg: Record<string, unknown>): void {
  const type = msg['type'];

  switch (type) {
    case 'connected': {
      $sessionId.set(typeof msg['sessionId'] === 'string' ? msg['sessionId'] : '');
      $status.set('active');
      break;
    }

    case 'audio': {
      if (typeof msg['data'] === 'string') {
        queueAudio(msg['data']);
      }
      break;
    }

    case 'output_transcription': {
      if (typeof msg['text'] === 'string') {
        appendOutputTranscript(msg['text']);
      }
      break;
    }

    case 'input_transcription': {
      if (typeof msg['text'] === 'string') {
        appendInputTranscript(msg['text']);
      }
      break;
    }

    case 'interrupted': {
      clearAudioQueue();
      break;
    }

    case 'ended': {
      clearAudioQueue();
      const durationMs = Date.now() - $sessionStartTime.get();
      createSummaryArtifact({
        scenarioId: $scenarioId.get(),
        topic: $topic.get(),
        durationMs,
      });
      $status.set('ended');
      break;
    }

    case 'error': {
      $error.set(typeof msg['message'] === 'string' ? msg['message'] : 'Unknown error');
      $status.set('error');
      break;
    }
  }
}

// ─── Send helpers ─────────────────────────────────────────────────────────────

export function sendAudio(base64Data: string): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: 'audio', data: base64Data, mimeType: 'audio/pcm;rate=16000' }));
}

export function sendText(text: string): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: 'text', text }));
}

export function sendAudioEnd(): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: 'audio_end' }));
}

export function disconnect(): void {
  if (ws) {
    ws.close();
    ws = null;
  }
  clearAudioQueue();
}
