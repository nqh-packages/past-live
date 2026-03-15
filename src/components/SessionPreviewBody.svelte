<script lang="ts">
  /**
   * @what - Inner body of the session preview panel: images, fields, edit form, checkboxes, actions
   * @why - Split from SessionPreview.svelte to stay within 350 LOC per file
   * @props - preview data, edit/action callbacks, checkbox bindings
   */
  import FunLoadingText from './FunLoadingText.svelte';
  import type { PreviewData } from '../stores/liveSession';

  interface Props {
    isLoading: boolean;
    loadError: string;
    preview: PreviewData | null;
    isEditing: boolean;
    editTopic: string;
    editNotes: string;
    micEnabled: boolean;
    /** True while the storyScript background job is still generating — disables [CALL]. */
    storyScriptPending: boolean;
    onretry: () => void;
    onstartEdit: () => void;
    oncancelEdit: () => void;
    onregenerate: () => void;
    onenterSession: () => void;
    oneditTopicChange: (val: string) => void;
    oneditNotesChange: (val: string) => void;
    onmicChange: (val: boolean) => void;
  }

  let {
    isLoading,
    loadError,
    preview,
    isEditing,
    editTopic,
    editNotes,
    micEnabled,
    storyScriptPending,
    onretry,
    onstartEdit,
    oncancelEdit,
    onregenerate,
    onenterSession,
    oneditTopicChange,
    oneditNotesChange,
    onmicChange,
  }: Props = $props();

  // ─── OKLCH validation ──────────────────────────────────────────────────────

  const OKLCH_REGEX = /^oklch\(\s*[\d.]+%?\s+[\d.]+\s+[\d.]+\s*\)$/;

  function safeOklch(val: string): string {
    return OKLCH_REGEX.test(val.trim()) ? val : '';
  }

  const paletteColors = $derived(preview?.colorPalette?.slice(0, 5) ?? []);

  /** True when a full 5-color story palette is available and all values are valid OKLCH. */
  const hasStoryPalette = $derived(
    paletteColors.length >= 5 && paletteColors.every(c => safeOklch(c)),
  );

  // Semantic color aliases — derived inline style values (empty string = no inline style applied)
  const sBg = $derived(hasStoryPalette ? safeOklch(paletteColors[0]) : '');
  const sAccent = $derived(hasStoryPalette ? safeOklch(paletteColors[2]) : '');
  const sFg = $derived(hasStoryPalette ? safeOklch(paletteColors[3]) : '');
  const sMuted = $derived(hasStoryPalette ? safeOklch(paletteColors[4]) : '');
</script>

