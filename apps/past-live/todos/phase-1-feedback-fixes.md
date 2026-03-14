# Phase 1: Feedback Fixes

Source: David + Huy testing session (2026-03-13) + automated dogfood report.

## Issues (sorted by priority)

| # | Priority | Issue | Source | Status |
|---|----------|-------|--------|--------|
| 1 | P0 | Model speaks first — session shows "listening" instead of model narrating | Huy | TODO |
| 2 | P0 | Chat log — transcriptions pile up as one unreadable paragraph | Huy | TODO |
| 3 | P0 | Speaking indicator — no visual feedback when model is speaking | David | TODO |
| 4 | P0 | Countdown overlay — no preparation before session starts | Huy | TODO |
| 5 | P0 | System prompt — language too academic for target audience | Huy | TODO |
| 6 | P0 | Mic UX — hold-to-talk unintuitive; switch to auto-activate + mute/unmute | Huy | TODO |
| 7 | P0 | Session preview — no preview before entering session | Huy | TODO |
| 8 | P1 | Hint bar — no guidance on how to interact during session | David | TODO |
| 9 | P1 | Landing page — no introduction to what the app is | David/Huy | TODO |
| 10 | P1 | Home inline hints — no guidance text on home screen | David | TODO |
| 11 | P1 | Session no-params — `/session` with no params shows dead screen | Dogfood | TODO |
| 12 | P2 | Home mic + camera — dead mic button, no image input | Dogfood/Huy | TODO |
| 13 | P2 | Hero copy — mismatch between hero and title tag | Dogfood | TODO |
| 14 | P2 | Sentry DSN — placeholder throws errors | Dogfood | TODO |
| 15 | P3 | Summary punctuation — double period in NEXT BRIEFING links | Dogfood | TODO |
| 16 | P0 | PostHog setup — prerequisite for A/B testing and analytics | Huy | TODO |
| 17 | P1 | Session timer — visible remaining time in session UI | Huy | TODO |
| 18 | P1 | Session preview error states — Flash/Image fail gracefully | Huy | TODO |
| 19 | P1 | Mobile responsiveness — session page works on phones | Huy | TODO |

## Issue Details

### #1: Model Speaks First

| Aspect | Detail |
|--------|--------|
| Problem | After connect, UI shows "listening" — user doesn't know what to say |
| Root cause | Status goes to `active` before model output arrives |
| Fix | Countdown overlay plays 3s, model speaks during/after. Mic auto-activates but user knows model goes first |
| Files | `SessionManager.svelte`, `client.ts`, `stores/liveSession.ts` |

### #2: Character-Named Chat Log

| Aspect | Detail |
|--------|--------|
| Problem | `$outputTranscript` is a single string; `appendOutputTranscript` concatenates |
| Fix | `$messages` atom with `ChatMessage[]`. Accumulate chunks from same sender. New message on sender change |
| Format | `> [CONSTANTINE XI] text...` (model, character name from preview JSON) / `> [NARRATOR] text...` (model, narrator mode) / `> [YOU] text...` (user) |
| Sender tag source | `characterName` field from session preview JSON. NOT hardcoded "DISPATCH" |
| Challenge | Gemini sends word-by-word transcription chunks — must accumulate, not create new message per chunk |
| Files | `stores/liveSession.ts`, `client.ts`, new `ChatLog.svelte`, delete `SubtitleDisplay.svelte` |

### #3: Audio Waveform Animation

| Aspect | Detail |
|--------|--------|
| Problem | No visual indicator that model is speaking |
| Fix | `$isSpeaking` atom driven by audio playback state. CSS-animated bars (4 bars, staggered `animation-delay`) |
| Accessibility | `prefers-reduced-motion`: show static "> transmitting..." text. `aria-label="AI is speaking"` |
| Files | `audio.ts` (playback callbacks), `stores/liveSession.ts` (`$isSpeaking`), new `SpeakingIndicator.svelte` |

### #4: Countdown Overlay

| Aspect | Detail |
|--------|--------|
| Problem | No mental preparation before session |
| Fix | 3s total: `> STANDBY` (1s) → `> CHANNEL OPEN` (1s) → `> INCOMING TRANSMISSION` (1s) |
| Connection fast | Countdown plays fully, session starts after |
| Connection slow | After countdown, show DRY loading component (same as preview loading: fun brand-voice text, NOT "establishing connection..."). Examples: "> wiring up the time machine...", "> summoning witnesses..." |
| Mic/camera | Activate during countdown (from [ENTER SESSION] gesture) |
| Loading component | **Shared** with session preview loading. Single component, two contexts |
| Files | `SessionManager.svelte`, new shared `FunLoadingText.svelte` |

