<script lang="ts">
  /**
   * @what - iPhone-style "calling..." overlay shown while Gemini Live connects
   * @why - Replaces CountdownOverlay with phone-call metaphor: portrait → name → era → status
   * @props - characterName, era, portrait, connected, oncomplete
   */

  interface Props {
    characterName: string;
    era: string;
    portrait?: string;
    /** True when $status === 'active' (Gemini connected) */
    connected: boolean;
    /** Fired ~1s after connected becomes true so parent can unmount this overlay */
    oncomplete: () => void;
  }

  let { characterName, era, portrait, connected, oncomplete }: Props = $props();

  let showConnected = $state(false);

  $effect(() => {
    if (!connected) return;
    showConnected = true;
    const t = setTimeout(() => {
      oncomplete();
    }, 1000);
    return () => clearTimeout(t);
  });
</script>

<div
  class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[var(--story-bg,var(--color-background))]"
  role="status"
  aria-live="polite"
  aria-label="Calling {characterName}"
>
  <!-- Portrait circle -->
  <div class="relative">
    <div
      class="w-24 h-24 rounded-full border-2 border-[var(--story-accent,var(--color-accent))] overflow-hidden bg-surface flex items-center justify-center"
    >
      {#if portrait}
        <img
          src={portrait}
          alt="Portrait of {characterName}"
          class="w-full h-full object-cover"
        />
      {:else}
        <!-- Placeholder glyph when portrait is not yet available -->
        <svg
          class="w-10 h-10 text-foreground/20"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
        </svg>
      {/if}
    </div>
  </div>

  <!-- Character name + era -->
  <div class="text-center space-y-1">
    <div
      class="font-mono text-sm font-semibold tracking-[0.16em] uppercase text-[var(--story-accent,var(--color-accent))]"
    >
      {characterName}
    </div>
    <div class="font-mono text-[11px] text-foreground/50 tracking-[0.08em]">
      {era}
    </div>
  </div>

  <!-- Status text: calling... → connected -->
  <div class="font-mono text-[11px] text-foreground/40 tracking-[0.12em]" aria-live="assertive">
    {#if showConnected}
      connected
    {:else}
      <span class="motion-reduce:after:content-['...']">
        calling
        <span class="motion-safe:inline-flex motion-safe:gap-[2px]" aria-hidden="true">
          <span class="animate-[bounce_1s_ease-in-out_infinite_0ms]">.</span>
          <span class="animate-[bounce_1s_ease-in-out_infinite_150ms]">.</span>
          <span class="animate-[bounce_1s_ease-in-out_infinite_300ms]">.</span>
        </span>
      </span>
    {/if}
  </div>
</div>
