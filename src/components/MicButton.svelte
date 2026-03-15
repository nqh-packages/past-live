<script lang="ts">
  /**
   * @what - Mic toggle button — click to mute/unmute streaming microphone
   * @why - Auto-activates on session entry; replaces hold-to-talk for natural interruption flow
   * @props - none (reads $isActive, $micEnabled from stores; startMic/stopMic from audio.ts)
   */
  import { onDestroy } from 'svelte';
  import { createWebHaptics } from 'web-haptics/svelte';
  import {
    $isActive as isActive,
    $micEnabled as micEnabled,
    $micLevel as micLevelStore,
  } from '../stores/liveSession';
  import { startMic, stopMic } from '../lib/liveSession/audio';

  const haptic = createWebHaptics();
  onDestroy(() => haptic.destroy());

  // Mic state: active = streaming, muted = paused, disabled = no session
  type MicState = 'active' | 'muted' | 'disabled';

  const micState = $derived<MicState>(
    !$isActive ? 'disabled' : $micEnabled ? 'active' : 'muted',
  );

  const ariaLabels: Record<MicState, string> = {
    active: 'Mute microphone',
    muted: 'Unmute microphone',
    disabled: 'Microphone offline',
  };

  const stateLabels: Record<MicState, string> = {
    active: '> connected',
    muted: '> muted',
    disabled: '> call ended',
  };

  async function handleToggle() {
    if (!$isActive) return;

    haptic.trigger('light');

    if ($micEnabled) {
      // Mute: stop streaming but keep session alive
      stopMic();
      micEnabled.set(false);
    } else {
      // Unmute: resume streaming
      try {
        await startMic();
        micEnabled.set(true);
      } catch {
        // getUserMedia denied — stay muted, user sees the muted state
      }
    }
  }
</script>

<div class="flex flex-col items-center gap-2">
  <div class="relative">
    <!--
      Volume ring — scales with mic input RMS level.
      Respects prefers-reduced-motion: scale is suppressed, only opacity varies.
    -->
    {#if micState === 'active'}
      <div
        class="absolute inset-0 rounded-full border-2 border-danger pointer-events-none motion-reduce:scale-100"
        style="transform: scale({1 + $micLevelStore * 0.3}); opacity: {0.3 + $micLevelStore * 0.7}"
        aria-hidden="true"
      ></div>
    {/if}

  <button
    type="button"
    onclick={handleToggle}
    disabled={!$isActive}
    class="w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all select-none
      {micState === 'disabled' ? 'border-border/20 opacity-40 cursor-not-allowed' : ''}
      {micState === 'muted' ? 'border-border/40 hover:border-accent/30' : ''}
      {micState === 'active' ? 'border-danger bg-danger/10 shadow-[0_0_24px_var(--color-danger-glow)]' : ''}"
    aria-label={ariaLabels[micState]}
    aria-pressed={micState === 'active'}
    aria-keyshortcuts="Space"
  >
    {#if micState === 'active'}
      <!-- Pulsing dot: mic streaming -->
      <div class="w-3 h-3 rounded-full bg-danger animate-pulse" aria-hidden="true"></div>
    {:else if micState === 'muted'}
      <!-- Mic-slash icon: muted -->
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-foreground/30"
        aria-hidden="true"
      >
        <line x1="2" y1="2" x2="22" y2="22" />
        <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
        <path d="M5 10v2a7 7 0 0 0 12 0" />
        <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    {:else}
      <!-- Mic icon: disabled/offline -->
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-foreground/20"
        aria-hidden="true"
      >
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    {/if}
  </button>
  </div>

  <span class="font-mono text-xs text-foreground/30 tracking-[0.08em]" role="status" aria-live="polite">
    {stateLabels[micState]}
  </span>
</div>
