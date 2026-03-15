<script lang="ts">
  /**
   * @what - Rotating brand-voice loading text for call connection
   * @why - DRY component shared by session preview loading AND connection wait after countdown
   * @note - Cycles through texts every ~3s. Stops cleanly on destroy.
   */

  const LOADING_TEXTS = [
    '> connecting your call...',
    '> the line is ringing...',
    '> recruiting your character...',
    '> locating the era...',
    '> the past is picking up...',
    '> hold the line...',
    '> summoning witnesses...',
    '> connecting your call...',
  ];

  const INTERVAL_MS = 3000;

  let currentIndex = $state(Math.floor(Math.random() * LOADING_TEXTS.length));

  $effect(() => {
    const id = setInterval(() => {
      currentIndex = (currentIndex + 1) % LOADING_TEXTS.length;
    }, INTERVAL_MS);

    return () => clearInterval(id);
  });
</script>

<p class="font-mono text-xs text-foreground/40 tracking-[0.06em] animate-pulse" role="status" aria-live="polite" aria-atomic="true">
  {LOADING_TEXTS[currentIndex]}
</p>
