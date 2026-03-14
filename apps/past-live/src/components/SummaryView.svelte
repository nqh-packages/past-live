<script lang="ts">
  /**
   * @what - Call log island — reads session artifact from store or sessionStorage
   * @why - Renders the post-call summary: who, duration, key facts, what happened, next calls
   *        Phase 2: uses server-generated characterMessage, outcomeComparison, suggestedCalls
   */
  import { onMount, onDestroy } from 'svelte';
  import { createWebHaptics } from 'web-haptics/svelte';
  import { loadSummaryArtifact, formatDuration } from '../lib/liveSession/summary';
  import type { SummaryArtifact } from '../stores/liveSession';

  const haptic = createWebHaptics();
  onDestroy(() => haptic.destroy());

  const FALLBACK_SUMMARY: SummaryArtifact = {
    scenarioId: 'constantinople-1453',
    topic: '',
    scenarioTitle: 'Fall of Constantinople',
    role: 'Constantine XI',
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

  const SCENARIO_LABELS: Record<string, { person: string; era: string }> = {
    'constantinople-1453': { person: 'Constantine XI', era: 'Constantinople, 1453' },
    'moon-landing-1969': { person: 'Gene Kranz', era: 'Apollo 11, 1969' },
    'mongol-empire-1206': { person: 'Jamukha', era: 'Mongol Steppe, 1206' },
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
      .map((id) => {
        const label = SCENARIO_LABELS[id];
        if (!label) return null;
        return { id, person: label.person, era: label.era };
      })
      .filter(Boolean) as { id: string; person: string; era: string }[]
  );
</script>

{#if loaded}
  <!-- Call ended header -->
  <section class="w-full mb-10">
    <div class="relative pl-[72px]">
      <div class="absolute top-0 left-[60px] bottom-0 w-px bg-accent/8" aria-hidden="true"></div>
      <div class="font-mono text-[10px] text-accent tracking-[0.12em] uppercase">
        &gt; call ended
      </div>
      <div class="font-mono text-[10px] text-foreground/30 mt-1">
        &gt; you called: {summary.role}
      </div>
      <div class="font-mono text-[10px] text-foreground/30 mt-1">
        &gt; duration: {duration}
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
        {summary.outcomeComparison ?? summary.actualOutcome}
      </p>
    </div>
  </section>

  <!-- Character's Message (Phase 2: populated from Gemini post-call summary) -->
  <section class="mb-12">
    <h2 class="font-display text-2xl text-foreground tracking-wider mb-5">CHARACTER'S MESSAGE</h2>
    <p class="font-mono text-sm text-foreground/40 italic leading-relaxed pl-4 border-l border-accent/15">
      "{summary.characterMessage ?? 'Thank you, stranger. You asked the right questions.'}"
    </p>
  </section>

  <!-- Call Someone Else: Phase 2 dynamic suggestions take precedence over preset links -->
  {#if summary.suggestedCalls && summary.suggestedCalls.length > 0}
    <section class="mb-12">
      <h2 class="font-display text-2xl text-foreground tracking-wider mb-5">CALL SOMEONE ELSE</h2>
      <div class="flex flex-col gap-3">
        {#each summary.suggestedCalls as call (call.name)}
          <a
            href="/app"
            onclick={() => haptic.trigger('light')}
            class="border border-border rounded-sm px-4 py-3 font-mono text-sm text-foreground/30 hover:text-foreground hover:border-accent/20 transition-colors"
            aria-label="Call {call.name}, {call.era}"
          >
            <span class="text-foreground/60">&gt; {call.name}</span> · {call.era}
            <br /><span class="text-foreground/20 text-xs">{call.hook}</span>
          </a>
        {/each}
      </div>
    </section>
  {:else if relatedLinks.length > 0}
    <section class="mb-12">
      <h2 class="font-display text-2xl text-foreground tracking-wider mb-5">CALL SOMEONE ELSE</h2>
      <div class="flex flex-col gap-3">
        {#each relatedLinks as s (s.id)}
          <a
            href={`/session?scenario=${s.id}`}
            onclick={() => haptic.trigger('light')}
            class="border border-border rounded-sm px-4 py-3 font-mono text-sm text-foreground/30 hover:text-foreground hover:border-accent/20 transition-colors"
            aria-label="Call {s.person}, {s.era}"
          >
            &gt; {s.person} · {s.era}
          </a>
        {/each}
      </div>
    </section>
  {/if}

  <!-- CTA -->
  <section class="text-center mt-auto pb-8">
    <a
      href="/app"
      class="inline-block border border-accent/30 text-accent font-mono text-[11px] tracking-[0.12em] uppercase px-6 py-3 rounded-sm hover:bg-accent/5 transition-colors"
      aria-label="Go to home screen to call someone else"
    >
      call someone else
    </a>
  </section>
{:else}
  <!-- Loading placeholder -->
  <div class="flex items-center justify-center min-h-[40vh]">
    <span class="font-mono text-[10px] text-foreground/20 tracking-[0.12em] animate-pulse">
      &gt; loading call log...
    </span>
  </div>
{/if}
