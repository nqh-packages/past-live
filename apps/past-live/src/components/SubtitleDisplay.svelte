<script lang="ts">
  /**
   * @what - Live subtitle display with typing effect
   * @why - Shows agent speech as text for accessibility + immersion
   */
  import { onMount } from "svelte";

  const mockLines = [
    "The walls have held for a thousand years, advisor.",
    "But tonight, Mehmed's cannons speak a language the stones have never heard.",
    "What do you counsel?",
  ];

  let displayedText = $state("");
  let currentLine = $state(0);
  let currentChar = $state(0);

  onMount(() => {
    const interval = setInterval(() => {
      if (currentLine >= mockLines.length) {
        clearInterval(interval);
        return;
      }

      const line = mockLines[currentLine];
      if (currentChar < line.length) {
        displayedText += line[currentChar];
        currentChar++;
      } else {
        displayedText += "\n";
        currentLine++;
        currentChar = 0;
      }
    }, 45);

    return () => clearInterval(interval);
  });
</script>

<div class="min-h-[120px] border-l border-accent/10 pl-4">
  <pre class="font-mono text-sm text-foreground/70 whitespace-pre-wrap leading-relaxed">{displayedText}<span class="animate-pulse text-accent">|</span></pre>
</div>
