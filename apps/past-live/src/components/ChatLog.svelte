<script lang="ts">
  /**
   * @what - Character-named chat log for live call session
   * @why - Replaces SubtitleDisplay; shows structured messages with sender tags
   * @note - Format: "> [CHARACTER_NAME] text..." / "> [NARRATOR] text..." / "> [YOU] text..."
   */
  import { $messages as messages, $status as status } from '../stores/liveSession';

  // Auto-scroll action: attaches to the log element, re-runs when messages change
  function autoScroll(node: HTMLElement) {
    function scroll() {
      node.scrollTop = node.scrollHeight;
    }

    // Subscribe to the messages store so we scroll on each update
    const unsubscribe = messages.subscribe(() => {
      // Use rAF so the DOM has been updated before measuring scrollHeight
      requestAnimationFrame(scroll);
    });

    return {
      destroy() {
        unsubscribe();
      },
    };
  }
</script>

<div
  use:autoScroll
  class="h-full overflow-y-auto border-l border-accent/10 pl-4 space-y-3 scroll-smooth"
  role="log"
  aria-live="polite"
  aria-label="Call transcript"
>
  {#if $status === 'connecting'}
    <p class="font-mono text-[11px] text-foreground/30 animate-pulse">
      &gt; calling...
    </p>
  {:else if $messages.length === 0 && $status === 'active'}
    <p class="font-mono text-[11px] text-foreground/20">
      &gt; listening...
    </p>
  {:else}
    {#each $messages as msg, i (i)}
      <div class="font-mono text-[11px] leading-relaxed">
        <span class="text-accent/70">&gt; [{msg.sender}]</span>
        <span class="text-foreground/70 ml-1 whitespace-pre-wrap">{msg.text}</span>
      </div>
    {/each}
  {/if}
</div>
