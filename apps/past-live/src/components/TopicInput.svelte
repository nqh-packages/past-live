<script lang="ts">
  /**
   * @what - Topic input with mic + text
   * @why - Voice-first with text fallback for topic entry
   */

  let topic = $state("");

  function handleSubmit() {
    if (!topic.trim()) return;
    window.location.href = `/session?topic=${encodeURIComponent(topic.trim())}`;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") handleSubmit();
  }
</script>

<div class="flex flex-col gap-3">
  <!-- Text input -->
  <div class="relative">
    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-accent/40 font-mono text-xs select-none">
      &gt;
    </span>
    <input
      type="text"
      bind:value={topic}
      onkeydown={handleKeydown}
      placeholder="what are you studying?"
      class="w-full bg-surface border border-border rounded-sm pl-7 pr-4 py-3 font-mono text-sm text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-accent/30 transition-colors"
      aria-label="Enter a topic to study"
    />
  </div>

  <!-- Mic button -->
  <button
    type="button"
    class="self-center w-14 h-14 rounded-full border-2 border-accent/30 flex items-center justify-center hover:border-accent/60 hover:bg-accent/5 transition-colors"
    aria-label="Hold to speak"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent/60">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  </button>

  <p class="text-center font-mono text-[10px] text-foreground/20 tracking-[0.1em]">
    hold to speak
  </p>
</div>
