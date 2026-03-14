<script lang="ts">
  /**
   * @what - Person+moment card for the home screen "Who do you want to call?" section
   * @why - Entry point for pre-built historical scenarios — triggers preview overlay
   * @props - scenario: PersonCard data (person, era, teaser, preset)
   */
  import { createWebHaptics } from 'web-haptics/svelte';
  import { onDestroy } from 'svelte';

  interface PersonCard {
    id: string;
    person: string;
    era: string;
    teaser: string;
    portrait?: string;
    preset: Record<string, unknown>;
  }

  let { scenario }: { scenario: PersonCard } = $props();

  const haptic = createWebHaptics();
  onDestroy(() => haptic.destroy());

  function handleClick(e: MouseEvent) {
    e.preventDefault();
    haptic.trigger('medium');
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
  class="group flex items-center gap-4 border border-border rounded-sm bg-background px-5 py-4 hover:border-accent/20 transition-colors"
  aria-label="Call {scenario.person} — {scenario.era}"
>
  <!-- Portrait placeholder / avatar -->
  <div
    class="flex-shrink-0 w-10 h-10 rounded-full border border-border/50 bg-surface flex items-center justify-center overflow-hidden"
    aria-hidden="true"
  >
    {#if scenario.portrait}
      <img
        src={scenario.portrait}
        alt="{scenario.person} portrait"
        class="w-full h-full object-cover"
        width="40"
        height="40"
      />
    {:else}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-foreground/20"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    {/if}
  </div>

  <!-- Text content -->
  <div class="flex-1 min-w-0">
    <div class="font-display text-foreground text-base tracking-wide leading-snug">
      {scenario.person}
    </div>
    <div class="font-mono text-[10px] text-foreground/30 mt-0.5">
      {scenario.era}
    </div>
    <div class="font-serif italic text-foreground/50 text-[12px] mt-1 leading-snug">
      "{scenario.teaser}"
    </div>
  </div>

  <!-- CTA -->
  <div
    class="flex-shrink-0 font-mono text-[10px] text-accent/50 tracking-[0.08em] uppercase group-hover:text-accent transition-colors"
    aria-hidden="true"
  >
    [ call ]
  </div>
</a>
