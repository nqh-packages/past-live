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

  function handleSelect(choice: Choice) {
    haptic.trigger('light');
    onselect(choice);
  }
</script>

<div
  role="listbox"
  aria-label="Choose your response"
  class="flex flex-col gap-0 rounded-sm overflow-hidden border border-foreground/10"
>
  {#each choices as choice (choice.title)}
    <button
      type="button"
      role="option"
      aria-selected="false"
      aria-label="Choose: {choice.title}"
      onclick={() => handleSelect(choice)}
      class="w-full text-left min-h-[44px] px-4 py-3 bg-surface hover:bg-foreground/5
        active:bg-foreground/10 transition-colors border-b border-foreground/10 last:border-b-0
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
    >
      <div class="font-mono text-[11px] font-semibold text-foreground tracking-[0.06em] uppercase">
        {choice.title}
      </div>
      <hr class="my-1.5 border-foreground/10" aria-hidden="true" />
      <div class="font-mono text-[11px] text-foreground/50 leading-relaxed">
        {choice.description}
      </div>
    </button>
  {/each}
</div>

{#if hint}
  <p class="mt-2 font-mono text-[10px] text-foreground/30 tracking-[0.06em] text-center">
    {hint}
  </p>
{/if}