### #5: System Prompt Rewrite

| Aspect | Detail |
|--------|--------|
| Problem | Language too academic ("inexorable", "nascent", "hegemony") |
| Fix | A/B variants. Variant A: current formal. Variant B: accessible period-flavored |
| Variant B rules | Max 15 words/sentence. Explain terms inline. Forbidden vocab list. History documentary tone |
| A/B mechanism | `promptVariant: 'a' \| 'b'` param in start message. Track via PostHog |
| Files | `server/src/scenarios.ts` → extract rules to `behavioral-rules.ts`. `protocol.ts`, `relay.ts` |

### #6: Mic Auto-Activate + Mute/Unmute

| Aspect | Detail |
|--------|--------|
| Problem | Hold-to-talk unintuitive on web. Hackathon requires "talk naturally, can be interrupted" |
| Fix | Auto-activate mic on session entry. Mute/unmute toggle button + spacebar |
| Spacebar guard | Spacebar toggles mic ONLY when `document.activeElement` is NOT a text input (`<input>`, `<textarea>`, `[contenteditable]`). Must check `document.activeElement` on keydown |
| Checkbox | Pre-checked ☑ on [ENTER SESSION]. Controls initial state only — mic ALWAYS accessible |
| Camera checkbox | Controls video IN or NOT IN. If unchecked, video is completely OFF (not muted — OFF). No video frames sent at all |
| States | Active (pulsing, "channel open") / Muted (dimmed, mic-slash, "channel muted") / Disabled (no session) |
| Interruption | Mic stays streaming while model speaks → user just talks → VAD detects → `interrupted` signal |
| No sendAudioEnd | Only when user explicitly mutes. VAD handles turn detection |
| Files | `MicButton.svelte`, `audio.ts` (preWarm, no stopMic on pause), `SessionManager.svelte` |

### #7: Session Preview Overlay

| Aspect | Detail |
|--------|--------|
| Problem | User enters session with no preview of what they'll experience |
| Fix | Overlay on home screen after input. 2 parallel Gemini calls |
| Call 1 | `gemini-3-flash-preview` → JSON Schema enforced: topic, userRole, characterName, historicalSetting, year, context, colorPalette (5 OKLCH values) |
| Call 2 | `gemini-3.1-flash-image-preview` → 2 image assets: scene image (immersive era art, sets mood) + character avatar (small, for chat log sender tag) |
| Asset pipeline | 2 images total: scene image + character avatar. NO background texture. NO card thumbnail |
| Loading | Simple spinner + rotating fun text (DRY component shared with countdown connection wait) |
| Overlay shows | Scene image, role, setting, context, color theme, ☑ mic, ☑ camera, [EDIT], [ENTER SESSION] |
| Edit mode | Modify topic + notes. Original input (text/image/audio) preserved. [REGENERATE PREVIEW] |
| Presets | Always show preview (pre-filled from scenario metadata) |
| Error states | Flash fails → retry button. Image fails → placeholder image. Both fail → preset fallback (hardcoded scenario data + generic image) |
| Files | New `SessionPreview.svelte`, new backend endpoint, `TopicInput.svelte`, `ScenarioCard.svelte` |

### #8: Persistent Hint Bar

| Aspect | Detail |
|--------|--------|
| Fix | "click mic to mute · or type below" — subtle monospace bar above controls |
| Visible | When status is `active` |
| Files | `session.astro` (inline or new `HintBar.svelte`) |

### #9: Landing Page

| Aspect | Detail |
|--------|--------|
| Fix | New `/` route. Current home → `/app` |
| Sections | Hero + tagline → 3 feature bullets → "How it works" (3 steps) → CTA |
| Second CTA | Below: hackathon submission requirements (for judges) |
| Hackathon section | Summary text, GitHub repo link, architecture diagram, deployment proof, demo video |
| Copy | Brand voice: Codex register (hero) + Glitch Cinema (bullets) |
| Files | Rewrite `index.astro`, new `app.astro` |

### #10: Home Inline Hints

| Aspect | Detail |
|--------|--------|
| Fix | "Pick a dispatch or type your own" hint text on home screen |
| Files | `app.astro` (new home page) |

### #11: Session No-Params Redirect

| Aspect | Detail |
|--------|--------|
| Fix | `if (!scenarioId && !topic) return Astro.redirect('/app')` in frontmatter |
| Files | `session.astro` |

### #12: Home Mic + Camera (Multimodal Input)

