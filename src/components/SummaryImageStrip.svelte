<script lang="ts">
  /**
   * @what - Horizontal scroll strip of scene images for the summary infographic
   * @why - Visualizes the call timeline: each show_scene call becomes a scrollable card
   *        with an era-specific image and scene title below it
   * @props - images: array of { title, image } where image is base64 PNG
   * @note - Parent is responsible for conditional rendering (only show when images.length > 0)
   */

  let {
    images,
  }: {
    images: { title: string; image: string }[];
  } = $props();
</script>

<!--
  Horizontal snap-scroll gallery.
  snap-x mandatory gives iOS-style card snapping on mobile.
  scrollbar-hidden via CSS.
  280px card width gives 1.2 cards visible at 375px — communicates scrollability.
-->
<section
  class="image-strip overflow-x-auto flex gap-3 px-5 snap-x snap-mandatory pb-1"
  aria-label="Scene gallery"
>
  {#each images as scene, i (scene.title + i)}
    <figure
      class="snap-start flex-shrink-0 w-[280px]"
      aria-label="Scene: {scene.title}"
    >
      <img
        src="data:image/png;base64,{scene.image}"
        alt={scene.title}
        class="w-full aspect-video rounded-sm object-cover"
        style="border: 1px solid color-mix(in oklch, var(--color-foreground) 8%, transparent);"
        width="280"
        height="158"
        loading="lazy"
      />
      <figcaption
        class="font-mono text-[10px] uppercase tracking-widest mt-1.5 truncate"
        style="color: var(--color-foreground); opacity: 0.35;"
      >
        {scene.title}
      </figcaption>
    </figure>
  {/each}
</section>

<style>
  .image-strip {
    scrollbar-width: none;
  }
  .image-strip::-webkit-scrollbar {
    display: none;
  }
</style>
