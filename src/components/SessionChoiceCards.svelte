<script lang="ts">
  /**
   * @what - Store-wired wrapper for ChoiceCards on the session page
   * @why - ChoiceCards is a prop-driven primitive; this layer reads $activeChoices from the
   *        live session store, wires dismiss/select behavior, and records choice events
   *        to $choiceHistory for the summary infographic
   */
  import ChoiceCards from './ChoiceCards.svelte';
  import {
    $activeChoices as activeChoices,
    $choiceHistory as choiceHistory,
    $activeChoiceContext as activeChoiceContext,
  } from '../stores/liveSession';
  import type { Choice } from '../stores/liveSession';
  import { sendText } from '../lib/liveSession/client';

  function handleSelect(choice: Choice) {
    // Record the choice event before dismissing — preserves all context
    const ctx = activeChoiceContext.get();
    const currentChoices = activeChoices.get() ?? [];
    choiceHistory.set([
      ...choiceHistory.get(),
      {
        setup: ctx?.setup ?? '',
        options: currentChoices,
        picked: choice.title,
        consequence: ctx?.consequences?.[choice.title] ?? '',
      },
    ]);

    // Clear context and dismiss cards
    activeChoiceContext.set(null);
    activeChoices.set(null);

    // Send the choice title as text input (same as typing)
    try {
      sendText(choice.title);
    } catch {
      // Session may have ended — ignore
    }
  }
</script>

{#if $activeChoices && $activeChoices.length > 0}
  <div aria-live="polite" aria-atomic="true">
    <p class="sr-only">{$activeChoices.length} choices available. Select one or speak your own idea.</p>
    <ChoiceCards
      choices={$activeChoices}
      onselect={handleSelect}
      hint="or speak / type your own idea"
    />
  </div>
{/if}
