<script lang="ts">
  /**
   * @what - Decision recap cards for the summary infographic
   * @why - Shows each decision moment from the session: the setup question, all options
   *        (highlighting the one picked), and the consequence of that choice
   * @props - choices: ChoiceEvent[] — accumulated from SessionChoiceCards during the call
   * @note - Parent is responsible for conditional rendering (only show when choices.length > 0)
   */
  import type { ChoiceEvent } from '../stores/liveSession';

  let {
    choices,
  }: {
    choices: ChoiceEvent[];
  } = $props();
</script>

<section class="mx-5 mb-6" aria-label="Your decisions">
  <p
    class="font-mono text-xs text-foreground/40 tracking-[0.12em] uppercase mb-3"
    aria-hidden="true"
  >
    &gt; your decisions
  </p>

  <div class="flex flex-col gap-3" role="list">
    {#each choices as choiceEvent, i (i)}
      <article
        class="px-4 py-4 rounded-sm"
        style="background-color: color-mix(in oklch, var(--color-surface) 50%, transparent);
               border: 1px solid color-mix(in oklch, var(--color-foreground) 6%, transparent);"
        role="listitem"
        aria-label="Decision {i + 1}{choiceEvent.setup ? ': ' + choiceEvent.setup : ''}"
      >
        <!-- Setup question -->
        {#if choiceEvent.setup}
          <p
            class="font-mono text-xs leading-relaxed mb-3"
            style="color: var(--color-foreground); opacity: 0.5;"
          >
            {choiceEvent.setup}
          </p>
        {/if}

        <!-- Options list — picked option has accent border + full opacity -->
        <ul class="flex flex-col gap-1.5 mb-3" role="list" aria-label="Options presented">
          {#each choiceEvent.options as option (option.title)}
            {@const isPicked = option.title === choiceEvent.picked}
            <li
              class="flex items-start gap-2.5 px-3 py-2 rounded-sm text-xs font-mono leading-snug"
              style="border-left: 2px solid {isPicked
                ? 'var(--summary-accent, var(--color-accent))'
                : 'color-mix(in oklch, var(--color-foreground) 10%, transparent)'};
                     background-color: {isPicked
                ? 'color-mix(in oklch, var(--summary-accent, var(--color-accent)) 8%, transparent)'
                : 'transparent'};
                     color: var(--color-foreground);
                     opacity: {isPicked ? 1 : 0.4};"
              aria-current={isPicked ? 'true' : undefined}
            >
              {#if isPicked}
                <span
                  class="flex-shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full"
                  style="background-color: var(--summary-accent, var(--color-accent));"
                  aria-hidden="true"
                ></span>
              {:else}
                <span
                  class="flex-shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full"
                  style="background-color: color-mix(in oklch, var(--color-foreground) 20%, transparent);"
                  aria-hidden="true"
                ></span>
              {/if}
              <span class="flex-1 min-w-0">{option.title}</span>
            </li>
          {/each}
        </ul>

        <!-- Consequence of the picked option -->
        {#if choiceEvent.consequence}
          <p
            class="font-serif italic text-sm leading-relaxed pl-3"
            style="border-left: 2px solid color-mix(in oklch, var(--color-foreground) 10%, transparent);
                   color: var(--color-foreground); opacity: 0.65;"
          >
            {choiceEvent.consequence}
          </p>
        {/if}
      </article>
    {/each}
  </div>
</section>
