<script lang="ts">
  /**
   * @what - In-session text input wired to sendText via WebSocket
   * @why - Text fallback for voice input; disabled when session is not active
   */
  import { onMount } from 'svelte';
  import { $isActive as isActiveStore } from '../stores/liveSession';
  import { sendText } from '../lib/liveSession/client';

  let message = $state('');
  let isActive = $state(false);

  onMount(() => {
    const unsub = isActiveStore.subscribe((v) => { isActive = v; });
    return unsub;
  });

  function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed || !isActive) return;
    sendText(trimmed);
    message = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit();
  }
</script>

<div class="relative">
  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-accent/40 font-mono text-xs select-none">
    &gt;
  </span>
  <input
    type="text"
    bind:value={message}
    onkeydown={handleKeydown}
    placeholder={isActive ? 'type your orders...' : 'session not active'}
    disabled={!isActive}
    class="w-full bg-surface border border-border rounded-sm pl-7 pr-4 py-3 font-mono text-sm text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    aria-label="Type a response"
  />
</div>
