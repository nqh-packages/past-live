<script lang="ts">
  /**
   * @what - Phone-call style elapsed timer, counts up from 00:00
   * @why - Phone calls count up (00:04:32), not down — matches call metaphor
   * @note - Always visible once session starts. Format: MM:SS
   */
  import { $isActive as isActive, $sessionStartTime as sessionStartTime } from '../stores/liveSession';

  let elapsed = $state(0);

  $effect(() => {
    if (!$isActive) {
      elapsed = 0;
      return;
    }
    const start = $sessionStartTime;
    // Set immediately so first render is not 0
    elapsed = Math.floor((Date.now() - start) / 1000);
    const interval = setInterval(() => {
      elapsed = Math.floor((Date.now() - start) / 1000);
    }, 1000);
    return () => clearInterval(interval);
  });

  const formatted = $derived.by(() => {
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });
</script>

{#if $isActive}
  <span
    class="font-mono text-[11px] text-foreground/40 tabular-nums"
    role="timer"
    aria-label="Call duration {formatted}"
  >
    {formatted}
  </span>
{/if}