{#if isLoading}
  <!-- Loading state -->
  <div class="flex flex-col items-center gap-4 py-8">
    <div class="w-8 h-8 border border-accent/30 border-t-accent rounded-full animate-spin" role="status" aria-label="Loading preview"></div>
    <FunLoadingText />
  </div>

{:else if loadError && !preview}
  <!-- Full error state -->
  <div class="text-center py-6 space-y-4">
    <div class="font-mono text-xs text-accent/60 tracking-[0.1em]">
      &gt; call failed
    </div>
    <p class="font-mono text-sm text-foreground/30">{loadError}</p>
    <button
      type="button"
      onclick={onretry}
      class="font-mono text-sm text-accent/70 tracking-[0.1em] uppercase border border-accent/20 px-5 py-2.5 rounded-sm hover:border-accent/40 hover:text-accent transition-colors min-h-11"
      aria-label="Retry generating session preview"
    >
      [ retry ]
    </button>
  </div>

{:else if preview}
  <!-- Character identity: avatar + name + era -->
  <div class="flex items-center gap-4">
    <!-- Avatar — large round portrait -->
    {#if preview.avatar || preview.avatarUrl}
      <div class="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden border-2 border-accent bg-surface">
        <img
          src={preview.avatar ? `data:image/jpeg;base64,${preview.avatar}` : preview.avatarUrl}
          alt="{preview.characterName} portrait"
          class="w-full h-full object-cover"
          width="80"
          height="80"
        />
      </div>
    {:else}
      <div class="flex-shrink-0 w-20 h-20 rounded-full border-2 border-border bg-background flex items-center justify-center" aria-hidden="true">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-foreground/15">
          <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      </div>
    {/if}
    <!-- Name + setting -->
    <div>
      <div
        class="font-mono text-xs tracking-[0.12em] uppercase"
        style={sAccent ? `color: ${sAccent}` : 'color: var(--color-accent)'}
      >&gt; {preview.characterName}</div>
      <div class="font-mono text-sm text-foreground/40 mt-0.5">{preview.historicalSetting}</div>
      <div class="font-mono text-sm text-foreground/40">&gt; {preview.year}</div>
    </div>
  </div>

  <!-- Scene image (if available) -->
  {#if preview.sceneImage}
    <div class="rounded-sm overflow-hidden">
      <img
        src={`data:image/jpeg;base64,${preview.sceneImage}`}
        alt="Scene: {preview.historicalSetting}, {preview.year}"
        class="w-full h-40 object-cover"
        width="400"
        height="160"
      />
    </div>
  {:else if preview.sceneUrl}
    <div class="rounded-sm overflow-hidden">
      <img
        src={preview.sceneUrl}
        alt="Scene: {preview.historicalSetting}, {preview.year}"
        class="w-full h-full object-cover"
        width="400"
        height="160"
        decoding="async"
      />
    </div>
  {/if}

  <!-- Edit mode -->
  {#if isEditing}
    <div class="space-y-3 border border-border/50 rounded-sm p-4">
      <div class="font-mono text-xs text-accent/60 tracking-[0.1em] uppercase mb-2">
        &gt; edit details
      </div>
      <div>
        <label for="edit-topic" class="font-mono text-xs text-foreground/40 mb-1 block">
          &gt; topic
        </label>
        <input
          id="edit-topic"
          type="text"
          value={editTopic}
          oninput={(e) => oneditTopicChange((e.target as HTMLInputElement).value)}
          class="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-xs text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-accent/30 transition-colors"
          placeholder="modify your topic..."
          aria-label="Edit topic"
        />
      </div>
      <div>
        <label for="edit-notes" class="font-mono text-xs text-foreground/40 mb-1 block">
          &gt; notes (optional)
        </label>
        <input
          id="edit-notes"
          type="text"
          value={editNotes}
          oninput={(e) => oneditNotesChange((e.target as HTMLInputElement).value)}
          class="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-xs text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-accent/30 transition-colors"
          placeholder="any specific angle or focus..."
          aria-label="Add notes about the topic"
        />
      </div>
      <div class="flex gap-2 pt-1">
        <button
          type="button"
          onclick={oncancelEdit}
          class="flex-1 min-h-10 font-mono text-sm tracking-[0.1em] uppercase border border-border text-foreground/30 hover:text-foreground/50 rounded-sm transition-colors"
          aria-label="Cancel editing"
        >
          [ cancel ]
        </button>
        <button
          type="button"
          onclick={onregenerate}
          disabled={!editTopic.trim()}
          class="flex-1 min-h-10 font-mono text-sm tracking-[0.1em] uppercase border rounded-sm transition-colors
            {editTopic.trim() ? 'border-accent/50 text-accent/80 hover:border-accent hover:text-accent' : 'border-border/30 text-foreground/20 cursor-not-allowed'}"
          aria-label="Regenerate session preview with updated topic"
        >
          [ regenerate ]
        </button>
      </div>
    </div>

  {:else}
    <!-- Context -->
    <p
      class="font-mono text-sm text-foreground/60 leading-relaxed"
      style={sFg ? `color: ${sFg}; opacity: 0.8` : ''}
    >{preview.context}</p>

    <!-- Mic checkbox — custom visible checkbox for dark backgrounds -->
    <div role="group" aria-label="Call options">
      <label class="flex items-center gap-3 cursor-pointer min-h-11 py-1">
        <span
          class="flex-shrink-0 w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-colors
            {micEnabled ? 'border-accent bg-accent' : 'border-foreground/40 bg-transparent'}"
          aria-hidden="true"
        >
          {#if micEnabled}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-background">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          {/if}
        </span>
        <input
          type="checkbox"
          checked={micEnabled}
          onchange={(e) => onmicChange((e.target as HTMLInputElement).checked)}
          class="sr-only"
          aria-label="Use microphone on call"
        />
        <span class="font-mono text-sm text-foreground/60 select-none" style={sFg ? `color: ${sFg}; opacity: 0.7` : ''}>use microphone on call</span>
      </label>
    </div>

    <!-- AI disclaimer -->
    <p class="font-mono text-2xs leading-relaxed text-foreground/30 select-none" style={sMuted ? `color: ${sMuted}` : ''}>
      This is an AI character powered by Google Gemini. Historical statements
      may contain inaccuracies. Always verify with your teacher or textbook.
    </p>

    <!-- Preparing indicator — only shown while storyScript background job is pending -->
    {#if storyScriptPending}
      <p class="font-mono text-2xs text-foreground/25 tracking-[0.08em] select-none" style={sMuted ? `color: ${sMuted}` : ''} aria-live="polite">
        &gt; preparing your call...
      </p>
    {/if}

    <!-- Action buttons -->
    <div class="flex gap-3 pt-2">
      <button
        type="button"
        onclick={onstartEdit}
        class="min-h-11 font-mono text-sm tracking-[0.1em] uppercase border px-4 py-2.5 rounded-sm transition-colors"
        style={sAccent
          ? `border-color: ${sAccent}; color: ${sAccent}; opacity: 0.6`
          : 'border-color: color-mix(in oklch, var(--color-border) 50%, transparent); color: color-mix(in oklch, var(--color-foreground) 40%, transparent)'}
        aria-label="Edit topic or add notes"
      >
        [ edit ]
      </button>
      <button
        type="button"
        onclick={onenterSession}
        disabled={storyScriptPending}
        class="flex-1 min-h-11 font-mono text-sm tracking-[0.12em] uppercase border px-4 py-2.5 rounded-sm transition-colors
          {storyScriptPending ? 'opacity-50 cursor-wait' : ''}"
        style={sAccent && sBg && !storyScriptPending
          ? `background: ${sAccent}; color: ${sBg}; border-color: ${sAccent}`
          : sAccent && !storyScriptPending
            ? `border-color: ${sAccent}; color: ${sAccent}`
            : 'border-color: var(--color-accent); color: var(--color-accent)'}
        aria-label={storyScriptPending ? 'Preparing call — please wait' : 'Call this historical figure now'}
        aria-busy={storyScriptPending}
      >
        {storyScriptPending ? '[ preparing... ]' : '[ call ]'}
      </button>
    </div>
  {/if}
{/if}
