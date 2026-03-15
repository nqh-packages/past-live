<script lang="ts">
  /**
   * @what - Gentle sign-up nudge shown to anonymous users on the summary page
   * @why - Anonymous-first: anyone can call, but signed-in users get persistent call history
   */
  import { $authStore as auth } from '@clerk/astro/client';
</script>

{#if !$auth?.userId}
  <section class="mt-8 mb-4 text-center" aria-label="Save your calls">
    <p class="font-mono text-xs text-foreground/50 mb-3">
      &gt; want to save your calls?
    </p>
    <a
      href="/sign-up"
      class="inline-block border border-accent/20 text-accent/60 font-mono text-xs tracking-[0.12em] uppercase px-4 py-2 rounded-sm hover:bg-accent/5 transition-colors"
      aria-label="Create account to save call history"
    >
      create account
    </a>
  </section>
{/if}
