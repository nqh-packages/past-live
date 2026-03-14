/**
 * @what - Mic capture (PCM 16kHz) and audio playback (PCM 24kHz) for live session
 * @why - Isolates Web Audio API complexity; callbacks are injected from client.ts / SessionManager
 * @exports - startMic, stopMic, queueAudio, clearAudioQueue, setAudioCallbacks, preWarmAudioContext
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

// ─── Mic state ────────────────────────────────────────────────────────────────

const MIC_SAMPLE_RATE = 16000;

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
  // 4096 buffer gives ~256ms latency at 16kHz — acceptable for streaming
  micProcessor = micContext.createScriptProcessor(4096, 1, 1);

  micProcessor.onaudioprocess = (e: AudioProcessingEvent) => {
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

// ─── Playback state ───────────────────────────────────────────────────────────

const PLAYBACK_SAMPLE_RATE = 24000;

let playbackContext: AudioContext | null = null;
let playbackQueue: ArrayBuffer[] = [];
let isPlaying = false;
let currentSource: AudioBufferSourceNode | null = null;

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

export function queueAudio(base64Data: string): void {
  const buffer = base64ToArrayBuffer(base64Data);
  playbackQueue.push(buffer);
  if (!isPlaying) playNext();
}

export function clearAudioQueue(): void {
  playbackQueue = [];
  const wasPlaying = isPlaying;
  isPlaying = false;
  if (currentSource) {
    currentSource.onended = null;
    try { currentSource.stop(); } catch { /* already stopped */ }
    currentSource = null;
  }
  // Notify playback end on interrupt — clears $isSpeaking immediately
  if (wasPlaying) {
    _onPlaybackChange(false);
  }
}

function playNext(): void {
  if (playbackQueue.length === 0) {
    if (isPlaying) {
      isPlaying = false;
      _onPlaybackChange(false);
    }
    return;
  }

  const wasPlaying = isPlaying;
  isPlaying = true;
  if (!wasPlaying) {
    _onPlaybackChange(true);
  }

  const rawBuffer = playbackQueue.shift()!;
  const ctx = getPlaybackContext();

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
  currentSource = source;

  source.onended = () => {
    currentSource = null;
    playNext();
  };

  source.start();
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
