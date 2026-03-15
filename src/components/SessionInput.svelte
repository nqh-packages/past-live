<script lang="ts">
  /**
   * @what - In-session text input wired to sendText via WebSocket
   * @why - Text fallback for voice input; disabled when session is not active
   */
  import { onDestroy } from 'svelte';
  import { $isActive as isActive } from '../stores/liveSession';
  import { sendText } from '../lib/liveSession/client';
  import { createWebHaptics } from 'web-haptics/svelte';

  const haptic = createWebHaptics();
  onDestroy(() => haptic.destroy());

  let message = $state('');

  function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed || !$isActive) return;
    haptic.trigger('light');
    sendText(trimmed);
    message = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    // Enter submits; Shift+Enter does nothing (single-line input)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // ─── Virtual keyboard: scroll input into view on mobile resize ────────────
  $effect(() => {
    if (!globalThis.visualViewport) return;

    function onResize() {
      const input = document.querySelector('[data-session-input]');
      if (input && document.activeElement === input) {
        input.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }

    globalThis.visualViewport.addEventListener('resize', onResize);
    return () => globalThis.visualViewport?.removeEventListener('resize', onResize);
  });
</script>

<div class="relative">
  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-accent/40 font-mono text-xs select-none">
    &gt;
  </span>
  <input
    type="text"
    bind:value={message}
    onkeydown={handleKeydown}
    placeholder={$isActive ? 'say something...' : 'call has ended'}
    disabled={!$isActive}
    data-session-input
    class="w-full bg-surface border border-border rounded-sm pl-7 pr-4 py-3 font-mono text-sm
      text-foreground placeholder:text-foreground/20
      focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/20
      transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    aria-label="Say something to the character"
  />
</div>
