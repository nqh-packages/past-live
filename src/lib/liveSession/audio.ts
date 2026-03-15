/**
 * @what - Mic capture (PCM 16kHz) and audio playback (PCM 24kHz) for live session
 * @why - Isolates Web Audio API complexity; callbacks are injected from client.ts / SessionManager
 * @exports - startMic, stopMic, queueAudio, clearAudioQueue, setAudioCallbacks, preWarmAudioContext,
 *            notifyModelSpeaking, suppressAudio, unsuppressAudioDebounced
 */

import { $micLevel as micLevel } from '../../stores/liveSession';

// ─── Callback injection (avoids circular import with client.ts) ───────────────

type SendAudioFn = (base64: string) => void;
type SendAudioEndFn = () => void;
type PlaybackChangeFn = (playing: boolean) => void;

let _sendAudio: SendAudioFn = () => {};
let _sendAudioEnd: SendAudioEndFn = () => {};
let _onPlaybackChange: PlaybackChangeFn = () => {};

/**
 * Called once by SessionManager to wire client.ts send helpers and playback state callbacks.
 * Replaces the old `setAudioSendCallbacks` — broader scope now includes playback events.
 */
export function setAudioCallbacks(
  send: SendAudioFn,
  sendEnd: SendAudioEndFn,
  onPlaybackChange?: PlaybackChangeFn,
): void {
  _sendAudio = send;
  _sendAudioEnd = sendEnd;
  if (onPlaybackChange) _onPlaybackChange = onPlaybackChange;
}

/** @deprecated Use setAudioCallbacks instead */
export function setAudioSendCallbacks(send: SendAudioFn, sendEnd: SendAudioEndFn): void {
  setAudioCallbacks(send, sendEnd);
}

// ─── Echo gate ───────────────────────────────────────────────────────────────

/**
 * Timestamp of last model audio output. Used for echo suppression:
 * mic input is dropped for ECHO_GATE_MS after model speaks to prevent
 * the speaker output from being picked up as user speech.
 *
 * @inference - Browser echoCancellation handles most feedback, but
 *   aggressive VAD can still trigger on residual speaker bleed.
 *   300ms gate is the sweet spot (orion uses 300ms, shadow uses 1000ms).
 */
const ECHO_GATE_MS = 300;
let lastModelAudioMs = 0;

/**
 * Called by client.ts when model audio is received — updates the echo gate timestamp.
 * Separate from playback callbacks to track audio arrival, not playback completion.
 */
export function notifyModelSpeaking(): void {
  lastModelAudioMs = Date.now();
}

function isEchoGateActive(): boolean {
  return Date.now() - lastModelAudioMs < ECHO_GATE_MS;
}

// ─── Barge-in suppression ────────────────────────────────────────────────────
//
// When the student starts speaking (input_transcription), immediately suppress
// model audio playback — stale chunks from the previous response would overlap.
// Unsuppress (with debounce) when new model output arrives.

let audioSuppressed = false;
let unsuppressTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Safety ceiling: if suppressAudio() is called but unsuppressAudioDebounced()
 * is never called (e.g. model sends audio without transcription events),
 * auto-unsuppress after this many ms to prevent permanent audio silence.
 */
const SUPPRESS_SAFETY_MS = 3000;

/** Immediately suppress model audio playback (student is interrupting). */
export function suppressAudio(): void {
  audioSuppressed = true;
  if (unsuppressTimer) { clearTimeout(unsuppressTimer); unsuppressTimer = null; }
  // Safety fallback: auto-unsuppress after SUPPRESS_SAFETY_MS if nothing else does it.
  // Prevents permanent suppression when model sends audio without transcription events.
  unsuppressTimer = setTimeout(() => {
    audioSuppressed = false;
    unsuppressTimer = null;
  }, SUPPRESS_SAFETY_MS);
}

/** Unsuppress after debounce — model is producing new output, safe to play. */
export function unsuppressAudioDebounced(delayMs = 300): void {
  if (unsuppressTimer) clearTimeout(unsuppressTimer);
  unsuppressTimer = setTimeout(() => {
    audioSuppressed = false;
    unsuppressTimer = null;
  }, delayMs);
}

// ─── Mic state ────────────────────────────────────────────────────────────────

const MIC_SAMPLE_RATE = 16000;
/** 512 samples at 16kHz = 32ms per chunk — inside Google's recommended 20-40ms range. Down from 1024 (64ms). */
const MIC_BUFFER_SIZE = 512;

