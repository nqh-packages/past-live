<script lang="ts">
  /**
   * @what - Dispatch-style scenario card
   * @why - Entry point for pre-built historical scenarios — triggers preview overlay instead of direct navigation
   */
  import { createWebHaptics } from 'web-haptics/svelte';
  import { onDestroy } from 'svelte';

  interface Scenario {
    id: string;
    dispatch: string;
    location: string;
    year: number;
    status: string;
    role: string;
    threat: string;
    headline: string;
  }

  let { scenario }: { scenario: Scenario } = $props();

  const haptic = createWebHaptics();
  onDestroy(() => haptic.destroy());

  function handleClick(e: MouseEvent) {
    e.preventDefault();
    haptic.trigger('light');
    // Dispatch event — caught by SessionPreview overlay
    window.dispatchEvent(
      new CustomEvent('past-live:scenario-select', {
        detail: { scenarioId: scenario.id },
      }),
    );
  }
</script>

<a
  href={`/session?scenario=${scenario.id}&mic=1`}
  onclick={handleClick}
  class="group block relative border border-border rounded-sm bg-background px-5 py-4 hover:border-accent/20 transition-colors"
  aria-label="Accept briefing: {scenario.headline} — {scenario.role} in {scenario.location}"
>
  <!-- Vertical margin line -->
  <div class="absolute top-0 left-[48px] bottom-0 w-px bg-accent/8" aria-hidden="true"></div>

  <div class="pl-[36px]">
    <!-- Dispatch header -->
    <div class="text-accent font-mono text-[10px] tracking-[0.12em] uppercase mb-2">
      &gt; DISPATCH {scenario.dispatch}
    </div>

    <!-- Headline -->
    <h3 class="font-display text-foreground text-2xl tracking-wide mb-3">
      {scenario.headline}
    </h3>

    <!-- Dispatch fields -->
    <div class="font-mono text-[11px] text-foreground/30 space-y-0.5 mb-3">
      <div>&gt; location: {scenario.location}</div>
      <div>&gt; status: {scenario.status}</div>
      <div>&gt; role: {scenario.role}</div>
      <div>&gt; threat level: <span class="text-accent">{scenario.threat}</span></div>
    </div>

    <!-- CTA -->
    <div class="font-mono text-[11px] text-accent/60 tracking-[0.08em] uppercase group-hover:text-accent transition-colors">
      [ accept briefing ]
    </div>
  </div>
</a>
