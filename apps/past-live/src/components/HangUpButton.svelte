<script lang="ts">
  /**
   * @what - Red phone button to end the call
   * @why - Prominent, iPhone-convention hang-up action — student can end anytime
   * @props - onclick
   */
  import { onDestroy } from 'svelte';
  import { createWebHaptics } from 'web-haptics/svelte';

  interface Props {
    onclick: () => void;
  }

  let { onclick }: Props = $props();

  const haptic = createWebHaptics();
  onDestroy(() => haptic.destroy());

  function handleClick() {
    haptic.trigger('medium');
    onclick();
  }
</script>

<button
  type="button"
  onclick={handleClick}
  aria-label="End call"
  class="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 flex items-center
    justify-center transition-colors shadow-lg
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2
    focus-visible:ring-offset-background"
>
  <!-- Phone down icon -->
  <svg
    class="w-6 h-6 text-white"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
  </svg>
</button>