let micStream: MediaStream | null = null;
let micContext: AudioContext | null = null;
let micSource: MediaStreamAudioSourceNode | null = null;
let micProcessor: ScriptProcessorNode | null = null;

export async function startMic(): Promise<void> {
  // Warm up playback context on first user gesture (mic press counts)
  getPlaybackContext();

  if (micStream) return; // already running

  micStream = await navigator.mediaDevices.getUserMedia({
    audio: { sampleRate: MIC_SAMPLE_RATE, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });

  micContext = new AudioContext({ sampleRate: MIC_SAMPLE_RATE });
  micSource = micContext.createMediaStreamSource(micStream);

  // ScriptProcessorNode: deprecated but widely supported; AudioWorklet requires extra setup
  // 512 buffer = ~32ms at 16kHz — inside Google's recommended 20-40ms range
  micProcessor = micContext.createScriptProcessor(MIC_BUFFER_SIZE, 1, 1);

  micProcessor.onaudioprocess = (e: AudioProcessingEvent) => {
    // Echo gate: drop mic input briefly after model speaks
    if (isEchoGateActive()) return;

    const inputData = e.inputBuffer.getChannelData(0);

    // RMS amplitude — amplified 5× for visible range at normal speech levels
    let sum = 0;
    for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
    const rms = Math.sqrt(sum / inputData.length);
    micLevel.set(Math.min(1, rms * 5));

    const pcm16 = floatToPCM16(inputData);
    _sendAudio(pcm16ToBase64(pcm16));
  };

  micSource.connect(micProcessor);
  micProcessor.connect(micContext.destination);
}

export function stopMic(): void {
  if (!micStream) return;

  micProcessor?.disconnect();
  micSource?.disconnect();
  micStream.getTracks().forEach((t) => t.stop());

  micProcessor = null;
  micSource = null;
  micStream = null;

  if (micContext) {
    micContext.close().catch(() => {});
    micContext = null;
  }

  micLevel.set(0);
  _sendAudioEnd();
}

// ─── PCM helpers ──────────────────────────────────────────────────────────────

function floatToPCM16(float32: Float32Array): Int16Array {
  const pcm = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    pcm[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return pcm;
}

function pcm16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ─── Playback — cursor-based scheduling ──────────────────────────────────────

const PLAYBACK_SAMPLE_RATE = 24000;
/** Max queued chunks before dropping oldest (backpressure safety). */
const MAX_PLAYBACK_QUEUE = 20;

let playbackContext: AudioContext | null = null;
/** Cursor position in AudioContext time — next chunk starts here. */
let playbackCursor = 0;
let isPlaying = false;
/**
 * Pending playback buffers awaiting scheduling.
 * Bounded to MAX_PLAYBACK_QUEUE — oldest dropped on overflow.
 */
let playbackQueue: ArrayBuffer[] = [];
/** Tracked scheduled sources — needed to stop them on interrupt. */
let scheduledSources: AudioBufferSourceNode[] = [];

function getPlaybackContext(): AudioContext {
  if (!playbackContext || playbackContext.state === 'closed') {
    if (typeof AudioContext === 'undefined') throw new Error('AudioContext not available (SSR)');
    playbackContext = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
  }
  // Browsers suspend AudioContext until a user gesture — resume on every access
  if (playbackContext.state === 'suspended') {
    playbackContext.resume().catch(() => {});
  }
  return playbackContext;
}

/**
 * Pre-warms the AudioContext during a user gesture (e.g. [ENTER SESSION] click).
 * Prevents Chrome autoplay policy blocking first audio chunk.
 * Call as early as possible in the session entry flow.
 */
export function preWarmAudioContext(): void {
  if (typeof AudioContext === 'undefined') return; // SSR guard
  getPlaybackContext();
}

/**
 * Queue and schedule an audio chunk for playback.
 * Uses cursor-based scheduling: each chunk is pre-scheduled at the exact
 * time the previous one ends, eliminating micro-gaps between chunks.
 */
export function queueAudio(base64Data: string): void {
  // Barge-in: drop stale model audio while student is speaking
  if (audioSuppressed) return;

  const buffer = base64ToArrayBuffer(base64Data);

  // Backpressure: drop oldest if queue is full
  if (playbackQueue.length >= MAX_PLAYBACK_QUEUE) {
    playbackQueue.shift();
  }
  playbackQueue.push(buffer);

  schedulePlayback();
}

export function clearAudioQueue(): void {
  // Do NOT call suppressAudio() here — clearing the queue stops in-flight audio,
  // but we must not suppress FUTURE audio. Suppression is only for barge-in
  // (input_transcription) and ws.onclose. Calling suppressAudio() here caused
  // audio to stay permanently suppressed when chunks arrived without transcription events.
  playbackQueue = [];
  // Stop all pre-scheduled AudioBufferSourceNodes — without this,
  // cursor-scheduled chunks keep playing even after "interrupt"
  for (const src of scheduledSources) {
    try { src.stop(); } catch { /* already stopped */ }
  }
  scheduledSources = [];
  const ctx = playbackContext;
  const wasPlaying = isPlaying;
  isPlaying = false;
  // Reset cursor so next chunk starts immediately
  if (ctx) playbackCursor = ctx.currentTime;
  // Notify playback end on interrupt — clears $isSpeaking immediately
  if (wasPlaying) {
    _onPlaybackChange(false);
  }
}

/**
 * Schedules all queued chunks sequentially using AudioContext time.
 * Each chunk is placed exactly where the previous one ends — no gaps.
 */
function schedulePlayback(): void {
  if (playbackQueue.length === 0) return;

  const ctx = getPlaybackContext();

  // If cursor is in the past, start from now
  if (playbackCursor < ctx.currentTime) {
    playbackCursor = ctx.currentTime;
  }

  const wasPlaying = isPlaying;
  isPlaying = true;
  if (!wasPlaying) {
    _onPlaybackChange(true);
  }

  while (playbackQueue.length > 0) {
    const rawBuffer = playbackQueue.shift()!;

    // PCM 24kHz 16-bit LE mono → Float32
    const int16 = new Int16Array(rawBuffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, PLAYBACK_SAMPLE_RATE);
    audioBuffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const startAt = playbackCursor;
    playbackCursor = startAt + audioBuffer.duration;

    scheduledSources.push(source);
    source.onended = () => {
      // Remove from tracked sources
      const idx = scheduledSources.indexOf(source);
      if (idx !== -1) scheduledSources.splice(idx, 1);
      // Check if this was the last scheduled chunk
      if (playbackQueue.length === 0 && scheduledSources.length === 0) {
        isPlaying = false;
        _onPlaybackChange(false);
      }
    };

    source.start(startAt);
    // Update echo gate — model is outputting audio
    lastModelAudioMs = Date.now();
  }
}

// ─── Web Speech API — parallel input transcription ────────────────────────────
//
// Runs alongside the mic stream. Results are faster and more reliable than
// Gemini's input_transcription for user-facing chat display. Gemini's
// input_transcription still flows for server-side logging.
//
// Feature-detected: silently unavailable on Firefox and some mobile browsers.

let recognition: SpeechRecognition | null = null;

/**
 * Start Web Speech API transcription in parallel with mic audio.
 * @param onTranscript - called with each final (non-interim) transcript result
 */
export function startWebSpeechTranscription(onTranscript: (text: string) => void): void {
  const SpeechRecognitionImpl =
    typeof window !== 'undefined'
      ? (window.SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition)
      : undefined;
  if (!SpeechRecognitionImpl) return; // not supported — fall through to Gemini transcription

  recognition = new SpeechRecognitionImpl();
  recognition.continuous = true;
  recognition.interimResults = false; // final results only — no flickering partial text
  recognition.lang = 'en-US';

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const last = event.results[event.results.length - 1];
    if (last && last.isFinal) {
      const text = last[0].transcript.trim();
      if (text) onTranscript(text);
    }
  };

  recognition.onerror = () => {
    // Silent fallback — Gemini's input_transcription handles display instead
  };

  recognition.onend = () => {
    // Auto-restart to keep recognition continuous across natural pauses
    if (recognition) {
      try { recognition.start(); } catch { /* ignore if session ended */ }
    }
  };

  recognition.start();
}

/** Stop Web Speech transcription and prevent auto-restart. */
export function stopWebSpeechTranscription(): void {
  if (recognition) {
    recognition.onend = null; // prevent auto-restart
    recognition.abort();
    recognition = null;
  }
}

/** Returns true if Web Speech API is available in this browser. */
export function isWebSpeechAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
