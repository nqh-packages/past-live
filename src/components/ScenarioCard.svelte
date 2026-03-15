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
    avatarUrl?: string;
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
  class="group relative flex flex-col border border-border/60 rounded-sm bg-background overflow-hidden hover:border-accent/30 transition-colors"
  aria-label="Call {scenario.person} — {scenario.era}"
>
  <!-- Portrait — clean, no overlay -->
  <div class="w-full aspect-[4/3] bg-surface overflow-hidden" aria-hidden="true">
    {#if scenario.avatarUrl || scenario.portrait}
      <img
        src={scenario.avatarUrl ?? scenario.portrait}
        alt=""
        class="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-300"
        loading="lazy"
        decoding="async"
      />
    {:else}
      <div class="w-full h-full flex items-center justify-center">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1"
          class="text-foreground/10"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      </div>
    {/if}
  </div>

  <!-- Card body -->
  <div class="px-4 py-3">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="font-display text-foreground text-base sm:text-lg tracking-wide leading-tight">
          {scenario.person}
        </div>
        <div class="font-mono text-xs text-foreground/40 tracking-[0.12em] uppercase mt-0.5">
          {scenario.era}
        </div>
      </div>
      <!-- CTA -->
      <div
        class="flex-shrink-0 mt-1 font-mono text-xs text-accent/50 tracking-[0.08em] uppercase group-hover:text-accent transition-colors"
        aria-hidden="true"
      >
        [ call ]
      </div>
    </div>
    <div class="font-serif italic text-foreground/60 text-sm mt-2 leading-snug">
      "{scenario.teaser}"
    </div>
  </div>
</a>
