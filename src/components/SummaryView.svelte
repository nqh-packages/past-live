<script lang="ts">
  /**
   * @what - Visual infographic summary replacing the text-heavy call log layout
   * @why - Summary redesign: hero → stats → images → farewell → decisions → facts →
   *        suggested calls → share card → actions. Prose sections removed.
   * @exports - Orchestrates SummaryHero, SummaryStats, SummaryImageStrip,
   *            SummaryChoiceCards, SummaryActions, inline ShareCard preview
   */
  import { onMount, onDestroy } from 'svelte';
  import { createWebHaptics } from 'web-haptics/svelte';
  import { loadSummaryArtifact, loadSummaryAsync } from '../lib/liveSession/summary';
  import { $previewData as previewData } from '../stores/liveSession';
  import type { SummaryArtifact } from '../stores/liveSession';
  import SummaryHero from './SummaryHero.svelte';
  import SummaryStats from './SummaryStats.svelte';
  import SummaryImageStrip from './SummaryImageStrip.svelte';
  import SummaryChoiceCards from './SummaryChoiceCards.svelte';
  import SummaryActions from './SummaryActions.svelte';
  import ShareCard from './ShareCard.svelte';

  interface Props {
    backendUrl?: string;
  }

  let { backendUrl = '' }: Props = $props();

  // ─── Haptics ──────────────────────────────────────────────────────────────────

  const haptic = createWebHaptics();
  onDestroy(() => haptic.destroy());

  // ─── State ────────────────────────────────────────────────────────────────────

  let summary = $state<SummaryArtifact | null>(null);
  let loaded = $state(false);
  let factsExpanded = $state(false);

  /**
   * Callback bound from ShareCard's download function.
   * ShareCard exposes a `downloadCard` prop so the action row can trigger it.
   */
  let shareCardDownload = $state<(() => void) | null>(null);

  onMount(async () => {
    // Fast path: sessionStorage (normal flow from /session → /summary)
    summary = loadSummaryArtifact();
    if (summary) { loaded = true; return; }

    // Slow path: fetch from backend by sessionId (browser close, tab refresh)
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');

    if (sessionId && backendUrl) {
      summary = await loadSummaryAsync(sessionId, backendUrl);
    }
    loaded = true;
  });

  // ─── Story palette ────────────────────────────────────────────────────────────

  /**
   * Applies story palette CSS custom properties from the persisted artifact.
   * Re-applied after navigation and after the artifact loads.
   */
  $effect(() => {
    const palette = summary?.colorPalette ?? $previewData?.colorPalette;
    if (!palette?.length) return;

    const OKLCH_RE = /^oklch\(\s*[\d.]+%?\s+[\d.]+\s+[\d.]+\s*\)$/;

    const fgMatch = palette[3] && String(palette[3]).match(/oklch\(\s*([\d.]+)%/);
    const bgMatch = palette[0] && String(palette[0]).match(/oklch\(\s*([\d.]+)%/);
    if (fgMatch && bgMatch) {
      const diff = parseFloat(fgMatch[1]) - parseFloat(bgMatch[1]);
      if (diff < 40) return; // Bail — contrast too low
    }

    const CSS_PROPS = [
      '--color-background',
      '--color-surface',
      '--color-accent',
      '--color-foreground',
      '--color-muted',
    ];

    const root = document.documentElement;
    palette.forEach((val, i) => {
      if (CSS_PROPS[i] && OKLCH_RE.test(String(val).trim())) {
        root.style.setProperty(CSS_PROPS[i], val);
      }
    });

    if (palette[2] && OKLCH_RE.test(String(palette[2]).trim())) {
      root.style.setProperty('--summary-accent', palette[2]);
    }

    // Derive border and glow from story palette for visual continuity
    const accentVal = String(palette[2]).trim();
    const fgVal = String(palette[3]).trim();
    const accentPartsMatch = accentVal.match(/oklch\(\s*([\d.]+%?\s+[\d.]+\s+[\d.]+)\s*\)/);
    const fgPartsMatch = fgVal.match(/oklch\(\s*([\d.]+%?\s+[\d.]+\s+[\d.]+)\s*\)/);
    if (fgPartsMatch) {
      root.style.setProperty('--color-border', `oklch(${fgPartsMatch[1]} / 0.06)`);
    }
    if (accentPartsMatch) {
      root.style.setProperty('--color-accent-glow', `oklch(${accentPartsMatch[1]} / 0.20)`);
    }
  });

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const hasSuggestedCalls = $derived(
    (summary?.suggestedCalls?.length ?? 0) > 0
  );

  const visibleFacts = $derived(
    summary?.summaryFacts
      ? factsExpanded
        ? summary.summaryFacts
        : summary.summaryFacts.slice(0, 2)
      : []
  );

  const hiddenFactCount = $derived(
    Math.max(0, (summary?.summaryFacts?.length ?? 0) - 2)
  );
</script>

{#if loaded && summary}
  <article class="w-full flex flex-col" aria-label="Call summary">

    <!-- Hero: back nav + avatar + character name + scenario title -->
    <SummaryHero
      role={summary.role}
      scenarioTitle={summary.scenarioTitle}
      avatarUrl={summary.avatarUrl}
    />

    <!-- Stat pills: duration, scenes, decisions, facts -->
    <SummaryStats
      durationMs={summary.durationMs}
      imageCount={summary.sceneImages?.length ?? 0}
      choiceCount={summary.choiceHistory?.length ?? 0}
      factCount={summary.summaryFacts?.length ?? 0}
    />

    <!-- Scene image gallery (only when images present) -->
    {#if (summary.sceneImages?.length ?? 0) > 0}
      <div class="mb-4 mt-2">
        <SummaryImageStrip images={summary.sceneImages!} />
      </div>
    {/if}

    <!-- Character's Farewell Message -->
    {#if summary.characterMessage}
      <section
        class="mx-5 mb-6 px-4 py-5 rounded-sm"
        style="background-color: color-mix(in oklch, var(--summary-accent, var(--color-accent)) 8%, transparent);
               border-left: 3px solid var(--summary-accent, var(--color-accent));"
        aria-label="Character's farewell message"
      >
        <p class="font-mono text-xs text-foreground/40 tracking-[0.12em] uppercase mb-3">
          &gt; {summary.role.toLowerCase()} said
        </p>
        <blockquote
          class="font-serif text-[17px] lg:text-lg leading-relaxed italic"
          style="color: var(--color-foreground);"
        >
          &ldquo;{summary.characterMessage}&rdquo;
        </blockquote>
      </section>
    {/if}

    <!-- Decision recap (only when choices were made) -->
    {#if (summary.choiceHistory?.length ?? 0) > 0}
      <SummaryChoiceCards choices={summary.choiceHistory!} />
    {/if}

    <!-- Key Facts (collapsible) -->
    <section class="mx-5 mb-6" aria-label="What you learned from the call">
      <p class="font-mono text-xs text-foreground/40 tracking-[0.12em] uppercase mb-3">
        &gt; what you learned
      </p>

      <ul class="space-y-2" role="list">
        {#each visibleFacts as fact, i (fact)}
          <li
            class="px-4 py-3 rounded-sm text-sm leading-relaxed"
            style="background-color: color-mix(in oklch, var(--color-surface) 60%, transparent);
                   color: var(--color-foreground); opacity: {i === 0 ? 1 : 0.8};"
            role="listitem"
          >
            <span
              class="inline-block w-1.5 h-1.5 rounded-full mr-2.5 mb-0.5 align-middle flex-shrink-0"
              style="background-color: {i === 0
                ? 'var(--summary-accent, var(--color-accent))'
                : 'var(--color-muted)'};"
              aria-hidden="true"
            ></span>{fact}
          </li>
        {/each}
      </ul>

      {#if hiddenFactCount > 0}
        <button
          onclick={() => {
            factsExpanded = !factsExpanded;
            haptic.trigger('light');
          }}
          class="mt-2.5 min-h-11 font-mono text-xs tracking-[0.1em] uppercase transition-opacity hover:opacity-100"
          style="color: var(--summary-accent, var(--color-accent)); opacity: 0.7;"
          aria-expanded={factsExpanded}
          aria-label="{factsExpanded
            ? 'Show fewer facts'
            : `Show ${hiddenFactCount} more fact${hiddenFactCount !== 1 ? 's' : ''}`}"
        >
          {factsExpanded
            ? '− show less'
            : `+ ${hiddenFactCount} more fact${hiddenFactCount !== 1 ? 's' : ''}`}
        </button>
      {/if}
    </section>

    <!-- Suggested Next Calls -->
    {#if hasSuggestedCalls && summary.suggestedCalls}
      <section class="mx-5 mb-6" aria-label="Suggested next calls">
        <p class="font-mono text-xs text-foreground/40 tracking-[0.12em] uppercase mb-3">
          &gt; call next
        </p>

        <div class="flex flex-col gap-2.5">
          {#each summary.suggestedCalls as call (call.name)}
            <a
              href="/app"
              onclick={() => haptic.trigger('light')}
              class="flex items-start gap-3 px-4 py-3 rounded-sm border transition-colors"
              style="border-color: color-mix(in oklch, var(--color-foreground) 10%, transparent);
                     background-color: color-mix(in oklch, var(--color-surface) 50%, transparent);"
              aria-label="Explore {call.name}, {call.era}"
            >
              <svg
                class="flex-shrink-0 mt-0.5"
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                style="color: var(--summary-accent, var(--color-accent)); opacity: 0.7;"
                aria-hidden="true"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07
                          A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.68 1h3
                          a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91
                          a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7
                          A2 2 0 0 1 22 16.92z"/>
              </svg>
              <div class="flex-1 min-w-0">
                <p class="font-mono text-sm leading-snug" style="color: var(--color-foreground); opacity: 0.85;">
                  {call.name}
                </p>
                <p class="font-mono text-xs mt-0.5" style="color: var(--color-foreground); opacity: 0.45;">
                  {call.era}
                </p>
                <p class="font-serif italic text-sm mt-1 leading-snug" style="color: var(--color-foreground); opacity: 0.55;">
                  "{call.hook}"
                </p>
              </div>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!--
      ShareCard preview section.
      min-height reserves layout space to prevent CLS when canvas renders.
    -->
    <div class="mx-5 mb-2" id="share-card-region" style="min-height: 520px;">
      <ShareCard bind:downloadFn={shareCardDownload} />
    </div>

    <!-- Action row: Share Card + Call Again -->
    <SummaryActions onDownloadCard={() => shareCardDownload?.()} />

    <!-- Bottom spacer for safe area -->
    <div class="h-10 pb-safe" aria-hidden="true"></div>
  </article>

{:else if loaded && !summary}
  <div class="flex flex-col items-center justify-center min-h-[50vh] gap-6 px-5 text-center">
    <p class="font-mono text-sm text-foreground/55 leading-relaxed">
      No call data found.
    </p>
    <a
      href="/app"
      onclick={() => haptic.trigger('medium')}
      class="inline-flex items-center justify-center border font-mono text-xs tracking-[0.12em] uppercase px-6 min-h-11 py-3 rounded-sm transition-colors"
      style="border-color: var(--summary-accent, var(--color-accent)); color: var(--summary-accent, var(--color-accent));"
      aria-label="Go to home screen to start a call"
    >
      make a call
    </a>
  </div>

{:else}
  <!-- Loading state: branded spinner, story-palette-colored -->
  <div class="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-5">
    <div
      class="w-8 h-8 rounded-full border-2 animate-spin"
      style="border-color: var(--summary-accent, var(--color-accent)); border-top-color: transparent;"
      role="status"
      aria-label="Loading call summary"
    ></div>
    <p
      class="font-mono text-xs tracking-[0.12em] uppercase"
      style="color: var(--summary-accent, var(--color-accent)); opacity: 0.6;"
    >
      loading call log&hellip;
    </p>
  </div>
{/if}
