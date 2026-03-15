<script lang="ts">
  /**
   * @what - Tappable choice cards shown when `announce_choice` tool fires
   * @why - Student picks a path by tapping, speaking, or typing; used on /app and /session
   * @props - choices, onselect, hint
   */
  import { onDestroy } from 'svelte';
  import type { Choice } from '../stores/liveSession';
  import { createWebHaptics } from 'web-haptics/svelte';

  interface Props {
    choices: Choice[];
    onselect: (choice: Choice) => void;
    hint?: string;
  }

  let { choices, onselect, hint = 'or speak / type your own' }: Props = $props();

  const haptic = createWebHaptics();
  onDestroy(() => haptic.destroy());

  let selected = $state<string | null>(null);

  function handleSelect(choice: Choice) {
    haptic.trigger('light');
    selected = choice.title;
    onselect(choice);
  }
</script>

<div
  role="group"
  aria-label="Choose your response"
  class="flex flex-col gap-0 rounded-sm overflow-hidden border border-foreground/10"
>
  {#each choices as choice, i (choice.title)}
    {@const isSelected = selected === choice.title}
    <button
      type="button"
      aria-label="Choose: {choice.title}"
      onclick={() => handleSelect(choice)}
      style="animation-delay: {i * 60}ms"
      class="w-full text-left min-h-[44px] px-4 py-3
        border-b border-foreground/10 last:border-b-0
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50
        transition-colors duration-150
        hover:border-l-2 hover:border-l-accent/40
        animate-fade-slide-up
        {isSelected
          ? 'bg-accent/20 border-l-2 border-l-accent/60'
          : 'bg-surface hover:bg-foreground/5 active:bg-foreground/10'}"
    >
      <div class="font-mono text-sm font-semibold text-foreground tracking-[0.04em]">
        {choice.title}
      </div>
      <div class="font-mono text-xs text-foreground/50 leading-relaxed mt-0.5">
        {choice.description}
      </div>
    </button>
  {/each}
</div>

{#if hint}
  <p class="mt-2 font-mono text-xs text-foreground/30 tracking-[0.06em] text-center">
    {hint}
  </p>
{/if}

<style>
  @keyframes fade-slide-up {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-slide-up {
    animation: fade-slide-up 200ms ease-out both;
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-fade-slide-up {
      animation: none;
    }
  }
</style>
