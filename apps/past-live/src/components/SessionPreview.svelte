<script lang="ts">
  /**
   * @what - Session preview overlay: listens for topic/scenario events, fetches preview, shows panel
   * @why - User reviews role, setting, context before entering session; stores preview for theming
   * @props - backendUrl: HTTP backend (from Astro page); scenarios: preset metadata for instant load
   */
  import { onDestroy } from 'svelte';
  import { createWebHaptics } from 'web-haptics/svelte';
  import SessionPreviewBody from './SessionPreviewBody.svelte';
  import type { PreviewData } from '../stores/liveSession';
  import { $previewData as previewData, $characterName as characterName } from '../stores/liveSession';

  interface ScenarioPreset {
    topic: string;
    userRole: string;
    characterName: string;
    historicalSetting: string;
    year: string;
    context: string;
    colorPalette: string[];
  }

  interface Scenario {
    id: string;
    preset: ScenarioPreset;
  }

  interface Props {
    backendUrl: string;
    scenarios: Scenario[];
  }

  let { backendUrl, scenarios }: Props = $props();

  const haptic = createWebHaptics();
  onDestroy(() => haptic.destroy());

  // ─── Overlay state ─────────────────────────────────────────────────────────

  let isOpen = $state(false);
  let isLoading = $state(false);
  let loadError = $state('');
  let previewTopic = $state('');
  let previewScenarioId = $state<string | undefined>(undefined);
  let preview = $state<PreviewData | null>(null);
  let isEditing = $state(false);
  let editTopic = $state('');
  let editNotes = $state('');
  let micEnabled = $state(true);
  let camEnabled = $state(true);

  // ─── Event listeners ───────────────────────────────────────────────────────

  $effect(() => {
    function onTopicSubmit(e: Event) {
      const detail = (e as CustomEvent<{ topic: string }>).detail;
      openPreview(detail.topic);
    }

    function onScenarioSelect(e: Event) {
      const detail = (e as CustomEvent<{ scenarioId: string }>).detail;
      const scenario = scenarios.find(s => s.id === detail.scenarioId);
      if (scenario) openPreviewFromPreset(scenario);
    }

    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) close();
    }

    window.addEventListener('past-live:topic-submit', onTopicSubmit);
    window.addEventListener('past-live:scenario-select', onScenarioSelect);
    window.addEventListener('keydown', onKeydown);

    return () => {
      window.removeEventListener('past-live:topic-submit', onTopicSubmit);
      window.removeEventListener('past-live:scenario-select', onScenarioSelect);
      window.removeEventListener('keydown', onKeydown);
    };
  });

  // ─── Open / close ─────────────────────────────────────────────────────────

  function close() {
    isOpen = false;
    isLoading = false;
    loadError = '';
    preview = null;
    isEditing = false;
    editTopic = '';
    editNotes = '';
    previewScenarioId = undefined;
    previewTopic = '';
  }

  async function openPreview(topic: string) {
    previewTopic = topic;
    previewScenarioId = undefined;
    isOpen = true;
    isLoading = true;
    loadError = '';
    preview = null;
    await fetchPreview(topic);
  }

  function openPreviewFromPreset(scenario: Scenario) {
    previewScenarioId = scenario.id;
    previewTopic = scenario.preset.topic;
    isOpen = true;
    isLoading = false;
    loadError = '';
    preview = { ...scenario.preset, sceneImage: undefined, avatar: undefined };
  }

  // ─── Fetch preview ─────────────────────────────────────────────────────────

  async function fetchPreview(topic: string, notes?: string) {
    isLoading = true;
    loadError = '';
    try {
      const body: Record<string, string> = { topic };
      if (notes?.trim()) body['notes'] = notes.trim();

      const res = await fetch(`${backendUrl}/session-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`status ${res.status}`);

      const data = await res.json() as {
        topic?: string; userRole?: string; characterName?: string;
        historicalSetting?: string; year?: string; context?: string;
        colorPalette?: string[]; sceneImage?: string; avatar?: string; error?: string;
      };

      if (data.error) throw new Error(data.error);
      if (!data.userRole || !data.characterName) throw new Error('incomplete preview data');

      preview = {
        topic: data.topic ?? topic,
        userRole: data.userRole,
        characterName: data.characterName,
        historicalSetting: data.historicalSetting ?? '',
        year: data.year ?? '',
        context: data.context ?? '',
        colorPalette: data.colorPalette ?? [],
        sceneImage: data.sceneImage,
        avatar: data.avatar,
      };
    } catch (err) {
      loadError = err instanceof Error ? err.message : 'preview failed';
      // Try preset fallback
      const fallback = findFallbackScenario(topic);
      if (fallback) {
        preview = { ...fallback.preset, sceneImage: undefined, avatar: undefined };
        loadError = '';
      }
    } finally {
      isLoading = false;
    }
  }

  function findFallbackScenario(topic: string): Scenario | undefined {
    const lower = topic.toLowerCase();
    if (lower.includes('constanti') || lower.includes('ottoman') || lower.includes('byzantine'))
      return scenarios.find(s => s.id === 'constantinople-1453');
    if (lower.includes('moon') || lower.includes('apollo') || lower.includes('nasa'))
      return scenarios.find(s => s.id === 'moon-landing-1969');
    if (lower.includes('mongol') || lower.includes('khan') || lower.includes('genghis'))
      return scenarios.find(s => s.id === 'mongol-empire-1206');
    return undefined;
  }

  // ─── Edit / regenerate ─────────────────────────────────────────────────────

  function startEdit() { isEditing = true; editTopic = previewTopic; editNotes = ''; }
  function cancelEdit() { isEditing = false; editTopic = ''; editNotes = ''; }

  async function regenerate() {
    if (!editTopic.trim()) return;
    haptic.trigger('light');
    isEditing = false;
    previewTopic = editTopic.trim();
    previewScenarioId = undefined;
    await fetchPreview(previewTopic, editNotes);
  }

  async function retry() {
    haptic.trigger('light');
    loadError = '';
    if (previewScenarioId) {
      const s = scenarios.find(sc => sc.id === previewScenarioId);
      if (s) { openPreviewFromPreset(s); return; }
    }
    await fetchPreview(previewTopic);
  }

  // ─── Enter session ─────────────────────────────────────────────────────────

  function enterSession() {
    if (!preview) return;
    haptic.trigger('medium');
    previewData.set(preview);
    characterName.set(preview.characterName);
    try { sessionStorage.setItem('past-live:preview', JSON.stringify(preview)); } catch { /* noop */ }

    const params = new URLSearchParams();
    if (previewScenarioId) { params.set('scenario', previewScenarioId); }
    else { params.set('topic', previewTopic); }
    if (micEnabled) params.set('mic', '1');
    if (camEnabled) params.set('cam', '1');

    window.location.href = `/session?${params.toString()}`;
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-6"
    role="dialog"
    aria-modal="true"
    aria-label="Session briefing preview"
  >
    <!-- Panel -->
    <div class="w-full max-w-sm bg-surface border border-border rounded-sm max-h-[90dvh] overflow-y-auto">

      <!-- Header -->
      <div class="relative pl-[60px] pr-4 pt-5 pb-4 border-b border-border/50">
        <div class="absolute top-0 left-[48px] bottom-0 w-px bg-accent/8" aria-hidden="true"></div>
        <div class="font-mono text-[10px] text-accent tracking-[0.15em] uppercase">
          &gt; session briefing
        </div>
        <button
          type="button"
          onclick={close}
          class="absolute top-4 right-4 min-w-8 min-h-8 w-8 h-8 flex items-center justify-center text-foreground/30 hover:text-foreground/60 transition-colors rounded-sm"
          aria-label="Close session briefing"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- Body (split component) -->
      <div class="p-5 space-y-5">
        <SessionPreviewBody
          {isLoading}
          {loadError}
          {preview}
          {isEditing}
          {editTopic}
          {editNotes}
          {micEnabled}
          {camEnabled}
          onretry={retry}
          onstartEdit={startEdit}
          oncancelEdit={cancelEdit}
          onregenerate={regenerate}
          onenterSession={enterSession}
          oneditTopicChange={(v) => { editTopic = v; }}
          oneditNotesChange={(v) => { editNotes = v; }}
          onmicChange={(v) => { micEnabled = v; }}
          oncamChange={(v) => { camEnabled = v; }}
        />
      </div>

    </div>
  </div>
{/if}
