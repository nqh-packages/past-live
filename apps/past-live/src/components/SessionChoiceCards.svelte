<script lang="ts">
  /**
   * @what - Store-wired wrapper for ChoiceCards on the session page
   * @why - ChoiceCards is a prop-driven primitive; this layer reads $activeChoices from the
   *        live session store and wires dismiss/select behavior
   * @note - Batch 3 will expand the dismiss-on-speech behavior via audio callbacks
   */
  import ChoiceCards from './ChoiceCards.svelte';
  import {
    $activeChoices as activeChoices,
  } from '../stores/liveSession';
  import type { Choice } from '../stores/liveSession';
  import { sendText } from '../lib/liveSession/client';

  function handleSelect(choice: Choice) {
    // Dismiss cards immediately
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
  <ChoiceCards
    choices={$activeChoices}
    onselect={handleSelect}
    hint="or speak / type your own idea"
  />
{/if}
