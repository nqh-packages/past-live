<script lang="ts">
  /**
   * @what - Session remaining time countdown — hidden until 5:00, accent at 2:00
   * @why - Users need to know the 15-min hard limit; agent wraps up by ~14 min via prompt
   * @note - Starts on session active. Format: "> 4:32 remaining"
   */
  import { $isActive as isActive, $sessionStartTime as sessionStartTime } from '../stores/liveSession';

  const SESSION_MAX_MS = 15 * 60 * 1000; // 15 minutes hard limit
  const SHOW_THRESHOLD_MS = 5 * 60 * 1000; // show at 5:00 remaining
  const ACCENT_THRESHOLD_MS = 2 * 60 * 1000; // accent color at 2:00 remaining

  let remainingMs = $state(SESSION_MAX_MS);

  const shouldShow = $derived(remainingMs <= SHOW_THRESHOLD_MS && $isActive);
  const isUrgent = $derived(remainingMs <= ACCENT_THRESHOLD_MS);

  const formattedTime = $derived.by(() => {
    const totalSecs = Math.max(0, Math.ceil(remainingMs / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  });

  $effect(() => {
    if (!$isActive) {
      remainingMs = SESSION_MAX_MS;
      return;
    }

    const startTime = $sessionStartTime;
    const id = setInterval(() => {
      const elapsed = Date.now() - startTime;
      remainingMs = Math.max(0, SESSION_MAX_MS - elapsed);
    }, 1000);

    return () => clearInterval(id);
  });
</script>

{#if shouldShow}
  <div
    class="font-mono text-[10px] tracking-[0.08em] transition-colors duration-500
      {isUrgent ? 'text-accent animate-pulse' : 'text-foreground/30'}"
    role="timer"
    aria-label="Session time remaining"
    aria-live="polite"
  >
    &gt; {formattedTime} remaining
    {#if isUrgent}
      <span class="ml-1 text-accent/70">wrap up transmission</span>
    {/if}
  </div>
{/if}
