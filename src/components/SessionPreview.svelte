<script lang="ts">
  /**
   * @what - Session preview overlay: listens for topic/scenario events, fetches preview, shows panel
   * @why - User reviews role, setting, context before entering session; stores preview for theming
   * @props - backendUrl: HTTP backend (from Astro page); scenarios: preset metadata for instant load
   */
  import { onDestroy } from 'svelte';
  import { createWebHaptics } from 'web-haptics/svelte';
  import SessionPreviewBody from './SessionPreviewBody.svelte';
  import type { PreviewData, StoryScriptData } from '../stores/liveSession';
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
    avatarUrl?: string;
    sceneUrl?: string;
    preset: ScenarioPreset;
  }

  interface Props {
    backendUrl: string;
    scenarios: Scenario[];
  }

  let { backendUrl, scenarios }: Props = $props();

  const haptic = createWebHaptics();
  onDestroy(() => {
    haptic.destroy();
    stopStoryScriptPoll();
  });

  // ─── Overlay state ─────────────────────────────────────────────────────────

  interface BlockedAlternative { title: string; description: string }

  let isOpen = $state(false);
  let isLoading = $state(false);
  let loadError = $state('');
  let previewTopic = $state('');
  let previewScenarioId = $state<string | undefined>(undefined);
  let preview = $state<PreviewData | null>(null);
  let isEditing = $state(false);
  let editTopic = $state('');
  let editNotes = $state('');
  let micEnabled = $state(false);
  let blockedAlternatives = $state<BlockedAlternative[]>([]);
  /** True while storyScript background generation is in progress. */
  let storyScriptPending = $state(false);
  /** The previewId returned by the backend — used to poll for storyScript. */
  let currentPreviewId = $state<string | undefined>(undefined);
  let storyScriptPollTimer: ReturnType<typeof setInterval> | undefined;

  // ─── Focus trap ────────────────────────────────────────────────────────────

  let previousFocus: HTMLElement | null = null;

  $effect(() => {
    if (isOpen) {
      previousFocus = document.activeElement as HTMLElement;
      const main = document.querySelector('main');
      if (main) main.setAttribute('inert', '');
      requestAnimationFrame(() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) focusable[0].focus();
      });
    } else {
      const main = document.querySelector('main');
      if (main) main.removeAttribute('inert');
      if (previousFocus) previousFocus.focus();
    }
  });

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

    // Camera path: /extract-topic already returned figures — show figure picker inline.
    // The figures come from the camera flow; clicking one calls openPreview with the specific name.
    function onFiguresFromImage(e: Event) {
      const detail = (e as CustomEvent<{ topic: string; figures: { name: string; era: string; role: string; teaser: string; relevance_to_topic: string }[] }>).detail;
      // Open the preview overlay immediately with the first figure as a starting point.
      // The camera flow still returns 3 figures — pick the first automatically or let the
      // caller dispatch a topic-submit event instead. For now, open the overlay with the topic.
      openPreview(detail.topic);
    }

    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) close();
      if (e.key === 'Tab' && isOpen) {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return;
        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener('past-live:topic-submit', onTopicSubmit);
    window.addEventListener('past-live:scenario-select', onScenarioSelect);
    window.addEventListener('past-live:figures-from-image', onFiguresFromImage);
    window.addEventListener('keydown', onKeydown);

    return () => {
      window.removeEventListener('past-live:topic-submit', onTopicSubmit);
      window.removeEventListener('past-live:scenario-select', onScenarioSelect);
      window.removeEventListener('past-live:figures-from-image', onFiguresFromImage);
      window.removeEventListener('keydown', onKeydown);
    };
    // Note: past-live:figures-from-image is kept for the camera flow.
    // It now calls openPreview directly since Flash always returns "ready".
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
    blockedAlternatives = [];
    stopStoryScriptPoll();
    storyScriptPending = false;
    currentPreviewId = undefined;
  }

  async function openPreview(topic: string) {
    previewTopic = topic;
    previewScenarioId = undefined;
    isOpen = true;
    // Scroll to top so fixed overlay is visible on mobile Safari
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' });
    isLoading = true;
    loadError = '';
    preview = null;
    blockedAlternatives = [];
    await fetchPreview(topic);
  }

  function openPreviewFromPreset(scenario: Scenario) {
    previewScenarioId = scenario.id;
    previewTopic = scenario.preset.topic;
    isOpen = true;
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' });
    isLoading = false;
    loadError = '';
    preview = {
      ...scenario.preset,
      sceneImage: undefined,
      avatar: undefined,
      avatarUrl: scenario.avatarUrl,
      sceneUrl: scenario.sceneUrl,
    };
  }

  // ─── StoryScript polling ───────────────────────────────────────────────────

  const POLL_INTERVAL_MS = 2000;
  const POLL_MAX_ATTEMPTS = 15; // 30s max poll window
  let pollAttempts = 0;

  function stopStoryScriptPoll() {
    if (storyScriptPollTimer !== undefined) {
      clearInterval(storyScriptPollTimer);
      storyScriptPollTimer = undefined;
    }
    pollAttempts = 0;
  }

  function startStoryScriptPoll(previewId: string) {
    stopStoryScriptPoll();
    storyScriptPending = true;

    storyScriptPollTimer = setInterval(async () => {
      pollAttempts += 1;
      if (pollAttempts > POLL_MAX_ATTEMPTS) {
        // Give up — call can still proceed without storyScript (server fallback)
        stopStoryScriptPoll();
        storyScriptPending = false;
        return;
      }

      try {
        const res = await fetch(`${backendUrl}/story-script/${previewId}`);
        if (!res.ok) {
          stopStoryScriptPoll();
          storyScriptPending = false;
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await res.json() as Record<string, any>;
        if (data['status'] === 'ready' && data['storyScript']) {
          stopStoryScriptPoll();
          storyScriptPending = false;
          if (preview) {
            preview = { ...preview, storyScript: data['storyScript'] as StoryScriptData };
          }
        } else if (data['status'] === 'failed' || data['status'] === 'not_found') {
          // storyScript unavailable — unblock the call button anyway
          stopStoryScriptPoll();
          storyScriptPending = false;
        }
        // 'pending' — keep polling
      } catch {
        // Network error during poll — stop and unblock
        stopStoryScriptPoll();
        storyScriptPending = false;
      }
    }, POLL_INTERVAL_MS);
  }

  // ─── Fetch preview ─────────────────────────────────────────────────────────

  async function fetchPreview(topic: string, notes?: string) {
    isLoading = true;
    loadError = '';
    blockedAlternatives = [];
    stopStoryScriptPoll();
    storyScriptPending = false;
    currentPreviewId = undefined;

    try {
      const body: Record<string, string> = { topic };
      if (notes?.trim()) body['notes'] = notes.trim();

      const res = await fetch(`${backendUrl}/session-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`status ${res.status}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await res.json() as Record<string, any>;

      if (data['error']) throw new Error(data['error'] as string);

      // Handle blocked response — blocked caller, offer alternatives
      if (data['type'] === 'blocked' && Array.isArray(data['alternatives'])) {
        blockedAlternatives = data['alternatives'] as BlockedAlternative[];
        isOpen = false;
        return;
      }

      // Handle ready response — phase 1: metadata + images (storyScript may still be pending)
      const meta = data['metadata'] as {
        topic?: string; userRole?: string; characterName?: string;
        historicalSetting?: string; year?: string; context?: string;
        colorPalette?: string[];
      } | undefined;
      if (!meta?.userRole || !meta?.characterName) throw new Error('incomplete preview data');

      preview = {
        topic: meta.topic ?? topic,
        userRole: meta.userRole,
        characterName: meta.characterName,
        historicalSetting: meta.historicalSetting ?? '',
        year: meta.year ?? '',
        context: meta.context ?? '',
        colorPalette: meta.colorPalette ?? [],
        sceneImage: (data['sceneImage'] as string) ?? undefined,
        avatar: (data['avatarImage'] as string) ?? undefined,
        storyScript: (data['storyScript'] as StoryScriptData) ?? undefined,
        previewId: (data['previewId'] as string) ?? undefined,
      };

      // Start polling if storyScript is still being generated
      if (data['storyScriptPending'] === true && typeof data['previewId'] === 'string') {
        currentPreviewId = data['previewId'] as string;
        startStoryScriptPoll(currentPreviewId);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'preview failed';
      loadError = raw.includes('fetch') || raw.includes('network') || raw.includes('ECONNREFUSED')
        ? 'the line went dead — try again'
        : raw.includes('status')
          ? 'no signal — the past is not responding'
          : raw;
      // Try preset fallback
      const fallback = findFallbackScenario(topic);
      if (fallback) {
        preview = {
          ...fallback.preset,
          sceneImage: undefined,
          avatar: undefined,
          avatarUrl: fallback.avatarUrl,
          sceneUrl: fallback.sceneUrl,
        };
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

  function selectBlockedAlternative(alt: BlockedAlternative) {
    haptic.trigger('light');
    blockedAlternatives = [];
    openPreview(alt.title);
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

  // ─── Story palette (applied to panel when 5 valid OKLCH values present) ──────

  const OKLCH_RE = /^oklch\(\s*[\d.]+%?\s+[\d.]+\s+[\d.]+\s*\)$/;
  function safeOklch(val: string): string {
    return OKLCH_RE.test(val.trim()) ? val : '';
  }

  const panelPalette = $derived(preview?.colorPalette?.slice(0, 5) ?? []);
  const hasStoryPalette = $derived(panelPalette.length >= 5 && panelPalette.every(c => safeOklch(c)));
  const panelBg = $derived(hasStoryPalette ? safeOklch(panelPalette[1]) : '');
  const panelBorder = $derived(hasStoryPalette ? safeOklch(panelPalette[4]) : '');

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

    window.location.href = `/session?${params.toString()}`;
  }
</script>

<!-- Inline blocked: blocked caller → try calling a witness/resistor instead -->
{#if blockedAlternatives.length > 0}
  <div class="fixed inset-x-0 bottom-0 z-40 p-4 sm:p-6 pointer-events-none">
    <div class="max-w-sm lg:max-w-md mx-auto pointer-events-auto" role="alertdialog" aria-label="Call failed — this number is not in service">
      <div class="bg-surface border border-border rounded-sm p-5 space-y-4">
        <div class="font-mono text-xs text-accent tracking-[0.12em] uppercase">
          &gt; call failed
        </div>
        <p class="font-mono text-xs text-foreground/40 leading-relaxed">
          This number is not in service.
        </p>
        <p class="font-mono text-xs text-foreground/25 leading-relaxed">
          Try calling someone who was there:
        </p>
        <div class="flex flex-col gap-2">
          {#each blockedAlternatives as alt (alt.title)}
            <button
              type="button"
              onclick={() => selectBlockedAlternative(alt)}
              class="text-left border border-border rounded-sm px-4 py-3 hover:border-accent/30 hover:bg-accent/5 transition-colors"
              aria-label="Call {alt.title}"
            >
              <span class="font-mono text-sm text-foreground/70">&gt; {alt.title}</span>
              <br />
              <span class="font-mono text-xs text-foreground/30">{alt.description}</span>
            </button>
          {/each}
        </div>
        <button
          type="button"
          onclick={() => { blockedAlternatives = []; }}
          class="font-mono text-xs text-foreground/20 tracking-[0.1em] uppercase hover:text-foreground/40 transition-colors min-h-[44px] px-4 py-3"
          aria-label="Dismiss blocked message"
        >
          [ cancel ]
        </button>
      </div>
    </div>
  </div>
{/if}

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
    role="dialog"
    aria-modal="true"
    aria-label="Call preview"
  >
    <!-- Panel — inherits story palette when available -->
    <div
      class="w-full max-w-sm lg:max-w-md bg-surface border border-border rounded-sm max-h-[90dvh] overflow-y-auto"
      style={hasStoryPalette ? `background: ${panelBg}; border-color: ${panelBorder}` : ''}
    >

      <!-- Header -->
      <div
        class="relative pl-[60px] pr-4 pt-5 pb-4 border-b border-border/50"
        style={hasStoryPalette ? `border-color: ${panelBorder}` : ''}
      >
        <div class="absolute top-0 left-[48px] bottom-0 w-px bg-accent/8" aria-hidden="true"></div>
        <div
          class="font-mono text-xs tracking-[0.15em] uppercase"
          style={hasStoryPalette ? `color: ${safeOklch(panelPalette[2])}` : 'color: var(--color-accent)'}
        >
          &gt; incoming
        </div>
        <button
          type="button"
          onclick={close}
          class="absolute top-4 right-4 min-w-11 min-h-11 w-11 h-11 flex items-center justify-center text-foreground/30 hover:text-foreground/60 transition-colors rounded-sm"
          aria-label="Close call preview"
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
          {storyScriptPending}
          onretry={retry}
          onstartEdit={startEdit}
          oncancelEdit={cancelEdit}
          onregenerate={regenerate}
          onenterSession={enterSession}
          oneditTopicChange={(v) => { editTopic = v; }}
          oneditNotesChange={(v) => { editNotes = v; }}
          onmicChange={(v) => { micEnabled = v; }}
        />
      </div>

    </div>
  </div>
{/if}
