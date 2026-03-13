<script lang="ts">
  /**
   * @what - Invisible orchestrator island that manages WebSocket session lifecycle
   * @why - Mounts on /session, connects WS, wires audio callbacks, handles state transitions
   * @props - scenarioId, topic, backendWsUrl
   */
  import { onMount, onDestroy } from 'svelte';
  import {
    $status as statusStore,
    $error as errorStore,
  } from '../stores/liveSession';
  import { connectSession, disconnect, sendAudio, sendAudioEnd } from '../lib/liveSession/client';
  import { setAudioSendCallbacks } from '../lib/liveSession/audio';

  interface Props {
    scenarioId?: string;
    topic?: string;
    backendWsUrl: string;
  }

  let { scenarioId, topic, backendWsUrl }: Props = $props();

  let status = $state(statusStore.get());
  let errorMsg = $state(errorStore.get());

  onMount(() => {
    const unsubStatus = statusStore.subscribe((v) => { status = v; });
    const unsubError = errorStore.subscribe((v) => { errorMsg = v; });

    setAudioSendCallbacks(sendAudio, sendAudioEnd);

    if (scenarioId || topic) {
      connectSession({ scenarioId, topic, backendWsUrl });
    }

    return () => {
      unsubStatus();
      unsubError();
    };
  });

  onDestroy(() => {
    disconnect();
  });

  $effect(() => {
    if (status === 'ended') {
      window.location.href = '/summary';
    }
  });

  function retry() {
    if (scenarioId || topic) {
      connectSession({ scenarioId, topic, backendWsUrl });
    }
  }
</script>

{#if status === 'connecting'}
  <div class="fixed inset-0 z-40 flex flex-col items-center justify-center bg-background/95">
    <div class="relative pl-[72px]">
      <div class="absolute top-0 left-[60px] bottom-0 w-px bg-accent/8" aria-hidden="true"></div>
      <div class="font-mono text-[10px] text-accent tracking-[0.12em] uppercase animate-pulse mb-2">
        &gt; establishing channel...
      </div>
      <div class="font-mono text-[10px] text-foreground/30">
        &gt; contacting historical record
      </div>
    </div>
  </div>
{/if}

{#if status === 'error'}
  <div class="fixed inset-0 z-40 flex flex-col items-center justify-center bg-background/95">
    <div class="max-w-xs text-center space-y-6">
      <div class="font-mono text-[10px] text-accent tracking-[0.12em] uppercase">
        &gt; transmission lost
      </div>
      <p class="font-mono text-xs text-foreground/40">
        {errorMsg || 'Connection failed'}
      </p>
      <div class="flex gap-4 justify-center">
        <button
          type="button"
          onclick={retry}
          class="border border-accent/30 text-accent font-mono text-[11px] tracking-[0.12em] uppercase px-5 py-2.5 rounded-sm hover:bg-accent/5 transition-colors"
          aria-label="Retry connection"
        >
          [ retry ]
        </button>
        <a
          href="/"
          class="border border-border text-foreground/40 font-mono text-[11px] tracking-[0.12em] uppercase px-5 py-2.5 rounded-sm hover:border-accent/20 hover:text-foreground/60 transition-colors"
        >
          [ abort ]
        </a>
      </div>
    </div>
  </div>
{/if}
