<script lang="ts">
  /**
   * @what - iPhone-style call control bar: [speaker] [hang up] [mute]
   * @why - Replaces single mic button with full phone-call control metaphor
   * @props - onhangup, onspeakertoggle
   */
  import { onDestroy } from 'svelte';
  import { createWebHaptics } from 'web-haptics/svelte';
  import HangUpButton from './HangUpButton.svelte';
  import MicButton from './MicButton.svelte';

  interface Props {
    onhangup: () => void;
    onspeakertoggle?: () => void;
  }

  let { onhangup, onspeakertoggle }: Props = $props();

  const haptic = createWebHaptics();
  onDestroy(() => haptic.destroy());

  let speakerActive = $state(false);

  function handleSpeakerToggle() {
    haptic.trigger('light');
    speakerActive = !speakerActive;
    onspeakertoggle?.();
  }
</script>

<div class="flex items-center justify-center gap-8 py-2" role="group" aria-label="Call controls">
  <!-- Speaker toggle -->
  <button
    type="button"
    onclick={handleSpeakerToggle}
    aria-label="Toggle speaker"
    aria-pressed={speakerActive}
    class="w-12 h-12 rounded-full bg-surface border border-foreground/10 flex items-center justify-center
      hover:bg-foreground/5 active:bg-foreground/10 transition-colors
      focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50
      {speakerActive ? 'border-accent/40 text-accent' : 'text-foreground/40'}"
  >
    <svg
      class="w-5 h-5"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  </button>

  <!-- Hang up — centered, prominent -->
  <HangUpButton onclick={onhangup} />

  <!-- Mute — delegates to MicButton -->
  <MicButton />
</div>
