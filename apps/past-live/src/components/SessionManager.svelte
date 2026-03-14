<script lang="ts">
  /**
   * @what - Invisible orchestrator island managing WebSocket session lifecycle
   * @why - Mounts on /session, connects WS, wires audio callbacks, handles calling screen + auto-mic
   * @props - scenarioId, topic, backendWsUrl, mic (auto-activate)
   */
  import { onDestroy } from 'svelte';
  import { $authStore as auth } from '@clerk/astro/client';
  import {
    $status as status,
    $error as error,
    $isSpeaking as isSpeaking,
    $micEnabled as micEnabled,
    $characterName as characterName,
    $previewData as previewData,
    PRESET_CHARACTER_NAMES,
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
  import CallingScreen from './CallingScreen.svelte';
  import FunLoadingText from './FunLoadingText.svelte';

  interface Props {
    scenarioId?: string;
    topic?: string;
    backendWsUrl: string;
    /** Whether to auto-activate mic on session entry (from URL param ?mic=1) */
    mic?: boolean;
  }

  let { scenarioId, topic, backendWsUrl, mic = true }: Props = $props();

  // ─── Phase state ──────────────────────────────────────────────────────────

  /**
   * showCallingScreen: shows iPhone-style calling overlay during connecting state.
   * Hides ~1s after connected, via CallingScreen oncomplete callback.
   */
  let showCallingScreen = $state(true);

  // ─── Read voiceName + portrait from sessionStorage ─────────────────────────

  const previewRaw = typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem('past-live:preview')
    : null;
  const previewParsed = previewRaw ? (JSON.parse(previewRaw) as { voiceName?: string; avatar?: string }) : null;
  const voiceName = previewParsed?.voiceName;
  const portrait = previewParsed?.avatar;

  // ─── Audio callback wiring ─────────────────────────────────────────────────

  setAudioCallbacks(sendAudio, sendAudioEnd, (playing) => {
    isSpeaking.set(playing);
  });

  // ─── Pre-warm AudioContext on mount (user gesture happened at [CALL]) ──────

  preWarmAudioContext();

  // ─── Resolve character name from sessionStorage (Nano Stores don't survive navigation) ──
  //
  // Priority order:
  //   1. sessionStorage 'past-live:preview' → characterName (set by SessionPreview.svelte)
  //   2. PRESET_CHARACTER_NAMES[scenarioId] (direct URL access to a known scenario)
  //   3. '' (default — open topic without preview, filled by first speaker_switch)

  (function resolveCharacterName() {
    try {
      const raw = sessionStorage.getItem('past-live:preview');
      if (raw) {
        const parsed = JSON.parse(raw) as { characterName?: string };
        if (parsed.characterName) {
          characterName.set(parsed.characterName);
          return;
        }
      }
    } catch { /* malformed JSON — fall through */ }

    if (scenarioId && PRESET_CHARACTER_NAMES[scenarioId]) {
      characterName.set(PRESET_CHARACTER_NAMES[scenarioId]);
    }
  })();

  // ─── Connect WebSocket immediately (runs in background during calling screen) ──

  if (scenarioId || topic) {
    // Phase 2: pass preview context for post-call summary prompt on the backend
    // studentId is undefined for anonymous users — backend only saves to Firestore when present
    const previewCtx = previewData.get();
    connectSession({
      scenarioId,
      topic,
      voiceName,
      backendWsUrl,
      characterName: previewCtx?.characterName,
      historicalSetting: previewCtx?.historicalSetting,
      studentId: auth.get()?.userId ?? undefined,
    });
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
          // getUserMedia denied — user can tap MicButton to retry
        });
    }
  });

  // ─── Redirect on session end ──────────────────────────────────────────────

  $effect(() => {
    if ($status === 'ended') {
      window.location.href = '/summary';
    }
  });

  // ─── CallingScreen complete handler ───────────────────────────────────────

  function onCallingComplete() {
    showCallingScreen = false;
  }

  // ─── Hang up ─────────────────────────────────────────────────────────────

  function handleHangUp() {
    stopMic();
    disconnect();
    window.location.href = '/summary';
  }

  // ─── Retry ────────────────────────────────────────────────────────────────

  function retry() {
    const previewCtx = previewData.get();
    connectSession({
      scenarioId,
      topic,
      voiceName,
      backendWsUrl,
      characterName: previewCtx?.characterName,
      historicalSetting: previewCtx?.historicalSetting,
      studentId: auth.get()?.userId ?? undefined,
    });
  }

  onDestroy(() => {
    stopMic();
    disconnect();
    window.removeEventListener('keydown', handleKeydown);
  });

  // Whether we're still waiting for WS after calling screen dismissed
  const isWaitingForConnection = $derived(
    !showCallingScreen && $status === 'connecting',
  );

  // Derived character name and era for CallingScreen
  const resolvedCharacterName = $derived($characterName || 'Connecting...');
  const resolvedEra = $derived($previewData?.historicalSetting ?? ($previewData?.year ? `${$previewData.year}` : ''));
</script>

<!-- Calling screen: iPhone-style overlay during connecting phase -->
{#if showCallingScreen && ($status === 'connecting' || $status === 'active')}
  <CallingScreen
    characterName={resolvedCharacterName}
    era={resolvedEra}
    portrait={portrait}
    connected={$status === 'active'}
    oncomplete={onCallingComplete}
  />
{/if}

<!-- Connection wait (after calling screen, WS still connecting): show fun loading text -->
{#if isWaitingForConnection}
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
        {$error || 'Connection lost'}
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
