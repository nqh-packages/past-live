<script lang="ts">
  /**
   * @what - Horizontal scrollable stat pills for the summary infographic
   * @why - Replaces the removed duration/date metadata row in SummaryHero with a
   *        compact visual summary: Duration, Scenes, Decisions, Facts
   * @props - durationMs, imageCount, choiceCount, factCount
   */

  let {
    durationMs,
    imageCount,
    choiceCount,
    factCount,
  }: {
    durationMs: number;
    imageCount: number;
    choiceCount: number;
    factCount: number;
  } = $props();

  const formattedDuration = $derived.by(() => {
    const totalSec = Math.floor(durationMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  });

  interface StatPill {
    value: string;
    label: string;
  }

  const stats = $derived<StatPill[]>([
    { value: formattedDuration, label: 'duration' },
    { value: String(imageCount), label: imageCount === 1 ? 'scene' : 'scenes' },
    { value: String(choiceCount), label: choiceCount === 1 ? 'decision' : 'decisions' },
    { value: String(factCount), label: factCount === 1 ? 'fact' : 'facts' },
  ]);
</script>

<!--
  Horizontal pill strip.
  scrollbar-hidden via CSS so the strip scrolls on mobile without a visible bar.
  Role=list because these are semantically a list of statistics.
-->
<div
  class="stat-strip overflow-x-auto flex gap-2 px-5 py-3"
  role="list"
  aria-label="Call statistics"
>
  {#each stats as stat (stat.label)}
    <div
      class="flex-shrink-0 flex flex-col items-center px-4 py-2.5 rounded-sm"
      style="background-color: color-mix(in oklch, var(--color-surface) 60%, transparent);
             border: 1px solid color-mix(in oklch, var(--color-foreground) 6%, transparent);"
      role="listitem"
    >
      <span
        class="font-mono text-sm tabular-nums leading-tight"
        style="color: var(--color-foreground);"
        aria-label="{stat.value} {stat.label}"
      >
        {stat.value}
      </span>
      <span
        class="font-mono text-[10px] uppercase tracking-widest mt-0.5"
        style="color: var(--color-foreground); opacity: 0.4;"
        aria-hidden="true"
      >
        {stat.label}
      </span>
    </div>
  {/each}
</div>

<style>
  .stat-strip {
    scrollbar-width: none;
  }
  .stat-strip::-webkit-scrollbar {
    display: none;
  }
</style>
