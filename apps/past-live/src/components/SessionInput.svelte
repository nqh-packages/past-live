<script lang="ts">
  /**
   * @what - In-session text input
   * @why - Text fallback for voice input during role-play
   */

  let message = $state("");

  function handleSubmit() {
    if (!message.trim()) return;
    message = "";
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") handleSubmit();
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
    placeholder="type your orders..."
    class="w-full bg-surface border border-border rounded-sm pl-7 pr-4 py-3 font-mono text-sm text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-accent/30 transition-colors"
    aria-label="Type a response"
  />
</div>
