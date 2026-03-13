<script lang="ts">
  /**
   * @what - Hold-to-speak mic button
   * @why - Primary voice input with visual state feedback
   */

  type MicState = "idle" | "listening" | "speaking";
  let micState: MicState = $state("idle");

  const stateLabels: Record<MicState, string> = {
    idle: "> channel closed",
    listening: "> channel open",
    speaking: "> transmitting...",
  };

  function handlePointerDown() {
    micState = "listening";
  }

  function handlePointerUp() {
    if (micState === "listening") {
      micState = "speaking";
      setTimeout(() => { micState = "idle"; }, 1500);
    }
  }
</script>

<div class="flex flex-col items-center gap-2">
  <button
    type="button"
    onpointerdown={handlePointerDown}
    onpointerup={handlePointerUp}
    onpointerleave={handlePointerUp}
    class="w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all select-none touch-none
      {micState === 'idle' ? 'border-accent/30 hover:border-accent/50' : ''}
      {micState === 'listening' ? 'border-accent bg-accent/10 shadow-[0_0_24px_rgba(255,60,40,0.15)]' : ''}
      {micState === 'speaking' ? 'border-accent/60 bg-accent/5' : ''}"
    aria-label="Hold to speak"
  >
    {#if micState === "listening"}
      <!-- Pulsing dot -->
      <div class="w-3 h-3 rounded-full bg-accent animate-pulse"></div>
    {:else}
      <!-- Mic icon -->
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent/60">
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
