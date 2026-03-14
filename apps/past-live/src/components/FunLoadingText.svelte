<script lang="ts">
  /**
   * @what - Rotating brand-voice loading text in Dispatch register
   * @why - DRY component shared by session preview loading AND connection wait after countdown
   * @note - Cycles through texts every ~3s. Stops cleanly on destroy.
   */

  const LOADING_TEXTS = [
    '> wiring up the time machine...',
    '> dusting off the history books...',
    '> recruiting your character...',
    '> locating the era...',
    '> calibrating the portal...',
    '> the past is loading...',
    '> summoning witnesses...',
    '> scanning the archives...',
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

<p class="font-mono text-[11px] text-foreground/40 tracking-[0.06em] animate-pulse">
  {LOADING_TEXTS[currentIndex]}
</p>
