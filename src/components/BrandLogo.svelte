<script lang="ts">
  /**
   * @what - Brand logo lockup: "Past" + comma-phone + "LIVE"
   * @why - The comma-phone replaces the comma. Flipped horizontally and
   *        absolutely positioned to hang below the baseline like a real comma.
   *        Past speaks to LIVE through the phone.
   */
  import CommaPhoneIcon from './CommaPhoneIcon.svelte';

  type LogoSize = 'sm' | 'md' | 'lg';

  interface Props {
    size?: LogoSize;
    class?: string;
    iconOnly?: boolean;
  }

  let { size = 'md', class: className = '', iconOnly = false }: Props = $props();

  const sizeMap: Record<LogoSize, {
    icon: number;
    text: string;
    /** top offset to hang below baseline like a comma */
    top: string;
    /** width of the gap between Past and LIVE where the phone sits */
    commaWidth: string;
  }> = {
    sm: { icon: 14, text: 'text-2xl', top: '-0.45em', commaWidth: '1.0em' },
    md: { icon: 20, text: 'text-4xl sm:text-5xl', top: '-0.45em', commaWidth: '1.1em' },
    lg: { icon: 24, text: 'text-5xl sm:text-6xl', top: '-0.45em', commaWidth: '1.2em' },
  };

  const config = $derived(sizeMap[size]);
</script>

{#if iconOnly}
  <span class="inline-flex items-center {className}" aria-label="Past, Live">
    <CommaPhoneIcon size={config.icon} class="text-accent shrink-0 -scale-x-100" />
  </span>
{:else}
  <span class="inline-flex items-baseline {className}" aria-label="Past, Live">
    <span class="font-serif italic text-foreground/30 {config.text}">Past</span>
    <span class="relative inline-block" style="width: {config.commaWidth};">
      <span
        class="absolute left-1/2 -translate-x-1/2"
        style="top: {config.top}; transform: translateX(-50%) scaleX(-1) rotate(-15deg);"
      >
        <CommaPhoneIcon size={config.icon} class="text-accent" />
      </span>
    </span>
    <span class="font-display text-accent {config.text} tracking-wider">LIVE</span>
  </span>
{/if}
