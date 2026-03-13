<script lang="ts">
  /**
   * @what - Hold-to-speak mic button wired to real PCM 16kHz capture
   * @why - Primary voice input; only active when session is live
   */
  import { onMount } from 'svelte';
  import { $isActive as isActiveStore } from '../stores/liveSession';
  import { startMic, stopMic } from '../lib/liveSession/audio';

  type MicState = 'idle' | 'listening';
  let micState = $state<MicState>('idle');
  let isActive = $state(false);

  onMount(() => {
    const unsub = isActiveStore.subscribe((v) => { isActive = v; });
    return unsub;
  });

  const stateLabels: Record<MicState, string> = {
    idle: '> channel closed',
    listening: '> channel open',
  };

  async function handlePointerDown() {
    if (!isActive) return;
    micState = 'listening';
    try {
      await startMic();
    } catch {
      micState = 'idle';
    }
  }

  function handlePointerUp() {
    if (micState === 'listening') {
      micState = 'idle';
      stopMic();
    }
  }
</script>

<div class="flex flex-col items-center gap-2">
  <button
    type="button"
    onpointerdown={handlePointerDown}
    onpointerup={handlePointerUp}
    onpointerleave={handlePointerUp}
    disabled={!isActive}
    class="w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all select-none touch-none
      {!isActive ? 'border-border/20 opacity-40 cursor-not-allowed' : ''}
      {isActive && micState === 'idle' ? 'border-accent/30 hover:border-accent/50' : ''}
      {micState === 'listening' ? 'border-accent bg-accent/10 shadow-[0_0_24px_rgba(255,60,40,0.15)]' : ''}"
    aria-label="Hold to speak"
    aria-pressed={micState === 'listening'}
  >
    {#if micState === 'listening'}
      <div class="w-3 h-3 rounded-full bg-accent animate-pulse"></div>
    {:else}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        class="{isActive ? 'text-accent/60' : 'text-foreground/20'}">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    {/if}
  </button>

  <span class="font-mono text-[10px] text-foreground/30 tracking-[0.08em]">
    {stateLabels[micState]}
  </span>
</div>
