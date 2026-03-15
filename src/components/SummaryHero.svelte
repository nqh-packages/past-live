<script lang="ts">
  /**
   * @what - Summary page header: back nav, avatar, character name, scenario title
   * @why - Simplified hero — duration/date metadata moved to SummaryStats pill strip
   * @props - role, scenarioTitle, avatarUrl
   */
  import { onDestroy } from 'svelte';
  import { createWebHaptics } from 'web-haptics/svelte';

  let {
    role,
    scenarioTitle,
    avatarUrl,
  }: {
    role: string;
    scenarioTitle?: string;
    avatarUrl?: string;
  } = $props();

  const haptic = createWebHaptics();
  onDestroy(() => haptic.destroy());
</script>

<header class="px-5 pt-6 pb-4 mb-2">
  <!-- Back nav -->
  <a
    href="/app"
    onclick={() => haptic.trigger('light')}
    class="inline-flex items-center gap-1.5 min-h-11 font-mono text-xs tracking-[0.12em] uppercase mb-4 transition-opacity hover:opacity-100"
    style="color: var(--summary-accent, var(--color-accent)); opacity: 0.6;"
    aria-label="Back to home"
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
    </svg>
    back
  </a>

  <div class="flex items-start gap-4">
    <!-- Avatar -->
    {#if avatarUrl}
      <img
        src={avatarUrl}
        alt={role}
        class="w-14 h-14 rounded-full object-cover flex-shrink-0 border"
        style="border-color: color-mix(in oklch, var(--color-foreground) 15%, transparent);"
        width="56"
        height="56"
      />
    {:else}
      <div
        class="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center"
        style="background-color: color-mix(in oklch, var(--summary-accent, var(--color-accent)) 15%, transparent);
               border: 1px solid color-mix(in oklch, var(--color-foreground) 10%, transparent);"
        aria-hidden="true"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
          style="color: var(--summary-accent, var(--color-accent)); opacity: 0.6;">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07
                    A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.68 1h3
                    a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91
                    a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7
                    A2 2 0 0 1 22 16.92z"/>
        </svg>
      </div>
    {/if}

    <div class="flex-1 min-w-0">
      <!-- Character name — primary h1 -->
      <h1
        class="font-display text-3xl lg:text-4xl leading-tight tracking-tight"
        style="color: var(--color-foreground);"
      >
        {role}
      </h1>

      {#if scenarioTitle}
        <p
          class="font-serif italic text-sm mt-0.5"
          style="color: var(--color-foreground); opacity: 0.55;"
        >
          {scenarioTitle}
        </p>
      {/if}
    </div>
  </div>
</header>
