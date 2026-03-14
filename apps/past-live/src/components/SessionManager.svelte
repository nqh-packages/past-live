<script lang="ts">
  /**
   * @what - Invisible orchestrator island managing WebSocket session lifecycle
   * @why - Mounts on /session, connects WS, wires audio callbacks, handles countdown + auto-mic
   * @props - scenarioId, topic, backendWsUrl, mic (auto-activate), cam (enable camera)
   */
  import { onDestroy } from 'svelte';
  import {
    $status as status,
    $error as error,
    $isSpeaking as isSpeaking,
    $micEnabled as micEnabled,
  } from '../stores/liveSession';
  import {
    connectSession,
    disconnect,
    sendAudio,
    sendAudioEnd,
  } from '../lib/liveSession/client';
  import {
    setAudioCallbacks,
    startMic,
    stopMic,
    preWarmAudioContext,
  } from '../lib/liveSession/audio';
  import CountdownOverlay from './CountdownOverlay.svelte';
  import FunLoadingText from './FunLoadingText.svelte';

  interface Props {
    scenarioId?: string;
    topic?: string;
    backendWsUrl: string;
    /** Whether to auto-activate mic on session entry (from URL param ?mic=1) */
    mic?: boolean;
    /** Whether to enable camera (from URL param ?cam=1) */
    cam?: boolean;
  }

  let { scenarioId, topic, backendWsUrl, mic = true, cam = false }: Props = $props();

  // ─── Phase state ──────────────────────────────────────────────────────────

  /**
   * showCountdown: plays the 3-second countdown overlay before session starts.
   * After countdown completes, if WS is still connecting → show FunLoadingText.
   */
  let showCountdown = $state(true);
  let countdownDone = $state(false);

  // ─── Audio callback wiring ─────────────────────────────────────────────────

  setAudioCallbacks(sendAudio, sendAudioEnd, (playing) => {
    isSpeaking.set(playing);
  });

  // ─── Pre-warm AudioContext on mount (user gesture happened at [ENTER SESSION]) ──

  preWarmAudioContext();

  // ─── Connect WebSocket immediately (runs in background during countdown) ──

  if (scenarioId || topic) {
    connectSession({ scenarioId, topic, backendWsUrl });
  }

  // ─── Spacebar toggles mute/unmute (only when NOT focused on text input) ───

  function handleKeydown(e: KeyboardEvent) {
    if (e.key !== ' ') return;

    const active = document.activeElement;
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      (active instanceof HTMLElement && active.isContentEditable)
    ) {
      return; // spacebar types normally in text fields
    }

    e.preventDefault();

    if ($status !== 'active') return;

    if ($micEnabled) {
      stopMic();
      micEnabled.set(false);
    } else {
      startMic()
        .then(() => { micEnabled.set(true); })
        .catch(() => {});
    }
  }

  $effect(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  // ─── Auto-mic from URL param on session active (ONE-SHOT) ──────────────────

  let autoMicDone = false;

  $effect(() => {
    if ($status === 'active' && mic && !autoMicDone) {
      autoMicDone = true;
      startMic()
        .then(() => { micEnabled.set(true); })
        .catch(() => {
          // getUserMedia denied — user can click MicButton to retry
        });
    }
  });

  // ─── Redirect on session end ──────────────────────────────────────────────

  $effect(() => {
    if ($status === 'ended') {
      window.location.href = '/summary';
    }
  });

  // ─── Countdown complete handler ────────────────────────────────────────────

  function onCountdownComplete() {
    showCountdown = false;
    countdownDone = true;
  }

  // ─── Retry ────────────────────────────────────────────────────────────────

  function retry() {
    connectSession({ scenarioId, topic, backendWsUrl });
  }

  onDestroy(() => {
    stopMic();
    disconnect();
    window.removeEventListener('keydown', handleKeydown);
  });

  // Whether we're still waiting for WS after countdown finished
  const isWaitingAfterCountdown = $derived(
    countdownDone && $status === 'connecting',
  );
</script>

<!-- Countdown overlay: plays 3s then fires onCountdownComplete -->
{#if showCountdown}
  <CountdownOverlay oncomplete={onCountdownComplete} />
{/if}

<!-- Connection wait (after countdown, WS still connecting): show fun loading text -->
{#if isWaitingAfterCountdown}
  <div class="fixed inset-0 z-40 flex flex-col items-center justify-center bg-background/95">
    <div class="relative pl-[72px]">
      <div class="absolute top-0 left-[60px] bottom-0 w-px bg-accent/8" aria-hidden="true"></div>
      <FunLoadingText />
    </div>
  </div>
{/if}

<!-- Error overlay -->
{#if $status === 'error'}
  <div class="fixed inset-0 z-40 flex flex-col items-center justify-center bg-background/95">
    <div class="max-w-xs text-center space-y-6">
      <div class="font-mono text-[10px] text-accent tracking-[0.12em] uppercase">
        &gt; signal lost
      </div>
      <p class="font-mono text-xs text-foreground/40">
        {$error || 'transmission interrupted'}
      </p>
      <div class="font-mono text-[10px] text-foreground/20">
        &gt; the past is not responding
      </div>
      <div class="flex gap-4 justify-center">
        <button
          type="button"
          onclick={retry}
          class="border border-accent/30 text-accent font-mono text-[11px] tracking-[0.12em] uppercase px-5 py-2.5 rounded-sm hover:bg-accent/5 transition-colors"
          aria-label="Retry connection"
        >
          [ retry ]
        </button>
        <a
          href="/app"
          class="border border-border text-foreground/40 font-mono text-[11px] tracking-[0.12em] uppercase px-5 py-2.5 rounded-sm hover:border-accent/20 hover:text-foreground/60 transition-colors"
        >
          [ abort ]
        </a>
      </div>
    </div>
  </div>
{/if}

<!-- Tap-to-enable voice fallback: shown when mic permission was denied -->
{#if $status === 'active' && !$micEnabled}
  <div
    class="fixed bottom-28 left-1/2 -translate-x-1/2 z-30 font-mono text-[10px] text-foreground/30 tracking-[0.06em] pointer-events-none"
    aria-live="polite"
  >
    &gt; tap mic to enable voice
  </div>
{/if}
