<!--
  @what - Scene image display component — shows AI-generated mid-call scene images
  @why - The show_scene tool generates images that must replace the portrait banner mid-call
  @behavior - Shows avatar portrait initially (from sessionStorage); fades in each new scene image as it arrives
-->
<script lang="ts">
  import { $sceneImage as sceneImage, $sceneImageLoading as sceneImageLoading, $sceneImageFailed as sceneImageFailed } from '../stores/liveSession';

  // Initial portrait/scene from sessionStorage — hydrated before Svelte mounts
  let initialSrc = $state<string | null>(null);
  let initialAlt = $state<string>('Character portrait');

  // Current scene image from the live store
  let scene = $derived($sceneImage);
  let loading = $derived($sceneImageLoading);
  let failed = $derived($sceneImageFailed);

  // Whether the live scene image has fully mounted and should be visible
  let sceneVisible = $state(false);

  // Track previous scene to reset fade when a new one arrives
  let prevSceneTitle = $state<string | null>(null);

  $effect(() => {
    // Hydrate initial portrait from sessionStorage on first mount
    try {
      const raw = sessionStorage.getItem('past-live:preview');
      if (!raw) return;
      const data = JSON.parse(raw) as Record<string, unknown>;
      if (typeof data['sceneImage'] === 'string') {
        initialSrc = `data:image/jpeg;base64,${data['sceneImage']}`;
        initialAlt = typeof data['historicalSetting'] === 'string'
          ? data['historicalSetting'] as string
          : 'Historical scene';
      } else if (typeof data['avatar'] === 'string') {
        initialSrc = `data:image/jpeg;base64,${data['avatar']}`;
        initialAlt = typeof data['characterName'] === 'string'
          ? `${data['characterName']} portrait`
          : 'Character portrait';
      }
    } catch {
      // Silently ignore — sessionStorage may be unavailable
    }
  });

  $effect(() => {
    // When a new scene image arrives, reset visibility and trigger fade-in
    if (scene && scene.title !== prevSceneTitle) {
      sceneVisible = false;
      prevSceneTitle = scene.title;
      // Micro-task delay lets the DOM repaint with opacity-0 before transition starts
      requestAnimationFrame(() => {
        sceneVisible = true;
      });
    }
  });
</script>

<div
  class="w-full aspect-video rounded-sm border border-border bg-surface overflow-hidden relative"
  aria-label={scene ? scene.title : initialAlt}
  role="img"
>
  {#if !scene && loading && !failed}
    <!-- Shimmer skeleton while scene image is generating (12-15s on free tier) -->
    <div class="w-full h-full bg-surface animate-pulse flex flex-col items-center justify-center gap-2" role="status">
      <div class="w-3/4 h-2 bg-foreground/5 rounded shimmer"></div>
      <div class="w-1/2 h-2 bg-foreground/5 rounded shimmer"></div>
      <p class="font-mono text-xs text-foreground/20 tracking-[0.08em] mt-2">
        &gt; generating: {loading}
      </p>
    </div>
  {:else if !scene && failed}
    <!-- Styled placeholder when image generation failed after retries -->
    <div class="w-full h-full bg-gradient-to-b from-surface to-background flex flex-col items-center justify-center gap-3 px-6">
      <div class="w-12 h-px bg-foreground/10"></div>
      <p class="font-mono text-xs text-foreground/25 tracking-[0.08em] text-center leading-relaxed max-w-[240px]">
        &gt; {failed}
      </p>
      <div class="w-12 h-px bg-foreground/10"></div>
    </div>
  {:else if !scene}
    <!-- Initial portrait from sessionStorage (or placeholder if none) -->
    {#if initialSrc}
      <img
        src={initialSrc}
        alt={initialAlt}
        class="w-full h-full object-cover object-top"
        width="768"
        height="432"
        decoding="async"
      />
    {:else}
      <span
        class="flex items-center justify-center h-full font-mono text-xs text-foreground/20 tracking-wider"
        aria-hidden="true"
      >[ portrait ]</span>
    {/if}
  {:else}
    <!-- Live scene image received from show_scene tool — fades in over 600ms with ease-out curve for emotional weight -->
    <img
      src={`data:image/png;base64,${scene.image}`}
      alt={scene.title}
      class="w-full h-full object-cover"
      style="transition: opacity 600ms cubic-bezier(0.4, 0, 0.2, 1);"
      class:opacity-0={!sceneVisible}
      class:opacity-100={sceneVisible}
      width="768"
      height="432"
      decoding="async"
    />
    <!-- Scene title caption — shown below the image overlay -->
    <div
      class="absolute bottom-0 left-0 right-0 px-3 py-2 bg-background/60"
      aria-live="polite"
    >
      <p class="font-mono text-xs text-foreground/30 tracking-[0.08em] truncate">
        &gt; {scene.title}
      </p>
    </div>
  {/if}
</div>
