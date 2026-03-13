<script lang="ts">
  /**
   * @what - Summary view island — reads session artifact from store or sessionStorage
   * @why - Renders debrief after session ends; falls back to mock if no artifact exists
   */
  import { onMount } from 'svelte';
  import { loadSummaryArtifact, formatDuration } from '../lib/liveSession/summary';
  import type { SummaryArtifact } from '../stores/liveSession';

  const FALLBACK_SUMMARY: SummaryArtifact = {
    scenarioId: 'constantinople-1453',
    topic: '',
    scenarioTitle: 'Fall of Constantinople',
    role: "Emperor's advisor",
    durationMs: 754000,
    summaryFacts: [
      'Mehmed II moved 72 Ottoman ships overland on greased logs to bypass the harbor chain.',
      'Constantinople had fewer than 7,000 defenders against 80,000 Ottoman troops.',
      'The city had survived sieges for over a thousand years before finally falling on May 29, 1453.',
    ],
    actualOutcome:
      'Constantinople fell on May 29, 1453. Mehmed II entered the city through the Kerkoporta gate, left accidentally open. Constantine XI died fighting in the streets. The city became Istanbul, capital of the Ottoman Empire.',
    yourCall: 'Hold the harbor',
    relatedScenarios: ['moon-landing-1969', 'mongol-empire-1206'],
  };

  const SCENARIO_LABELS: Record<string, { headline: string; year: string }> = {
    'constantinople-1453': { headline: 'The walls are falling.', year: '1453' },
    'moon-landing-1969': { headline: '25 seconds of fuel.', year: '1969' },
    'mongol-empire-1206': { headline: 'The khan rides.', year: '1206' },
  };

  let summary = $state<SummaryArtifact>(FALLBACK_SUMMARY);
  let loaded = $state(false);

  onMount(() => {
    const artifact = loadSummaryArtifact();
    if (artifact) summary = artifact;
    loaded = true;
  });

  const duration = $derived(formatDuration(summary.durationMs));
  const relatedLinks = $derived(
    summary.relatedScenarios
      .map((id) => ({ id, ...SCENARIO_LABELS[id] }))
      .filter((s) => s.headline)
  );
</script>

{#if loaded}
  <!-- Dispatch header -->
  <section class="w-full mb-10">
    <div class="relative pl-[72px]">
      <div class="absolute top-0 left-[60px] bottom-0 w-px bg-accent/8" aria-hidden="true"></div>
      <div class="font-mono text-[10px] text-accent tracking-[0.12em] uppercase">
        &gt; transmission ended
      </div>
      <div class="font-mono text-[10px] text-foreground/30 mt-1">
        &gt; scenario: {summary.scenarioTitle}
      </div>
      <div class="font-mono text-[10px] text-foreground/30 mt-1">
        &gt; role: {summary.role}
      </div>
      <div class="font-mono text-[10px] text-foreground/30 mt-1">
        &gt; session duration: {duration}
      </div>
    </div>
  </section>

  <!-- Key Facts -->
  <section class="mb-12">
    <h2 class="font-display text-2xl text-foreground tracking-wider mb-5">KEY FACTS</h2>
    <ul class="space-y-3">
      {#each summary.summaryFacts as fact (fact)}
        <li class="font-mono text-sm text-foreground/40 leading-relaxed pl-4 border-l border-accent/15">
          {fact}
        </li>
      {/each}
    </ul>
  </section>

  <!-- What Actually Happened -->
  <section class="mb-12">
    <h2 class="font-display text-2xl text-foreground tracking-wider mb-5">WHAT ACTUALLY HAPPENED</h2>
    <div class="font-mono text-sm space-y-3">
      <p>
        <span class="text-accent">your call:</span>
        <span class="text-foreground/40 ml-2">{summary.yourCall}</span>
      </p>
      <p class="text-foreground/40 leading-relaxed pl-4 border-l border-accent/15">
        {summary.actualOutcome}
      </p>
    </div>
  </section>

  <!-- Next Briefing -->
  {#if relatedLinks.length > 0}
    <section class="mb-12">
      <h2 class="font-display text-2xl text-foreground tracking-wider mb-5">NEXT BRIEFING</h2>
      <div class="flex flex-col gap-3">
        {#each relatedLinks as s (s.id)}
          <a
            href={`/session?scenario=${s.id}`}
            class="border border-border rounded-sm px-4 py-3 font-mono text-sm text-foreground/30 hover:text-foreground hover:border-accent/20 transition-colors"
          >
            &gt; {s.headline}, {s.year}
          </a>
        {/each}
      </div>
    </section>
  {/if}

  <!-- CTA -->
  <section class="text-center mt-auto pb-8">
    <a
      href="/"
      class="inline-block border border-accent/30 text-accent font-mono text-[11px] tracking-[0.12em] uppercase px-6 py-3 rounded-sm hover:bg-accent/5 transition-colors"
    >
      new session
    </a>
  </section>
{:else}
  <!-- Loading placeholder -->
  <div class="flex items-center justify-center min-h-[40vh]">
    <span class="font-mono text-[10px] text-foreground/20 tracking-[0.12em] animate-pulse">
      &gt; retrieving debrief...
    </span>
  </div>
{/if}
