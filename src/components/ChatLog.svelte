<script lang="ts">
  /**
   * @what - Character-named chat log for live call session
   * @why - Replaces SubtitleDisplay; shows structured messages with sender tags
   * @note - Format: "> [CHARACTER_NAME] text..." / "> [YOU] text..."
   */
  import { $messages as messages, $status as status } from '../stores/liveSession';
  import { isNearBottom } from '../lib/liveSession/scroll-utils';

  let nearBottom = $state(true);

  // Smart auto-scroll: only scroll if user is near bottom
  function autoScroll(node: HTMLElement) {
    function scrollIfNearBottom() {
      if (nearBottom) {
        node.scrollTop = node.scrollHeight;
      }
    }

    function handleScroll() {
      nearBottom = isNearBottom(node.scrollTop, node.clientHeight, node.scrollHeight);
    }

    node.addEventListener('scroll', handleScroll, { passive: true });

    const unsubscribe = messages.subscribe(() => {
      requestAnimationFrame(scrollIfNearBottom);
    });

    return {
      destroy() {
        unsubscribe();
        node.removeEventListener('scroll', handleScroll);
      },
    };
  }

  function scrollToBottom(node: HTMLElement) {
    nearBottom = true;
    node.scrollTop = node.scrollHeight;
  }

  let logEl: HTMLElement | undefined = $state();

  /** Student sender tags that indicate "YOU" messages for dimmer styling */
  const YOU_SENDERS = new Set(['YOU', 'STUDENT', 'USER']);
</script>

<div class="relative h-full">
  <div
    bind:this={logEl}
    use:autoScroll
    class="h-full overflow-y-auto border-l border-accent/10 pl-4 space-y-3 scroll-smooth scroll-py-2"
    role="log"
    aria-live="polite"
    aria-label="Call transcript"
  >
    {#if $status === 'connecting'}
      <p class="font-mono text-xs text-foreground/30 animate-pulse">
        &gt; calling...
      </p>
    {:else if $messages.length === 0 && $status === 'active'}
      <p class="font-mono text-xs text-foreground/40">
        &gt; waiting for you
      </p>
    {:else}
      {#each $messages as msg, i (i)}
        {@const isYou = YOU_SENDERS.has(msg.sender.toUpperCase())}
        {@const isSystem = msg.sender === 'SYSTEM'}
        <div
          class="font-mono text-sm leading-relaxed {isYou
            ? ''
            : isSystem
              ? ''
              : 'pl-2 border-l-2 border-accent/20 -ml-[1px]'}"
        >
          {#if isSystem}
            <span class="text-xs text-foreground/40 italic">{msg.text}</span>
          {:else}
            <span class="text-xs {isYou ? 'text-foreground/35' : 'text-accent font-semibold'}"
              >&gt; [{msg.sender}]</span
            >
            <span
              class="{isYou
                ? 'text-foreground/50'
                : 'text-foreground/80'} ml-1 whitespace-pre-wrap">{msg.text}</span
            >
          {/if}
        </div>
      {/each}
      {#if $status === 'reconnecting'}
        <p class="font-mono text-xs text-accent/50 animate-pulse mt-2">
          &gt; reconnecting...
        </p>
      {/if}
    {/if}
  </div>

  {#if !nearBottom && logEl}
    <button
      onclick={() => scrollToBottom(logEl!)}
      class="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm hover:bg-accent/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      aria-label="Scroll to latest message"
    >
      ↓
    </button>
  {/if}
</div>
