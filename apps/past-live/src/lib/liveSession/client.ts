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
  $characterName,
  $isSpeaking,
  $activeChoices,
  appendOutputTranscript,
  appendInputTranscript,
  addMessage,
  replaceLastMessage,
} from '../../stores/liveSession';
import { queueAudio, clearAudioQueue } from './audio';
import { createSummaryArtifact } from './summary';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConnectConfig {
  scenarioId?: string;
  topic?: string;
  voiceName?: string;
  backendWsUrl: string;
}

// ─── Module state ─────────────────────────────────────────────────────────────

let ws: WebSocket | null = null;

/**
 * Suppress flag for ghost text after interruption.
 * When the model is interrupted, its next 1-2 transcription events are stale
 * audio that was already being spoken — we suppress them to avoid ghost messages.
 */
let suppressTranscriptionCount = 0;

// ─── Connect ──────────────────────────────────────────────────────────────────

export function connectSession(config: ConnectConfig): void {
  if (ws && ws.readyState !== WebSocket.CLOSED) {
    ws.close();
  }

  suppressTranscriptionCount = 0;
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
      ? { type: 'start', scenarioId: config.scenarioId, voiceName: config.voiceName }
      : { type: 'start', topic: config.topic, voiceName: config.voiceName };
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
        const text = msg['text'];

        // Suppress stale chunks following an interruption (ghost text fix)
        if (suppressTranscriptionCount > 0) {
          suppressTranscriptionCount--;
          break;
        }

        // Backward compat: still update $outputTranscript
        appendOutputTranscript(text);

        // Message accumulation: character name is sender for model speech
        // addMessage handles same-sender accumulation vs new message automatically
        const sender = $characterName.get();
        addMessage(sender, text);
      }
      break;
    }

    case 'input_transcription': {
      if (typeof msg['text'] === 'string') {
        const text = msg['text'];
        appendInputTranscript(text);
        // Gemini sends cumulative text (not deltas) — replace rather than append
        // to avoid duplicating previously displayed content
        replaceLastMessage('YOU', text);
        // Auto-dismiss choice cards when student speaks
        if ($activeChoices.get()) $activeChoices.set(null);
      }
      break;
    }

    case 'speaker_switch': {
      const name = (msg as { name?: string }).name;
      if (name) $characterName.set(name);
      break;
    }

    case 'choices': {
      const choices = (msg as { choices?: { title: string; description: string }[] }).choices;
      if (choices) $activeChoices.set(choices);
      break;
    }

    case 'interrupted': {
      // Suppress next 1-2 output_transcription events — they're already-spoken stale chunks
      suppressTranscriptionCount = 2;
      clearAudioQueue();
      $isSpeaking.set(false);
      break;
    }

    case 'ended': {
      clearAudioQueue();
      $activeChoices.set(null);
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
