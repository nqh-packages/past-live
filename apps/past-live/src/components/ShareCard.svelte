<script lang="ts">
  /**
   * @what - Downloadable 9:16 share card for post-call summary
   * @why - Students want a shareable moment — the character's farewell as an
   *        Instagram-friendly image. Viral loop that spreads the app.
   * @props - none (reads from stores via loadSummaryArtifact and $previewData)
   */
  import { onMount, onDestroy } from 'svelte';
  import { createWebHaptics } from 'web-haptics/svelte';
  import { loadSummaryArtifact, formatDuration } from '../lib/liveSession/summary';
  import { $previewData as previewData } from '../stores/liveSession';
  import type { SummaryArtifact } from '../stores/liveSession';

  // ─── Haptics ────────────────────────────────────────────────────────────────

  const haptic = createWebHaptics();
  onDestroy(() => haptic.destroy());

  // ─── State ──────────────────────────────────────────────────────────────────

  let summary = $state<SummaryArtifact | null>(null);
  let downloading = $state(false);

  // ─── Derived color palette ────────────────────────────────────────────────

  const palette = $derived($previewData?.colorPalette ?? []);
  // Note: $previewData is Svelte's auto-subscription syntax for the `previewData` Nano Store atom

  // Index constants per CLAUDE.md Two Palette System:
  // 0 = background (8-15% lightness), 1 = surface, 2 = accent (55-75%),
  // 3 = foreground (85-95%), 4 = muted (30-45%)
  const cardBg = $derived(palette[0] ?? 'oklch(10% 0.02 250)');
  const cardAccent = $derived(palette[2] ?? 'oklch(65% 0.18 30)');
  const cardFg = $derived(palette[3] ?? 'oklch(90% 0.01 250)');
  const cardMuted = $derived(palette[4] ?? 'oklch(38% 0.04 250)');

  // ─── Derived display values ───────────────────────────────────────────────

  const characterName = $derived(summary?.role ?? 'UNKNOWN');
  const scenarioTitle = $derived(summary?.scenarioTitle ?? '');
  const farewell = $derived(
    summary?.characterMessage ?? 'You asked the right questions, stranger.'
  );
  const duration = $derived(summary ? formatDuration(summary.durationMs) : '00:00');
  const yourCall = $derived(summary?.yourCall ?? '');

  // ─── Card element ref (used only for fallback layout reference) ────────────

  let cardEl = $state<HTMLDivElement | null>(null);

  // ─── Mount: load summary ─────────────────────────────────────────────────

  onMount(() => {
    summary = loadSummaryArtifact();
  });

  // ─── Canvas download ─────────────────────────────────────────────────────

  /**
   * Draws the share card onto an offscreen Canvas and triggers a PNG download.
   * Uses pure Canvas 2D API — no html2canvas dependency needed.
   *
   * @pitfall - Canvas text rendering ignores CSS. Fonts must be loaded before
   *   calling fillText, otherwise the browser falls back to sans-serif.
   *   document.fonts.ready ensures fonts are available.
   */
  async function downloadCard() {
    if (!summary) return;

    downloading = true;

    try {
      // Wait for fonts to load so canvas text matches the UI
      await document.fonts.ready;

      // 9:16 portrait at 2x density for crisp rendering on high-DPI screens
      const W = 1080;
      const H = 1920;
      const SCALE = 1; // canvas pixel size matches target (1080x1920 is already large)
      const PAD = 80;

      const canvas = document.createElement('canvas');
      canvas.width = W * SCALE;
      canvas.height = H * SCALE;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D unavailable');

      ctx.scale(SCALE, SCALE);

      // ── Background ──────────────────────────────────────────────────────
      ctx.fillStyle = cardBg;
      ctx.fillRect(0, 0, W, H);

      // ── Top accent line ─────────────────────────────────────────────────
      ctx.fillStyle = cardAccent;
      ctx.fillRect(PAD, PAD, W - PAD * 2, 3);

      // ── Logo: "Past, Live" ──────────────────────────────────────────────
      ctx.fillStyle = cardAccent;
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Past, Live', PAD, PAD + 60);

      // ── Divider label ───────────────────────────────────────────────────
      ctx.fillStyle = cardMuted;
      ctx.font = '22px monospace';
      ctx.fillText('> call receipt', PAD, PAD + 110);

      // ── "You called" section ────────────────────────────────────────────
      const callY = 420;
      ctx.fillStyle = cardMuted;
      ctx.font = '26px monospace';
      ctx.fillText('> you called:', PAD, callY);

      ctx.fillStyle = cardFg;
      ctx.font = 'bold 72px monospace';
      ctx.fillText(characterName.toUpperCase(), PAD, callY + 90);

      if (scenarioTitle) {
        ctx.fillStyle = cardMuted;
        ctx.font = '28px monospace';
        wrapText(ctx, scenarioTitle, PAD, callY + 150, W - PAD * 2, 38);
      }

      // ── Accent divider ──────────────────────────────────────────────────
      const msgY = 750;
      ctx.fillStyle = cardAccent;
      ctx.fillRect(PAD, msgY - 20, 4, farewell.length > 80 ? 280 : 180);

      // ── Farewell message ────────────────────────────────────────────────
      ctx.fillStyle = cardFg;
      ctx.font = 'italic 38px serif';
      const msgLines = wrapTextLines(farewell, ctx, W - PAD * 2 - 30);
      let lineY = msgY + 10;
      for (let i = 0; i < msgLines.length; i++) {
        const prefix = i === 0 ? '"' : '';
        const suffix = i === msgLines.length - 1 ? '"' : '';
        ctx.fillText(`${prefix}${msgLines[i]}${suffix}`, PAD + 20, lineY);
        lineY += 52;
      }

      // ── Duration + outcome ──────────────────────────────────────────────
      const metaY = H - 380;
      ctx.fillStyle = cardAccent;
      ctx.fillRect(PAD, metaY - 10, W - PAD * 2, 1);

      ctx.fillStyle = cardMuted;
      ctx.font = '26px monospace';
      ctx.fillText(`> duration: ${duration}`, PAD, metaY + 40);

      if (yourCall) {
        const callTxt = yourCall.length > 60 ? yourCall.slice(0, 57) + '...' : yourCall;
        ctx.fillText(`> your call: ${callTxt}`, PAD, metaY + 90);
      }

      // ── Bottom brand line ───────────────────────────────────────────────
      ctx.fillStyle = cardAccent;
      ctx.fillRect(PAD, H - PAD - 3, W - PAD * 2, 3);

      ctx.fillStyle = cardMuted;
      ctx.font = '22px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('pastlive.site', W - PAD, H - PAD - 16);
      ctx.textAlign = 'left';

      // ── Trigger download ─────────────────────────────────────────────────
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            downloading = false;
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `past-live-${characterName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          haptic.trigger('success');
          downloading = false;
        },
        'image/png',
      );
    } catch {
      haptic.trigger('error');
      downloading = false;
    }
  }

  /**
   * Draws wrapped text on canvas, returning number of lines drawn.
   * Used for multi-line text that overflows the available width.
   */
  function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
  ): void {
    const lines = wrapTextLines(text, ctx, maxWidth);
    for (const line of lines) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
  }

  /**
   * Splits text into lines that fit within maxWidth, based on current canvas font.
   */
  function wrapTextLines(
    text: string,
    ctx: CanvasRenderingContext2D,
    maxWidth: number,
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }
</script>

{#if summary}
  <!-- ── Share Card (visual preview) ────────────────────────────────────────── -->
  <section
    class="mt-12 mb-6"
    aria-label="Share card preview"
  >
    <p
      class="font-mono text-[10px] text-accent tracking-[0.12em] uppercase mb-4"
      aria-hidden="true"
    >
      &gt; call receipt
    </p>

    <!-- 9:16 card rendered as styled div for visual preview -->
    <div
      bind:this={cardEl}
      role="img"
      aria-label="Share card for your call with {characterName}"
      class="relative w-full aspect-[9/16] max-w-[280px] mx-auto rounded-sm overflow-hidden border"
      style="background-color: {cardBg}; border-color: {cardAccent}20;"
    >
      <!-- Top accent line -->
      <div
        class="absolute top-4 left-4 right-4 h-px"
        style="background-color: {cardAccent};"
        aria-hidden="true"
      ></div>

      <!-- Content -->
      <div class="absolute inset-0 flex flex-col px-5 pt-8 pb-5">
        <!-- Logo -->
        <span
          class="font-mono text-xs font-bold tracking-[0.12em]"
          style="color: {cardAccent};"
        >
          Past, Live
        </span>

        <!-- Spacer -->
        <div class="flex-1 flex flex-col justify-center gap-4">
          <!-- Character section -->
          <div>
            <p
              class="font-mono text-[9px] mb-1"
              style="color: {cardMuted};"
            >
              &gt; you called:
            </p>
            <p
              class="font-mono text-base font-bold leading-tight"
              style="color: {cardFg};"
            >
              {characterName.toUpperCase()}
            </p>
            {#if scenarioTitle}
              <p
                class="font-mono text-[9px] mt-1 leading-relaxed"
                style="color: {cardMuted};"
              >
                {scenarioTitle}
              </p>
            {/if}
          </div>

          <!-- Accent bar + farewell -->
          <div
            class="pl-3 border-l-2"
            style="border-color: {cardAccent};"
          >
            <p
              class="font-serif text-[10px] italic leading-relaxed"
              style="color: {cardFg};"
            >
              "{farewell.length > 120 ? farewell.slice(0, 117) + '...' : farewell}"
            </p>
          </div>

          <!-- Meta -->
          <div class="mt-2">
            <p
              class="font-mono text-[8px]"
              style="color: {cardMuted};"
            >
              &gt; duration: {duration}
            </p>
            {#if yourCall}
              <p
                class="font-mono text-[8px] mt-1 leading-relaxed"
                style="color: {cardMuted};"
              >
                &gt; {yourCall.length > 50 ? yourCall.slice(0, 47) + '...' : yourCall}
              </p>
            {/if}
          </div>
        </div>

        <!-- Bottom -->
        <div>
          <div
            class="h-px w-full mb-2"
            style="background-color: {cardAccent}40;"
            aria-hidden="true"
          ></div>
          <p
            class="font-mono text-[7px] text-right"
            style="color: {cardMuted};"
          >
            pastlive.site
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- ── Download Button (outside the card) ──────────────────────────────────── -->
  <div class="flex justify-center mb-12">
    <button
      onclick={downloadCard}
      disabled={downloading}
      aria-label="Download share card as PNG image"
      class="border font-mono text-[11px] tracking-[0.12em] uppercase px-6 py-3 rounded-sm
             transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style="border-color: {cardAccent}50; color: {cardAccent};"
    >
      {#if downloading}
        &gt; generating...
      {:else}
        &gt; download call receipt
      {/if}
    </button>
  </div>
{/if}
