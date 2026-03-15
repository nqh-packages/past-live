<script lang="ts">
  /**
   * @what - Topic input with three modes: text, voice (Web Speech API), camera (Gemini Flash)
   * @why - Multimodal entry — student types, speaks, or snaps a photo to call the past
   * @props - backendUrl: passed from Astro page (VITE_* unavailable in islands)
   */
  import { onDestroy } from 'svelte';
  import { createWebHaptics } from 'web-haptics/svelte';
  import { isBlockedTopic } from '@/lib/content-blocklist';

  interface Props {
    backendUrl: string;
  }

  let { backendUrl }: Props = $props();

  const haptic = createWebHaptics();
  onDestroy(() => haptic.destroy());

  // ─── State ─────────────────────────────────────────────────────────────────

  let topic = $state('');
  type VoiceState = 'idle' | 'listening' | 'processing';
  let voiceState = $state<VoiceState>('idle');
  let cameraLoading = $state(false);
  let voiceError = $state('');
  let cameraError = $state('');
  /** Set when submit is blocked by the client-side blocklist. Clears on topic change. */
  let isBlocked = $state(false);

  // ─── Voice support detection — $derived so it's computed once on mount ─────

  const voiceSupported = $derived(
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),
  );

  // ─── Web Speech API ─────────────────────────────────────────────────────────

  let recognition: SpeechRecognition | null = null;

  function startVoice() {
    if (!voiceSupported || voiceState === 'listening') return;
    voiceError = '';

    const SR =
      (window as typeof window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ??
      (window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) return;

    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      voiceState = 'listening';
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      voiceState = 'processing';
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) {
        topic = transcript;
        isBlocked = false;
      }
      voiceState = 'idle';
    };

    recognition.onerror = () => {
      voiceState = 'idle';
      voiceError = 'voice not captured — try again';
    };

    recognition.onend = () => {
      if (voiceState === 'listening') voiceState = 'idle';
    };

    recognition.start();
    haptic.trigger('light');
  }

  function stopVoice() {
    recognition?.stop();
    recognition = null;
    voiceState = 'idle';
  }

  function handleVoiceClick() {
    if (voiceState === 'listening') {
      stopVoice();
    } else {
      startVoice();
    }
  }

  // ─── Camera input (file picker → base64 → POST /extract-topic) ─────────────

  let fileInput: HTMLInputElement | null = null;

  function handleCameraClick() {
    cameraError = '';
    fileInput?.click();
    haptic.trigger('light');
  }

  interface FigureCard {
    name: string;
    era: string;
    role: string;
    teaser: string;
    relevance_to_topic: string;
  }

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    cameraLoading = true;
    cameraError = '';

    try {
      const base64 = await fileToBase64(file);
      const mimeType = file.type || 'image/jpeg';

      const res = await fetch(`${backendUrl}/extract-topic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType }),
      });

      if (!res.ok) throw new Error('extraction failed');

      const data = await res.json() as { topic_extracted?: string; figures?: FigureCard[]; topic?: string };

      // New API: topic_extracted + figures → fire topic-submit with extracted topic,
      // then also dispatch figure cards so SessionPreview can show the picker
      if (data.topic_extracted && Array.isArray(data.figures) && data.figures.length > 0) {
        topic = data.topic_extracted;
        isBlocked = false;
        // Dispatch figure-cards event so SessionPreview shows the picker directly
        window.dispatchEvent(new CustomEvent('past-live:figures-from-image', {
          detail: { topic: data.topic_extracted, figures: data.figures },
        }));
      } else if (data.topic) {
        // Legacy fallback — old API shape
        topic = data.topic;
        isBlocked = false;
      } else {
        cameraError = 'could not read topic — try typing it';
      }
    } catch {
      cameraError = 'connection error — try again';
    } finally {
      cameraLoading = false;
      // Reset so same file can trigger again
      if (fileInput) fileInput.value = '';
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data URL prefix — send raw base64
        resolve(result.split(',')[1] ?? '');
      };
      reader.onerror = () => reject(new Error('file read failed'));
      reader.readAsDataURL(file);
    });
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────

  function handleSubmit() {
    const trimmed = topic.trim();
    if (!trimmed) return;

    // Client-side blocklist: first line of defense before backend Flash check
    if (isBlockedTopic(trimmed)) {
      isBlocked = true;
      haptic.trigger('heavy');
      return;
    }

    isBlocked = false;
    haptic.trigger('medium');
    // Dispatch custom event so SessionPreview overlay catches it
    window.dispatchEvent(new CustomEvent('past-live:topic-submit', { detail: { topic: trimmed } }));
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit();
  }

  // Clear blocked state when the user edits the topic
  function handleInput() {
    if (isBlocked) isBlocked = false;
  }

  // ─── Voice state label ─────────────────────────────────────────────────────

  const voiceLabel = $derived(
    voiceState === 'listening' ? 'stop listening' :
    voiceState === 'processing' ? 'processing...' :
    'speak topic',
  );

  // ─── Animated placeholder ─────────────────────────────────────────────────

  const PLACEHOLDER_PHRASES = [
    'fall of constantinople',
    'who built the pyramids?',
    'the french revolution',
    'moon landing 1969',
    'cleopatra and rome',
    'the silk road',
  ];

  let phraseIndex = $state(0);
  let wordIndex = $state(0);
  let animatedPlaceholder = $state('');
  let placeholderTimer: ReturnType<typeof setTimeout> | undefined;

  function animateNextWord() {
    const words = PLACEHOLDER_PHRASES[phraseIndex].split(' ');
    if (wordIndex < words.length) {
      animatedPlaceholder = words.slice(0, wordIndex + 1).join(' ');
      wordIndex++;
      placeholderTimer = setTimeout(animateNextWord, 120);
    } else {
      // Pause on complete phrase, then start next
      placeholderTimer = setTimeout(() => {
        phraseIndex = (phraseIndex + 1) % PLACEHOLDER_PHRASES.length;
        wordIndex = 0;
        animatedPlaceholder = '';
        placeholderTimer = setTimeout(animateNextWord, 300);
      }, 2500);
    }
  }

  $effect(() => {
    animateNextWord();
    return () => { if (placeholderTimer) clearTimeout(placeholderTimer); };
  });

  // ─── Auto-resize textarea ────────────────────────────────────────────────

  let textareaEl: HTMLTextAreaElement | null = null;

  function autoResize() {
    if (!textareaEl) return;
    textareaEl.style.height = 'auto';
    textareaEl.style.height = `${textareaEl.scrollHeight}px`;
  }
</script>

<div class="flex flex-col gap-3">
  <!-- Text input with animated placeholder -->
  <div class="relative">
    <span class="absolute left-3 top-3 text-accent/40 font-mono text-xs select-none z-10" aria-hidden="true">
      &gt;
    </span>
    <!-- Animated placeholder overlay — hidden when user is typing -->
    {#if !topic}
      <span
        class="absolute left-7 top-3 font-mono text-sm text-foreground/20 pointer-events-none select-none transition-opacity duration-200"
        aria-hidden="true"
      >{animatedPlaceholder}<span class="inline-block w-px h-[1em] bg-foreground/20 ml-0.5 align-text-bottom animate-pulse"></span></span>
    {/if}
    <textarea
      bind:this={textareaEl}
      bind:value={topic}
      onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
      oninput={() => { handleInput(); autoResize(); }}
      rows={1}
      class="w-full bg-surface border border-border rounded-sm pl-7 pr-4 py-3 font-mono text-sm text-foreground focus:outline-none focus:border-accent/30 focus-visible:ring-1 focus-visible:ring-accent/40 transition-colors resize-none overflow-hidden"
      style="min-height: 44px;"
      aria-label="Enter a topic to study"
    ></textarea>
  </div>

  <!-- Mic + Camera + Submit row -->
  <div class="flex items-center gap-3">
    <!-- Mic button — hidden if Web Speech API unavailable -->
    {#if voiceSupported}
      <button
        type="button"
        onclick={handleVoiceClick}
        class="flex-shrink-0 min-w-11 min-h-11 w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background
          {voiceState === 'listening' ? 'border-accent bg-accent/10 shadow-[0_0_16px_var(--color-accent-glow)]' : 'border-accent/30 hover:border-accent/60 hover:bg-accent/5'}
          {voiceState === 'processing' ? 'opacity-60 cursor-wait' : ''}"
        aria-label={voiceLabel}
        aria-pressed={voiceState === 'listening'}
        disabled={voiceState === 'processing'}
      >
        {#if voiceState === 'listening'}
          <!-- Pulsing dot when listening -->
          <div class="w-3 h-3 rounded-full bg-accent animate-pulse" aria-hidden="true"></div>
        {:else}
          <!-- Mic icon -->
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent/60" aria-hidden="true">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        {/if}
      </button>
    {/if}

    <!-- Camera / photo button -->
    <button
      type="button"
      onclick={handleCameraClick}
      disabled={cameraLoading}
      class="flex-shrink-0 min-w-11 min-h-11 w-11 h-11 rounded-full border-2 border-accent/30 flex items-center justify-center hover:border-accent/60 hover:bg-accent/5 transition-all
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background
        {cameraLoading ? 'opacity-60 cursor-wait' : ''}"
      aria-label={cameraLoading ? 'Extracting topic from photo...' : 'Snap a photo of your study material'}
    >
      {#if cameraLoading}
        <!-- Spinner -->
        <div class="w-4 h-4 border border-accent/40 border-t-accent rounded-full animate-spin" aria-hidden="true"></div>
      {:else}
        <!-- Camera icon (photo — snap study material) -->
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent/60" aria-hidden="true">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      {/if}
    </button>

    <!-- Submit button -->
    <button
      type="button"
      onclick={handleSubmit}
      disabled={!topic.trim()}
      class="flex-1 min-h-11 font-mono text-xs tracking-[0.12em] uppercase border rounded-sm transition-colors py-3
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background
        {topic.trim() ? 'border-accent/50 text-accent/80 hover:border-accent hover:text-accent hover:bg-accent/5' : 'border-border/30 text-foreground/45 cursor-not-allowed'}"
      aria-label="Call this historical figure"
    >
      [ call ]
    </button>
  </div>

  <!-- Hint text -->
  <p class="text-center font-mono text-xs text-foreground/45 tracking-[0.08em]">
    speak, type, or snap a photo
  </p>

  <!-- Hidden file input for camera -->
  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    capture="environment"
    onchange={handleFileChange}
    class="sr-only"
    aria-hidden="true"
    tabindex="-1"
  />

  <!-- Error messages -->
  {#if isBlocked}
    <p class="font-mono text-xs text-accent/60 text-center" role="alert">&gt; this number is not in service</p>
  {/if}
  {#if voiceError}
    <p class="font-mono text-xs text-accent/60 text-center" role="alert">&gt; {voiceError}</p>
  {/if}
  {#if cameraError}
    <p class="font-mono text-xs text-accent/60 text-center" role="alert">&gt; {cameraError}</p>
  {/if}
</div>
