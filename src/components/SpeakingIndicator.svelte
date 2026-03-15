<script lang="ts">
  /**
   * @what - Audio waveform animation shown while model is speaking
   * @why - Gives visual feedback when model speaks (David's feedback: no visual feedback)
   * @note - 4 CSS bars with staggered animation. prefers-reduced-motion shows static text.
   */
  import { $isSpeaking as isSpeaking } from '../stores/liveSession';
</script>

{#if $isSpeaking}
  <div
    class="flex items-center gap-1 h-6"
    role="status"
    aria-label="AI is speaking"
  >
    <!-- prefers-reduced-motion: static fallback text -->
    <span class="sr-only motion-reduce:not-sr-only motion-reduce:font-mono motion-reduce:text-xs motion-reduce:text-accent/70">
      &gt; transmitting...
    </span>

    <!-- 4 animated waveform bars — hidden for reduced motion -->
    <div class="motion-reduce:hidden flex items-end gap-[3px] h-5" aria-hidden="true">
      <div class="waveform-bar" style="animation-delay: 0ms"></div>
      <div class="waveform-bar" style="animation-delay: 150ms"></div>
      <div class="waveform-bar" style="animation-delay: 75ms"></div>
      <div class="waveform-bar" style="animation-delay: 225ms"></div>
    </div>
  </div>
{/if}

<style>
  .waveform-bar {
    width: 3px;
    background-color: var(--color-accent);
    opacity: 0.7;
    border-radius: 1.5px;
    animation: waveform 0.8s ease-in-out infinite alternate;
    height: 4px;
  }

  @keyframes waveform {
    0% {
      height: 4px;
    }
    100% {
      height: 20px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .waveform-bar {
      animation: none;
    }
  }
</style>