| Aspect | Detail |
|--------|--------|
| Problem | Mic button has no event handlers. No image input |
| Audio | Web Speech API (`SpeechRecognition`). Mic click → recognition → fills text input. $0, instant |
| Image | Camera button → `<input type="file" accept="image/*" capture>` → Gemini Flash vision → topic extraction |
| Backend | `POST /extract-topic` endpoint. `gemini-3-flash-preview`. Returns `{ topic: string }` |
| Layout | Row below text input: [🎙️ mic] [📷 camera] + "speak, type, or snap a photo" |
| Files | `TopicInput.svelte`, new `server/src/extract-topic.ts`, `server/src/server.ts` |

### #13: Hero Copy Alignment

| Aspect | Detail |
|--------|--------|
| Fix | "The past is speaking. Are you?" everywhere (hero, `<title>`, og:title) |
| Files | `index.astro` / `app.astro`, `BaseLayout.astro` |

### #14: Sentry Disable

| Aspect | Detail |
|--------|--------|
| Fix | Guard: `if (dsn && dsn !== '__SENTRY_DSN__') { Sentry.init({...}) }` |
| Files | `sentry.client.config.js` |

### #15: Summary Punctuation

| Aspect | Detail |
|--------|--------|
| Fix | `{s.headline.replace(/[.!?]+$/, '')}, {s.year}` |
| Also | Update "new session" link: `/` → `/app` |
| Files | `SummaryView.svelte` |

### #16: PostHog Setup (Prerequisite)

| Aspect | Detail |
|--------|--------|
| Why | Required for A/B testing (`promptVariant`), usage analytics, hackathon metrics |
| Fix | Add `posthog.astro` component per monorepo pattern. `PUBLIC_POSTHOG_KEY` in `.env.production` |
| Blocking | Must be done before A/B prompt testing (#5) |
| Files | New `src/components/posthog.astro`, `BaseLayout.astro` |

### #17: Session Timer

| Aspect | Detail |
|--------|--------|
| Why | User needs to know remaining time. Session is 7-14 min, max 15 |
| Fix | Visible timer in session UI. Starts on session active. Shows remaining time (countdown from max) |
| Display | Subtle, non-intrusive. Monospace font. Top area of session page |
| Files | New `SessionTimer.svelte`, `SessionManager.svelte` |

### #18: Session Preview Error States

| Aspect | Detail |
|--------|--------|
| Why | Network failures, rate limits, model errors can fail preview generation |
| Flash fails | Show retry button. User can retry or edit topic |
| Image fails | Show placeholder image (generic era-appropriate fallback) |
| Both fail | Preset fallback — hardcoded scenario data + generic image. Session still enters |
| Files | `SessionPreview.svelte` |

### #19: Mobile Responsiveness (Session Page)

| Aspect | Detail |
|--------|--------|
| Why | Students use phones. Hackathon judges may test on mobile |
| Fix | Responsive layout for session page: chat log, mic, text input, timer, waveform |
| Breakpoints | Mobile-first. Desktop adds side padding + larger portrait |
| Files | `session.astro`, all session Svelte components |

## Color Theme (Session Page)

| Aspect | Detail |
|--------|--------|
| Source | 5 OKLCH colors from Gemini Flash (session preview) |
| Application | Override ALL session CSS custom props: `--color-background`, `--color-surface`, `--color-accent`, `--color-foreground`, `--color-muted` |
| Brand logo | Stays fixed (hardcoded, not tokenized) |
| Mechanism | `style` attribute on session page root element with CSS custom property overrides |
| Effect | Entire session UI takes on era-specific atmosphere (Constantinople = warm amber, Moon = cold blue-white) |

## Execution Batches

| Batch | Items | Parallel With |
|-------|-------|---------------|
| 0: Foundation | Vitest config, store refactor, protocol extension, **PostHog setup (#16)** | — |
| 1: Backend | System prompt rewrite, relay promptVariant | Batch 2 |
| 2: Frontend Core | Client message logic, MicButton (spacebar guard), ChatLog (character names), SpeakingIndicator | Batch 1 |
| 3: Session Assembly | SessionManager (countdown + DRY loading, auto-mic), session.astro, hint bar, **session timer (#17)** | — |
| 4: Pages + Bugs | Landing page, home restructure, hero copy, Sentry, summary, **mobile responsiveness (#19)** | Batch 3 |
| 5: Home Multimodal | TopicInput (Web Speech + camera), extract-topic endpoint | — |
| 6: Session Preview | Preview overlay, Gemini Flash endpoint, **asset pipeline (scene image + avatar)**, color theme, **error states (#18)**, DRY loading component | — |
