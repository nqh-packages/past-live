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
    <div class="font-mono text-[10px] text-accent/60 tracking-[0.1em]">
      &gt; transmission failed
    </div>
    <p class="font-mono text-[11px] text-foreground/30">{loadError}</p>
    <button
      type="button"
      onclick={onretry}
      class="font-mono text-[11px] text-accent/70 tracking-[0.1em] uppercase border border-accent/20 px-5 py-2.5 rounded-sm hover:border-accent/40 hover:text-accent transition-colors min-h-11"
      aria-label="Retry generating session preview"
    >
      [ retry ]
    </button>
  </div>

{:else if preview}
  <!-- Scene image -->
  {#if preview.sceneImage}
    <div class="relative rounded-sm overflow-hidden">
      <img
        src={`data:image/jpeg;base64,${preview.sceneImage}`}
        alt="Scene: {preview.historicalSetting}, {preview.year}"
        class="w-full h-40 object-cover"
        width="400"
        height="160"
      />
      {#if preview.avatar}
        <div class="absolute bottom-2 left-2 w-10 h-10 rounded-full overflow-hidden border border-border bg-surface">
          <img
            src={`data:image/jpeg;base64,${preview.avatar}`}
            alt="{preview.characterName} avatar"
            class="w-full h-full object-cover"
            width="40"
            height="40"
          />
        </div>
      {/if}
    </div>
  {:else}
    <!-- Fallback: avatar alone or placeholder -->
    <div class="flex items-center gap-3">
      {#if preview.avatar}
        <div class="w-16 h-16 rounded-sm overflow-hidden border border-border flex-shrink-0">
          <img
            src={`data:image/jpeg;base64,${preview.avatar}`}
            alt="{preview.characterName} avatar"
            class="w-full h-full object-cover"
            width="64"
            height="64"
          />
        </div>
      {:else}
        <div class="w-16 h-16 rounded-sm border border-border bg-background flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <span class="font-mono text-[8px] text-foreground/20">[ portrait ]</span>
        </div>
      {/if}
      <div class="font-mono text-[10px] text-foreground/30">
        <div class="text-accent/60">&gt; {preview.characterName}</div>
        <div>{preview.historicalSetting}</div>
        <div>&gt; {preview.year}</div>
      </div>
    </div>
  {/if}

  <!-- Edit mode -->
  {#if isEditing}
    <div class="space-y-3 border border-border/50 rounded-sm p-4">
      <div class="font-mono text-[10px] text-accent/60 tracking-[0.1em] uppercase mb-2">
        &gt; modify briefing
      </div>
      <div>
        <label for="edit-topic" class="font-mono text-[10px] text-foreground/40 mb-1 block">
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
        <label for="edit-notes" class="font-mono text-[10px] text-foreground/40 mb-1 block">
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
          class="flex-1 min-h-10 font-mono text-[11px] tracking-[0.1em] uppercase border border-border text-foreground/30 hover:text-foreground/50 rounded-sm transition-colors"
          aria-label="Cancel editing"
        >
          [ cancel ]
        </button>
        <button
          type="button"
          onclick={onregenerate}
          disabled={!editTopic.trim()}
          class="flex-1 min-h-10 font-mono text-[11px] tracking-[0.1em] uppercase border rounded-sm transition-colors
            {editTopic.trim() ? 'border-accent/50 text-accent/80 hover:border-accent hover:text-accent' : 'border-border/30 text-foreground/20 cursor-not-allowed'}"
          aria-label="Regenerate session preview with updated topic"
        >
          [ regenerate ]
        </button>
      </div>
    </div>

  {:else}
    <!-- Preview fields — text styled with story palette when available -->
    <div class="space-y-2 font-mono text-[11px]">
      <div class="flex gap-2">
        <span
          class="text-foreground/25 flex-shrink-0"
          style={sMuted ? `color: ${sMuted}` : ''}
        >you are:</span>
        <span
          class="text-foreground/70"
          style={sFg ? `color: ${sFg}` : ''}
        >{preview.userRole}</span>
      </div>
      <div class="mt-3">
        <div
          class="text-foreground/25 mb-1"
          style={sMuted ? `color: ${sMuted}` : ''}
        >stakes:</div>
        <p
          class="text-foreground/60 leading-relaxed"
          style={sFg ? `color: ${sFg}` : ''}
        >{preview.context}</p>
      </div>
    </div>

    <!-- Mic checkbox -->
    <div role="group" aria-label="Call options">
      <label class="flex items-center gap-3 cursor-pointer min-h-11 py-1">
        <input
          type="checkbox"
          checked={micEnabled}
          onchange={(e) => onmicChange((e.target as HTMLInputElement).checked)}
          class="w-4 h-4 accent-[color:var(--color-accent)] cursor-pointer"
          aria-label="Auto-activate microphone when call connects"
        />
        <span class="font-mono text-[11px] text-foreground/60 select-none" style={sFg ? `color: ${sFg}; opacity: 0.7` : ''}>enable microphone</span>
      </label>
    </div>

    <!-- Action buttons -->
    <div class="flex gap-3 pt-2">
      <button
        type="button"
        onclick={onstartEdit}
        class="min-h-11 font-mono text-[11px] tracking-[0.1em] uppercase border px-4 py-2.5 rounded-sm transition-colors"
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
        class="flex-1 min-h-11 font-mono text-[11px] tracking-[0.12em] uppercase border px-4 py-2.5 rounded-sm transition-colors"
        style={sAccent && sBg
          ? `background: ${sAccent}; color: ${sBg}; border-color: ${sAccent}`
          : 'border-color: var(--color-accent); color: var(--color-accent)'}
        aria-label="Call this historical figure now"
      >
        [ call ]
      </button>
    </div>
  {/if}
{/if}
