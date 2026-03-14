<script lang="ts">
  /**
   * @what - 3-second dispatch-themed countdown overlay before session starts
   * @why - Gives users mental preparation: STANDBY → CHANNEL OPEN → INCOMING TRANSMISSION
   * @props - oncomplete: called after all 3 phases complete
   */

  interface Props {
    oncomplete: () => void;
  }

  let { oncomplete }: Props = $props();

  const PHASES = [
    { key: 'standby', label: '> STANDBY...', duration: 1000 },
    { key: 'channel-open', label: '> CHANNEL OPEN...', duration: 1000 },
    { key: 'incoming', label: '> INCOMING TRANSMISSION...', duration: 1000 },
  ];

  let phaseIndex = $state(0);
  let visible = $state(true);

  const currentLabel = $derived(PHASES[phaseIndex]?.label ?? '');

  $effect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Schedule each phase transition
    let cumulative = PHASES[0].duration;
    for (let i = 1; i < PHASES.length; i++) {
      const targetIndex = i;
      const delay = cumulative;
      timeouts.push(
        setTimeout(() => {
          phaseIndex = targetIndex;
        }, delay),
      );
      cumulative += PHASES[i].duration;
    }

    // After all phases: fade out then fire oncomplete
    timeouts.push(
      setTimeout(() => {
        visible = false;
      }, cumulative),
    );
    timeouts.push(
      setTimeout(() => {
        oncomplete();
      }, cumulative + 400),
    );

    return () => {
      timeouts.forEach(clearTimeout);
    };
  });
</script>

{#if visible}
  <div
    class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/98 transition-opacity duration-400"
    role="status"
    aria-live="assertive"
    aria-label="Session countdown"
  >
    <div class="relative pl-[72px]">
      <!-- Vertical accent line (Dispatch style) -->
      <div class="absolute top-0 left-[60px] bottom-0 w-px bg-accent/20" aria-hidden="true"></div>

      <!-- Countdown phase text -->
      <div class="font-mono text-sm text-accent tracking-[0.16em] uppercase min-h-[1.5em]">
        {currentLabel}
      </div>

      <!-- Phase progress dots -->
      <div class="flex gap-2 mt-4" aria-hidden="true">
        {#each PHASES as phase, i (phase.key)}
          <div
            class="w-1.5 h-1.5 rounded-full transition-colors duration-300
              {i <= phaseIndex ? 'bg-accent' : 'bg-accent/20'}"
          ></div>
        {/each}
      </div>
    </div>
  </div>
{/if}
