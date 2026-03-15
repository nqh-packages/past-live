<script lang="ts">
  /**
   * @what - Recent calls section for the home screen
   * @why - Lets returning students quickly call the same character again or see their history
   * @props - backendUrl: string — passed from app.astro to avoid VITE_* in Svelte
   */

  interface CallEntry {
    scenarioId: string;
    characterName: string;
    date: string;
    duration: number;
    topicsCovered: string[];
    agentInsight: string;
  }

  let { backendUrl }: { backendUrl: string } = $props();

  let calls = $state<CallEntry[]>([]);
  let loading = $state(false);

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  async function load(studentId: string) {
    loading = true;
    try {
      const res = await fetch(`${backendUrl}/call-history?studentId=${encodeURIComponent(studentId)}`);
      if (!res.ok) return;
      const data = await res.json() as { calls: CallEntry[] };
      calls = data.calls;
    } catch {
      // Graceful degradation — show nothing, not an error state
    } finally {
      loading = false;
    }
  }

  // Load on mount if student ID available (Clerk or anonymous session)
  $effect(() => {
    const studentId = (window as unknown as Record<string, string>)['pastLiveStudentId'];
    if (studentId) load(studentId);
  });
</script>

{#if calls.length > 0}
  <section class="w-full mb-10" aria-label="Recent calls">
    <h2 class="text-foreground/30 text-xs tracking-[0.2em] uppercase mb-4 font-normal">recent calls</h2>
    <ul class="flex flex-col gap-2" role="list">
      {#each calls as call (call.scenarioId + call.date)}
        <li class="flex items-start justify-between gap-3 px-3 py-2 rounded-sm bg-foreground/5 text-sm">
          <div class="flex-1 min-w-0">
            <span class="block font-display text-foreground/80 truncate">{call.characterName}</span>
            {#if call.agentInsight}
              <span class="block font-serif italic text-foreground/40 text-xs mt-0.5 line-clamp-1">{call.agentInsight}</span>
            {/if}
          </div>
          <div class="shrink-0 text-right font-mono text-foreground/30 text-xs">
            <span class="block tabular-nums">{formatDuration(call.duration)}</span>
            <span class="block mt-0.5">{formatDate(call.date)}</span>
          </div>
        </li>
      {/each}
    </ul>
  </section>
{/if}
