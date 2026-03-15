<script lang="ts">
  /**
   * @what - Call controls wired to session lifecycle (disconnect + redirect)
   * @why - CallControls needs onhangup which requires session store access
   */
  import CallControls from './CallControls.svelte';
  import { disconnect } from '@/lib/liveSession/client';
  import { stopMic } from '@/lib/liveSession/audio';
  import { $sessionId as sessionIdStore } from '@/stores/liveSession';

  function handleHangUp() {
    const sid = sessionIdStore.get();
    stopMic();
    disconnect();
    window.location.href = sid ? `/summary?session=${sid}` : '/summary';
  }
</script>

<CallControls onhangup={handleHangUp} />
