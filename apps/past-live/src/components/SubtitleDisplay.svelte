<script lang="ts">
  /**
   * @what - Live subtitle display wired to $outputTranscript Nano Store
   * @why - Shows agent speech as text for accessibility and immersion
   */
  import { onMount } from 'svelte';
  import { $outputTranscript as outputTranscriptStore, $status as statusStore } from '../stores/liveSession';

  let displayedText = $state('');
  let status = $state('idle');

  const CONNECTING_PLACEHOLDER = '> awaiting transmission...';

  onMount(() => {
    const unsubTranscript = outputTranscriptStore.subscribe((v) => { displayedText = v; });
    const unsubStatus = statusStore.subscribe((v) => { status = v; });
    return () => {
      unsubTranscript();
      unsubStatus();
    };
  });

  const shownText = $derived(
    status === 'connecting'
      ? CONNECTING_PLACEHOLDER
      : displayedText || (status === 'active' ? '> listening...' : '')
  );
</script>

<div class="min-h-[120px] border-l border-accent/10 pl-4">
  <pre class="font-mono text-sm text-foreground/70 whitespace-pre-wrap leading-relaxed">{shownText}<span class="animate-pulse text-accent">|</span></pre>
</div>
