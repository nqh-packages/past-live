<script lang="ts">
  /**
   * @what - Sticky bottom action bar for the summary page
   * @why - Share card download + call again. Transcript copy removed (summary is now visual).
   * @props - onDownloadCard
   */
  import { onDestroy } from 'svelte';
  import { createWebHaptics } from 'web-haptics/svelte';

  let {
    onDownloadCard,
  }: {
    onDownloadCard: () => void;
  } = $props();

  const haptic = createWebHaptics();
  onDestroy(() => haptic.destroy());
</script>

<nav
  class="sticky bottom-0 mx-5 mb-5 mt-2 flex items-center gap-2.5 px-4 py-3 rounded-sm backdrop-blur-md"
  style="background-color: color-mix(in oklch, var(--color-surface) 85%, transparent);
         border: 1px solid color-mix(in oklch, var(--color-foreground) 8%, transparent);
         padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0.75rem));"
  aria-label="Summary actions"
>
  <!-- Share Card download -->
  <button
    onclick={() => { onDownloadCard(); haptic.trigger('medium'); }}
    class="flex-1 flex items-center justify-center gap-2 min-h-11 py-2.5 rounded-sm font-mono text-xs tracking-[0.12em] uppercase transition-colors"
    style="background-color: var(--summary-accent, var(--color-accent));
           color: var(--color-background);"
    aria-label="Download share card"
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
    share card
  </button>

  <!-- Call Again -->
  <a
    href="/app"
    onclick={() => haptic.trigger('light')}
    class="flex items-center justify-center gap-2 min-h-11 py-2.5 px-4 rounded-sm font-mono text-xs tracking-[0.12em] uppercase border transition-colors"
    style="border-color: color-mix(in oklch, var(--color-foreground) 15%, transparent);
           color: var(--color-foreground); opacity: 0.75;"
    aria-label="Make another call"
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07
                A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.68 1h3
                a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91
                a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7
                A2 2 0 0 1 22 16.92z"/>
    </svg>
    call
  </a>
</nav>
