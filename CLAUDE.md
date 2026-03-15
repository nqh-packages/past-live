# Past, Live

Call the past. Students call historical figures to learn through conversation via Gemini Live API. Real-time voice. The student is the caller — they dial into the past, the character answers.

**Hackathon**: Gemini Live Agent Challenge | **Deadline**: March 16, 2026 @ 8:00pm EDT
**Category**: Live Agents (real-time voice + vision)
**Status**: Submitted (late, with organizer extension to 10pm). Judging: March 17 — April 3, 2026.

### Post-Submission Rules

- **Devpost submission page**: LOCKED. Cannot change text, video link, or form fields.
- **Code repo + live app**: CAN keep updating. Rules say "you may continue to update the Project in your Devpost portfolio."
- **Public repo**: Push via `bash apps/past-live/scripts/extract-public-repo.sh /tmp/past-live-public && cd /tmp/past-live-public && git push --force-with-lease origin main`

---

## Core Architecture: Flash Fills the Bag, Live Performs (2026-03-16)

**Flash generates a bag of material. Live pulls from it based on where the conversation goes.**

No linear script. No acts. No beats. The character has hooks, facts, choices, and scenes — and pulls the right one based on what the student just said.

Pedagogy from StudyBit: **derivable learning**. Student knows NOTHING. Every fact anchored to universal experience. Choices test reasoning, not recall. Wrong answers teach as much as right ones.

| Layer | What | Source |
|-------|------|--------|
| Personality | Voice, humor MECHANISM, quirks, energy | Flash generates per character |
| Hooks | myth/truth/surprise/anchor combos — "wait WHAT?" moments | Flash generates per character |
| Facts | Verified historical details, woven in one at a time | Flash generates per character |
| Choices | Derivable dilemmas with per-option consequences | Flash generates per character |
| Scenes | Pre-written image descriptions for show_scene | Flash generates per character |
| Closing | Final reframe line | Flash generates per character |
| Universal rules | Phone call pacing, energy matching, humor, anchoring, "what you are NOT" | System prompt (hardcoded) |
| Drift prevention | Hook mandate, energy matching, lead rule, anchoring, pacing | Re-anchor injection every 4 turns via sendText |

### Why NOT Linear Scripts

Tested 4 versions of scripted acts (V1-V4). All failed:
- V1 (exact lines): model repeated verbatim on interrupt
- V2 (hints per beat): 40s monologue, dumped everything
- V3 (minimal beats + stop): mechanical beat-jumping, dropped threads
- V4 (destinations not script): model couldn't bounce energy, no personality

Bag-of-material works because: the student drives the conversation unpredictably. The character needs material to pull from, not a sequence to follow.

### Conversation Patterns (from 9 dream conversations)

| Pattern | Rule |
|---------|------|
| Opening | Under 10 words. Statement, never question. Then pause. |
| Myth-bust | Challenge what they "know." Truth must be MORE interesting. |
| Hooks | MANDATORY. Every line needs a "wait, WHAT?" moment. |
| Anchoring | Connect to universal experience: group projects, sports, family. Never academic language. |
| Choices | 2-3 options, no wrong answer, each teaches different facet. Say them out loud. |
| Energy | Bouncing ball — match and amplify. Never absorb. |
| Humor | NOT jokes. Gap between how insane the situation was and how casually you describe it. |
| Lean into fun | When something accidentally funny happens, BUILD on it. Push further. React like a real person. |
| Personality | MUST have opinions, attitudes, reactions. NOT a fact machine. Blunt, punchy, casual — never formal/stiff/academic. |
| Voice examples | GOOD: "A carpet would have been ridiculous." BAD: "One must adapt to the prevailing currents." |
| Thread building | Each response connects to what you JUST said AND what they JUST said. Never drop a thread. |
| No repeating | If you already mentioned it, pull a DIFFERENT hook. Never circle back to the same topic. |
| Pacing | 1-2 sentences, wait. Ramp up: turn 1 = 1 sentence, turn 3 = maybe 2. |
| Student awareness | Ask about them naturally early. Use what you learn in the closing observation. |
| Close | Specific observation about how the student thinks (not praise). Callback to something they said. |

See `docs/sessions/dream-convos/` for 9 reference transcripts. See `server/src/test-scripts/CLAUDE.md` for testing.

---

## Decisions Log

All decisions made by Huy during concept/research phase (2026-03-13, 2026-03-14, 2026-03-16). Do NOT re-ask.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Category | Live Agents | Real-time voice = strongest wow |
| Concept | Call the past — students phone historical figures | "Past, Live" = the line is open |
| Non 'Live' Model | `gemini-3-flash-preview` (code/JSON output) | Huy's explicit choice |
| Image Gen Model | `gemini-3.1-flash-image-preview` | Character portraits + color themes |
| Live API Model | `gemini-2.5-flash-native-audio-preview-12-2025` | Native audio, affective dialog, VAD |
| Voice | Flash picks per character from 30 voices | Each character gets a fitting voice. Locked at connect time |
| Camera | Home screen scan only (topic extraction). NO mid-call video | 2min audio+video limit too restrictive. Audio-only calls |
| Text input | Hybrid: character speaks, student can speak OR type | 4/6 personas voice-blocked. Text always visible |
| Scoring | None — natural conversation | No gamification |
| Profile storage | Firestore (full schema) | Satisfies GCP requirement + personalization |
| Session structure | Natural conversation. 10 min hard max. 9 min wrap-up inject | Character leads, no rigid steps |
| Character breaking | No narrator. Everything is the character | No corpsing. No narrator voice. Multi-character via `switch_speaker` |
| Onboarding | Profile from Firestore. Character knows who's calling. Zero tutorials | First visit: character asks name conversationally |
| Post-call | Call log: who, duration, key facts, what happened after, character's message | Not "session complete" — it's a call receipt |
| Scenario selection | Person+moment cards on home screen. "Who do you want to call?" | Not event-focused dispatch cards |
| Topic clarification | Flash returns 3 people+moments for vague topics | Inline on /app, NOT in overlay |
| Tool calling | `end_session`, `switch_speaker`, `announce_choice`, `show_scene`. All NON_BLOCKING | Model controls session flow + decides when to generate images |
| Google Search | **REMOVED** — crashed Gemini Live sessions | Tool calling + native audio is fragile (GitHub #843). Character relies on own knowledge |
| Image gen mid-call | `show_scene` tool → Gemini 3.1 Image generates in background, appears inline | Two Gemini models collaborating: Live decides moment, Image renders |
| Cross-session memory | Past sessions injected into system prompt from Firestore profile | Character references previous calls ("I heard you tried to save Constantinople") |
| Explicit choices | Via `announce_choice` tool — tappable cards | Not just prompt instruction |
| Preview flow | Preview card → calling screen → connected (hybrid) | Brief card, then iPhone-style calling animation |
| Privacy voice | Automated "This call is live and not recorded" before character speaks | Robotic tone, clearly not the character |
| Share card | Call receipt with character's farewell message. Downloadable moment | 9:16 for Instagram stories |
| Timer | Counts UP (phone call style), not countdown | `00:04:32` — natural phone behavior |
| Tone | Characters are calm, funny, self-aware storytellers of their own lives | NOT in crisis — they lived through it and tell it with wit and understatement |
| Humor style | Facts are funny. No jokes — understatement, absurdity framing, self-deprecation | "They dragged 72 ships over a mountain. Over. A. Mountain." |
| Emotional boundaries | Warm and witty, never dependent. Emotion serves storytelling | No parasocial attachment, no guilt, no extremes |
| Content safety | Blocked callers get "This line is disconnected" | Redirect to witnesses/resistors |
| Preset rotation | Large pool in Firestore, rotate 3 per visit. Cache portraits | User-generated cards join the pool |
| Frontend | Astro app in monorepo (`apps/past-live/`) | Full Google stack |
| Backend | Hono on Cloud Run | TS, lightweight, WebSocket support |
| Frontend Host | Cloud Run (same service or separate) | Moved off Cloudflare — full Google stack for hackathon |
| Art | Flash → color theme, Gemini 3.1 → character portrait | Full-stack Google |
| Demo scenarios | Constantinople 1453, Moon Landing 1969, Mongol Empire 1206 | 3 diverse regions/eras |
| App name | **Past, Live** (slug: `past-live`) | Comma = pause. "Past, live." |
| Landing page | Hero + 3 feature bullets + CTA | Single page for judges + users |
| Home input | Multimodal: text + Web Speech API (voice) + Gemini Flash (image) | All 3 input modes |
| Hero copy | "The past is speaking. Are you?" | Align title, og:title, hero |
| Sentry | Disabled (guard DSN check) | Placeholder `__SENTRY_DSN__` throws errors |
| API tier | Paid (pay-as-you-go) for demo | Free tier throttles image gen to 12-15s. Paid = 2-3s. ~$0.25/session. See `docs/gemini-cost-estimation.md` |

---

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Astro 5 + Svelte 5 | Monorepo `apps/past-live/` |
| Backend | Hono (TS) on Cloud Run | `apps/past-live/server/` — WebSocket relay to Gemini |
| AI Voice | Gemini Live API (`gemini-2.5-flash-native-audio-preview-12-2025`) | Real-time voice + sparse vision |
| AI Image | `gemini-3.1-flash-image-preview` | Character portraits + color themes |
| Profile DB | Firestore (`past-live-490122`, EU eur3) | Student profiles, session history |
| Auth | Clerk (`@clerk/astro`) | Anonymous-first, sign-up-later |
| Frontend Host | Cloud Run | Full Google stack (moved off Cloudflare) |
| Domain | `pastlive.site` (primary, **NOT YET REGISTERED**) + `past-live.ngoquochuy.com` (subdomain) | Porkbun account needs phone/email verification |
| Monitoring | Sentry | Error tracking (currently disabled) |

---

## Gemini Live API — Technical Reference

**NOT in training data. Consult this section + installed skills when implementing.**

### SDK Setup

```typescript
import { GoogleGenAI } from '@google/genai'; // v1.44.0+ | DEPRECATED: @google/generative-ai

// v1alpha REQUIRED for enableAffectiveDialog — without it, API rejects the field
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { apiVersion: 'v1alpha' },
});
```

### Connecting

Key config values (see `gemini.ts` for full implementation):

```typescript
const session = await ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  config: {
    responseModalities: ['audio'],
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
    enableAffectiveDialog: true,
    inputAudioTranscription: {}, outputAudioTranscription: {},
    automaticActivityDetection: {
      startOfSpeechSensitivity: 'START_SENSITIVITY_LOW',
      endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
      prefixPaddingMs: 20, silenceDurationMs: 500,
    },
    contextWindowCompression: { slidingWindow: {} },
    tools, // function declarations
  },
});
```

### Tool Calling

3 tools, all `NON_BLOCKING`. Full declarations in `~/.claude/plans/tool-calling-implementation.md`.

| Tool | Purpose | Relay → Browser |
|------|---------|-----------------|
| `end_session(reason)` | Character wraps up OR student hangs up | `{ type: 'ended' }` → redirect to `/summary` |
| `switch_speaker('character', name)` | Multi-character only. No narrator | `{ type: 'speaker_switch', name }` → update chat tag |
| `announce_choice(choices[])` | 2-3 tappable option cards | `{ type: 'choices', choices }` → show cards inline |

### Voice Auto-Selection

Flash JSON returns `voiceName` from 30 available voices. Relay passes to `ai.live.connect()`. Full voice catalog with "best for" guidance in `~/.claude/plans/tool-calling-implementation.md`.

**Voice locked at connect time** — cannot switch mid-session.

### Voice Catalog (8 voices)

Flash picks from this catalog per character. No hardcoded voices — presets also use catalog voices.

| Voice | Gender | Age Feel | Accent | Best For |
|-------|--------|----------|--------|----------|
| Aoede | F | 45-60 | British RP | Queens, empresses, powerful women |
| Zephyr | F | 35-45 | American | Shrewd stateswomen, spymasters |
| Erinome | F | 25-35 | American | Inventors, explorers, younger figures |
| Sulafat | F | 35-45 | British RP | Witty queens, diplomats |
| Achird | M | 65-75 | British RP | Aging emperors, wartime leaders |
| Algenib | M | 45-60 | American | Wise diplomats, seasoned commanders |
| Enceladus | M | 25-35 | American | Young kings, charismatic rebels |
| Charon | M | 45-60 | British RP | Revolutionaries, military strategists |

### Preset Voice Assignments

| Scenario | Voice | Why |
|----------|-------|-----|
| Constantinople (Constantine XI) | Achird | Elder emperor, gravelly gravitas, accepting fate |
| Mongol Empire (Jamukha) | Charon | Dark intensity, dry humor, political agitator |
| Angostura (Bolívar) | Enceladus | Young rebel energy, charismatic, electric |

### Audio / Input

| Direction | Format | Rate |
|-----------|--------|------|
| Input (mic) | PCM 16-bit LE mono | 16kHz |
| Output (speaker) | PCM 16-bit LE mono | 24kHz |

```typescript
session.sendRealtimeInput({ audio: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
session.sendRealtimeInput({ text: 'Hello' });
// sendClientContent → ONLY for history injection, NOT new messages
```

### Limits & Costs

| Mode | Duration | | Input | Cost |
|------|----------|-|-------|------|
| Audio only | 15 min (API), 10 min (our max) | | Video frame | 258 tokens |
| Audio + video | ~2 min | | Audio | 32 tokens/sec |
| With compression | Unlimited (quality degrades) | | Text | ~1 token/4 chars |

### VAD Config

`START_SENSITIVITY_LOW`, `END_SENSITIVITY_HIGH`, `prefixPaddingMs: 20`, `silenceDurationMs: 500`

### `gemini.ts` Implementation Defaults

| Setting | Value | Notes |
|---------|-------|-------|
| Voice | Flash-selected (fallback: `Charon`) | Locked at connect time |
| VAD | LOW start / HIGH end, `20ms` padding, `500ms` silence | Natural phone conversation pauses |
| Compression | `contextWindowCompression: { slidingWindow: {} }` | Longer sessions |
| Transcriptions | Enable input + output | Required for subtitle UI |
| Media resolution | `MEDIA_RESOLUTION_LOW` | Only for input scan frames |
| Mic release | `audio_end` → `audioStreamEnd` | Flush cached audio on mute |

### Rules

| Rule | Detail |
|------|--------|
| `sendRealtimeInput` | ALL real-time input (audio, video, text) |
| `sendClientContent` | ONLY history injection |
| `media` key | Do NOT use — use `audio`, `video`, `text` separately |
| Response modality | Locked per session: TEXT or AUDIO |
| Native audio | Generates speech directly (not text→TTS) — natural, emotional, low-latency |
| Voice switching | IMPOSSIBLE mid-session. Must close + reconnect |

---

## Architecture

```
Browser (Astro/Svelte)              Cloud Run (Hono/TS)
┌─────────────────────┐            ┌──────────────────────┐
│ Mic (getUserMedia)   │            │ @google/genai         │
│ Audio playback       │──WebSocket─│ ai.live.connect()    │
│ UI (transcript, art) │            │ Tool call handler     │
│ Text input           │◄─WebSocket─│ Scenario prompts     │
│                      │            │ Profile read/write    │
│ Deploy: Cloudflare   │            │                      │
└─────────────────────┘            └──────────┬───────────┘
                                              │ WebSocket
                                   ┌──────────▼───────────┐
                                   │ Gemini Live API       │
                                   └──────────────────────┘
                                   ┌──────────────────────┐
                                   │ Firestore (profiles)  │
                                   │ Gemini 3.1 (portraits)│
                                   └──────────────────────┘
```

---

## API Calls Per Session

| # | Call | Model | Purpose |
|---|------|-------|---------|
| 1 | Session preview JSON | `gemini-3-flash-preview` | Structured output: character, setting, stakes, colors, voiceName |
| 2 | Scene image | `gemini-3.1-flash-image-preview` | Era-specific scene art |
| 3 | Character portrait | `gemini-3.1-flash-image-preview` | Character portrait for call screen |
| 4 | Voice conversation | `gemini-2.5-flash-native-audio-preview-12-2025` | Live API session (real-time voice) |
| 5 | Post-call summary | `gemini-3-flash-preview` | Transcript → keyFacts, outcomeComparison, characterMessage, suggestedCalls |

**Per session**: 3 non-Live calls + 1 Live session + 1 post-call summary = 5 calls

---

## Call Flow

| Step | Action | Mode |
|------|--------|------|
| 1 | **Input** — Student provides topic via text, voice (Web Speech API), or image (camera → Flash vision). Home screen | `/app` |
| 1b | **Topic Clarification** — If topic is vague, Flash returns 3 person+moment cards inline on `/app`. Student picks one | `/app` inline |
| 1c | **Preview Card** — Brief card with portrait, name, era, teaser. ☑ "Enable microphone" checkbox. [CALL] / [CANCEL] | `/app` overlay |
| 2 | **Calling Screen** — iPhone-style: portrait circle, name, era, "calling..." animation. Gemini Live connects in background. Mic activates from [CALL] gesture | `/session` |
| 2b | **Privacy Voice** — Automated: "This call is live and not recorded." Robotic tone, not the character | Before character speaks |
| 3 | **Connected** — Character picks up. Already knows student (profile from Firestore). First visit: asks name conversationally. Tells their story | Live API, audio-only |
| 4 | **Conversation** — Natural back-and-forth. Character leads. Student asks questions, gives opinions. At key moment: `announce_choice` with 2-3 options | Audio-only |
| 5 | **Student's advice** — Student picks via card tap, voice, or typing. Character reacts with consequence + what actually happened | Audio-only |
| 6 | **Closing** — Character's positive observation about the student. Ends with dignity. `end_session` | Audio-only |
| 7 | **Call Log** — Who, duration, key facts, what happened after, character's message, suggested next calls. Downloadable share card | `/summary` |

### Camera: Input Only

Camera is for showing what you're studying (textbook scan → topic extraction via Flash vision). NO camera during calls. No video. Audio-only phone call.

### Voice + Text Input (Hybrid Mode)

Character ALWAYS speaks via voice. Student can respond via **voice OR text**.
- Mic auto-activates when call connects (mute/unmute toggle, spacebar shortcut when NOT focused on text input)
- Text input always visible below call controls
- Text uses `session.sendRealtimeInput({ text: '...' })` — same API
- Mic stays streaming while character speaks → student can interrupt naturally (VAD detects speech)
- `audio_end` only when user explicitly mutes mic

### Session End Triggers

| Trigger | Who | Mechanism |
|---------|-----|-----------|
| Character wraps up | Model | Calls `end_session('story_complete')` |
| Student hangs up | Student | Red button → frontend sends close → backend sends `end_session('student_request')` |
| 9-min inject | System | Backend sends text: "Begin wrapping up naturally." |
| 10-min timeout | System | Backend force-closes. Sends `ended` with reason `timeout` |

### Probing — All In-Character

| Level | Example (Constantinople) |
|-------|--------------------------|
| 1. Guide | "The chain holds — but only the strait. What about the northern shore?" |
| 2. Hint | "Seventy ships. He moved them over the hills. Over the HILLS." |
| 3. Direct | "The harbor is breached. I have 300 men. Three options. Which?" |
| 4. Resolve | "Too late. The ships are in the harbor. But you — you asked the right questions." |

---

## Emotional Boundaries

Emotion serves LEARNING, not attachment. Historical characters are emotional because history IS emotional — but clear limits prevent manipulation.

### ALLOWED

| Emotion | Example |
|---------|---------|
| Urgency/stress | "The ships are in the harbor! We have hours, not days!" |
| Gratitude | "Thank you, stranger. You helped me see clearly." |
| Historical grief | "The city I swore to protect... it's falling." |
| Pride | "You think like a true general." |
| Humor (character-appropriate) | "You suggest we THROW the cannons? I like you." |
| Dramatic tension | "If I make the wrong call, everyone in this city dies." |

### FORBIDDEN

| Boundary | Why |
|----------|-----|
| Crying, begging, despair | No emotional extremes — emotion serves learning |
| "Don't leave me" / "I need you" | Creates parasocial dependency |
| Guilt for hanging up | Student must feel free to end anytime |
| "I'm real" / blurring AI boundary | Ethical clarity — this is an AI character |
| Romantic undertones | Inappropriate for educational tool targeting minors |
| Trauma dumping without resolution | Every difficult moment must resolve constructively |
| Personal emotional dependency | Character is grateful, never dependent |

### System Prompt Rule

"You are a historical figure in a moment of crisis/importance. You feel real emotions appropriate to your situation. But you are NOT dependent on this student. You existed before the call and will continue after. End every call with dignity and a positive observation. Never make the student feel guilty for ending the conversation."

---

## Content Safety: Blocked Callers

Some historical figures should not be role-played. Flash maintains a blocklist.

### Blocked Categories

| Category | Examples |
|----------|---------|
| Perpetrators of genocide | Hitler, Pol Pot, etc. |
| Serial killers | — |
| Figures whose role-play could normalize violence | — |

### UX: "This line is disconnected"

Stays in the phone metaphor. No lecture. No judgment.

```
> CALL FAILED
> This number is not in service.
>
> Try calling someone who was there:
>
> [portrait] Sophie Scholl
>   Munich, 1943
>   "I resisted. Let me tell you why."
>
> [portrait] Oskar Schindler
>   Kraków, 1944
>   "I saved 1,200 lives."
```

### Implementation

- Blocklist in Flash prompt + server-side validation
- Flash instruction: "If the requested person is a perpetrator of genocide, mass violence, or serial crime, return type 'blocked' with 3 alternative people who witnessed or resisted the same events"
- Server-side fallback: relay checks character name against hardcoded blocklist before connecting

---

## Preset Rotation + Caching

| Aspect | Detail |
|--------|--------|
| Pool | Large set of pre-generated person+moment cards in Firestore |
| Home display | Rotate 3 cards on each visit from the pool |
| Portraits | Generated once per character via Gemini 3.1 Image, cached in DB. Neutral pose |
| Multiple cards per character | One character can appear in multiple moments (e.g., Constantine XI: "the walls are falling" + "the night before the siege") |
| User-generated | After Flash generates a person+moment for an open topic, cache the card + portrait for future rotation |
| Freshness | Mix preset (curated) + user-generated (community) cards |

---

## Two Palette System

| Palette | Purpose | When applied |
|---------|---------|-------------|
| **System** | App chrome: nav, logo, inputs, home page | Always — `global.css` `@theme {}` |
| **Story** | Era atmosphere: call screen, preview card, call log | Per-session — inline CSS vars from OKLCH |

**Rule**: Brand accent (red) stays fixed on the Past, Live logo. Everything else in call context inherits story palette.

### Story Palette OKLCH Constraints (enforced in Flash prompt)

| Index | Role | Lightness |
|-------|------|-----------|
| 0 | Background | 8-15% |
| 1 | Surface | 12-20% |
| 2 | Accent | 55-75% |
| 3 | Foreground (text) | 85-95% |
| 4 | Muted | 30-45% |

**Guarantees**: 7:1+ contrast between foreground (3) and background (0). Preview card + call screen both apply story palette via CSS custom properties.

---

## UI Layout

Full mockups in `design/ux-details.md`. Key elements:

### In-Call Screen

| Element | Detail |
|---------|--------|
| Scene banner | Gemini 3.1 Image, 16:9 landscape, era-specific |
| Header | Character name + era + timer (counts UP: `00:03:42`) |
| Chat log | `> [CHARACTER_NAME]`, `> [A MESSENGER]` (via switch_speaker), `> [YOU]` or `> [STUDENT_NAME]` |
| Choice cards | Via `announce_choice`. Tappable. Auto-dismiss on voice input |
| Controls | `[speaker] [hang up (red)] [mute]` — iPhone-style bottom bar |
| Text input | Always visible below controls |
| Waveform | CSS animation, `$isSpeaking` state |

### Other Screens

| Screen | Key Detail |
|--------|------------|
| Preview card | Portrait + name + era + teaser + ☑ mic checkbox + [CALL] / [CANCEL]. Story palette. No camera checkbox |
| Calling screen | Portrait circle + "calling..." → "connected". Privacy voice before character speaks |
| Call log (`/summary`) | Duration, key facts, what happened after, character's farewell message, suggested next calls, [Save] |
| Share card | 9:16 downloadable. Character's farewell. Download button OUTSIDE card |

---

## Session Timer

Timer counts UP from `00:00:00` (phone call style). Always visible below character name.

| Time | Action |
|------|--------|
| 9 min | Backend injects: "Begin wrapping up naturally." (text to model) |
| 10 min | Backend force-closes: `session.close()` + `{ type: 'ended', reason: 'timeout' }` |

No minimum. Student can hang up at 30 seconds.

---

## Demo Scenarios

| Scenario | Era | Character | Teaser |
|----------|-----|-----------|--------|
| Fall of Constantinople | 1453 | Constantine XI | "The walls are falling." |
| Moon Landing | 1969 | Gene Kranz | "25 seconds of fuel." |
| Mongol Empire | 1206 | Jamukha | "The khan rides." |

Person+moment cards on home screen. "Who do you want to call?"

---

## Student Profile (Firestore)

```typescript
interface StudentProfile {
  id: string;
  name: string;
  age: number;
  createdAt: Timestamp;
  lastSessionAt: Timestamp;
  learningPatterns: {
    effectiveProbes: ('encourage' | 'hint' | 'rephrase' | 'progress')[];
    reasoningStyle: 'emotional' | 'logical' | 'creative' | 'mixed';
    engagementLevel: 'high' | 'medium' | 'low';
  };
  personality: {
    traits: string[];           // "quick thinker", "empathetic", "strategic"
    humorStyle: string;         // "dry", "playful", "slapstick"
    confidenceLevel: 'bold' | 'moderate' | 'cautious';
  };
  sessions: {
    scenarioId: string;
    characterName: string;
    date: Timestamp;
    duration: number;           // seconds
    topicsCovered: string[];
    agentInsight: string;       // Character's positive observation
  }[];
  nextWarmUp: {
    question: string;
    context: string;
  };
}
```

---

## Backend Relay Contract

### Browser → Backend

```typescript
type ClientMessage =
  | { type: 'start'; scenarioId?: string; topic?: string; voiceName?: string; studentName?: string; characterName?: string; historicalSetting?: string; studentId?: string }
  | { type: 'audio'; data: string; mimeType: 'audio/pcm;rate=16000' }
  | { type: 'audio_end' }       // relay sends Gemini audioStreamEnd
  | { type: 'text'; text: string }
  | { type: 'video'; data: string; mimeType: 'image/jpeg' };
```

### Backend → Browser

```typescript
type ServerMessage =
  | { type: 'connected'; sessionId: string }
  | { type: 'audio'; data: string }
  | { type: 'input_transcription'; text: string }
  | { type: 'output_transcription'; text: string }
  | { type: 'interrupted' }
  | { type: 'speaker_switch'; speaker: 'character'; name: string }
  | { type: 'choices'; choices: { title: string; description: string }[] }
  | { type: 'error'; message: string }
  | { type: 'ended'; reason: string; summary?: PostCallSummary };
```

| Rule | Detail |
|------|--------|
| `start` payload | Must include exactly ONE of `scenarioId` or `topic`. Optional `voiceName`, `characterName`, `historicalSetting`, `studentId` |
| Scenario cards | Use `scenarioId` |
| Freeform topic | Use `topic` |
| `audio_end` | Browser sends when user mutes mic; relay maps to `audioStreamEnd` |

---

## Backend Packaging

| Decision | Value |
|----------|-------|
| Location | `apps/past-live/server/` |
| Package management | Own `package.json` + local `node_modules` |
| Workspace membership | Keep OUT of `pnpm-workspace.yaml` |
| Why | Cloud Run deploy isolation + simpler hackathon backend |

---

## Testing Strategy

### Full-flow states

| State | Screen | Success condition |
|-------|--------|-------------------|
| `home` | `/app` | Student can call from person+moment card or typed topic |
| `clarifying` | `/app` | Vague topic → 3 inline person+moment cards → student picks |
| `previewing` | `/app` overlay | Preview card shows portrait, name, era, teaser |
| `calling` | `/session` | Calling screen → privacy voice → connected |
| `active` | `/session` | Audio, transcript, mute toggle, text input, choice cards |
| `ended` | `/summary` | Call log with key facts, character's message, next calls |
| `error` | `/session` | Reconnect / retry UI |

### Test layers

| Layer | What to test | Tool |
|-------|--------------|------|
| Browser state | Session status transitions, call log, reconnect | Vitest |
| Prompt logic | Character lock, probing, emotional boundaries | Vitest |
| Relay integration | WS upgrade, message forwarding, tool calls, timer | Vitest + `ws` |
| Manual critical path | Mic, speaker playback, choice cards, hang up | Browser + local dev server |

### Required coverage

| Area | Must verify |
|------|-------------|
| Protocol | `start`, `audio`, `audio_end`, `text`, `interrupted`, `speaker_switch`, `choices`, `ended`, `error` |
| Tool calling | `end_session` → redirect, `switch_speaker` → tag update, `announce_choice` → cards shown |
| Prompt quality | No narrator, no corpsing, emotional boundaries enforced, positive closing |
| Voice path | Mic streams PCM 16kHz, flushes on mute |
| Text path | Typed response gets same Gemini handling as voice |
| Audio output | PCM 24kHz playback queues, clears on interruption |
| Timer | Counts up, 9-min inject, 10-min force-close |
| Blocked callers | "This line is disconnected" + redirect to alternatives |
| Call log | `/summary` receives call data (deterministic for Phase 1) |

### Hackathon Implementation Phases

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 1** | Call metaphor pivot + tool calling | Done |
| **Phase 2** | Summary pipeline, Firestore, Clerk, share card | Done |

#### Remaining (stretch)

- [ ] **Returning visit warm-up** — Inject profile history into system prompt so character references past calls
- [ ] **Preset rotation** — Firestore pool of person+moment cards, rotate 3 per visit
- [ ] **Content safety blocklist** — Flash + server-side blocked callers

---

## Error States

| Failure | Behavior |
|---------|----------|
| Flash JSON fails | Show error, allow retry |
| Image model fails | Show placeholder image, call still works |
| Both fail | Fall back to preset scenario metadata |
| Blocked caller | "This number is not in service" + 3 alternatives |

---

## Mobile Responsiveness

| Aspect | Detail |
|--------|--------|
| Layout | Single column, portrait-first |
| Chat log | Scrollable, flex-1, auto-scroll to latest |
| Call controls | Bottom bar, thumb-reachable (iPhone call layout) |
| Virtual keyboard | Text input pushes content up |
| Touch targets | Minimum 44px |
| Hang up button | Centered, prominent, red |

---

## Origin: StudyBit

Pedagogy from `/Volumes/BIWIN/CODES/expo/apps/studybit/`:

| Concept | Detail |
|---------|--------|
| Derivable learning | Questions require reasoning, not memorization |
| Anchors | 2-3 contextual anchors per question |
| Research backing | Elaborative interrogation (+30-50%), generation effect (+40-60%), emotional encoding (+45-60%) |

---

## Environment Variables

| Var | Where | Purpose |
|-----|-------|---------|
| `GEMINI_API_KEY` | Cloud Run (secret) | Gemini Live API auth |
| `PUBLIC_BACKEND_WS_URL` | `.env.production` | `wss://past-live.ngoquochuy.com/ws` (prod) |
| `ALLOWED_ORIGIN` | Cloud Run env | `https://pastlive.site,https://past-live.ngoquochuy.com` |
| `GOOGLE_CLOUD_PROJECT` | Cloud Run env | Firestore project (`past-live-490122`) |
| `FIRESTORE_EMULATOR_HOST` | Server `.env` (dev only) | Local Firestore emulator |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env` + `wrangler.jsonc` | Clerk frontend auth |
| `CLERK_SECRET_KEY` | `.env` + `.dev.vars` | Clerk backend auth |
| `PUBLIC_POSTHOG_KEY` | `.env.production` | Analytics |

---

## Commands

```bash
pnpm dev --filter past-live                    # Frontend dev
pnpm build --filter past-live                  # Frontend build
cd apps/past-live && npx wrangler deploy       # Deploy frontend (CF Workers)

# Backend (apps/past-live/server/)
cd apps/past-live/server && ./deploy.sh        # Deploy backend (Cloud Run)

# Public repo extraction (excludes blog drafts, testing output, secrets)
bash apps/past-live/scripts/extract-public-repo.sh /tmp/past-live-public
cd /tmp/past-live-public && git push --force-with-lease origin main
```

---

## Gemini Live API — Known Issues (from research, 2026-03-15)

Research from GitHub issues, Google forums, and production case studies.

| Issue | GitHub | Severity | Our Mitigation |
|-------|--------|----------|----------------|
| Tool calling fragile with native audio | #843 (43+ reactions, open since May 2025) | HIGH | Removed googleSearch. Keep tools minimal. One tool per turn |
| WebSocket 1008 on connect | #1236 (intermittent) | HIGH | `connectWithRetry()` — 3 attempts, exponential backoff (1s/2s/4s) |
| Mid-sentence truncation | #2117 (40+ devs, 8 months) | HIGH | Detection only: log `possible_truncation` when gap < 500ms. 5s delay on end_session |
| Latency on >20s utterances | #1859 | MEDIUM | Prompt enforces short turns (2-3 sentences). VAD silence threshold 500ms |
| 15-min session limit variable | Google forums | LOW | Our 10-min hard max is safe. Compression enabled |
| Context window stale responses | #1633 | LOW | Single session per call. No multi-session agents |

**Key insight**: "unmistakably" keyword in system prompts is more effective than MUST/NEVER/ALWAYS (Google best practices).

---

## Research-Driven Architecture (2026-03-15)

Decisions made after researching production Gemini Live deployments and hackathon winners.

| Pattern | Implementation | Why |
|---------|---------------|-----|
| System prompt order | persona → rules → guardrails | Google best practices: order matters for voice |
| Single tool per turn | `BEHAVIORAL_RULES` + prompt guidance | Chaining tools triggers #843 crashes |
| Bounded audio queue | `AudioOutputQueue` (maxSize=10) | Every production system uses this. Backpressure safety |
| Zod schema validation | `schemas.ts` for PostCallSummary, PreviewMetadata, FlashResponse | Replaces 60+ LOC of manual validation. Pydantic equivalent |
| WebSocket retry | `connectWithRetry()` in gemini.ts | 1008 errors are transient. Auth errors (401/403) skip retry |
| Truncation detection | `lastAudioOutputMs` + `turnComplete` gap check | Can't fix #2117, but can detect + log for debugging |
| Audio chunk logging | First chunk per session measured | Browser sends 256ms chunks (6x over 20-40ms recommendation) |
| GoAway + session resumption | `sessionResumption: { handle }` | Reconnection when Gemini server sends GoAway. `transparent` field does NOT exist |

---

## Gotchas

| Issue | Fix |
|-------|-----|
| `@google/generative-ai` | DEPRECATED — use `@google/genai` |
| Voice can't switch mid-session | Pick one at connect. Affective dialog for tone shifts |
| Video burns 258 tokens/frame | `MEDIA_RESOLUTION_LOW`, frames only at input scan |
| Audio+video = 2 min limit | Audio-only calls (10 min max). NO mid-call video |
| `sendClientContent` vs `sendRealtimeInput` | `sendRealtimeInput` for new input. `sendClientContent` for history only |
| Response modality locked | TEXT or AUDIO per session. We use AUDIO |
| PCM rates differ | Input: 16kHz, Output: 24kHz |
| Affective dialog needs v1alpha | `httpOptions: { apiVersion: 'v1alpha' }` |
| `VITE_*` unavailable in Svelte islands | Pass as props from `.astro` parent |
| Firestore in Cloud Run | Application Default Credentials (no API key) |
| No narrator exists | Everything is the character. `switch_speaker` is multi-character only |
| System prompt too long | Characters monologue. Keep prompt SHORT — max 2-3 sentences per turn, phone call pacing |
| System prompt order | Persona FIRST, conversational rules MIDDLE, guardrails LAST (Google best practice) |
| googleSearch REMOVED | Was crashing sessions. Tool calling + native audio is fragile (#843) |
| One tool per turn | Stacking tools in same response causes crashes + confusion |
| Audio chunks FIXED (was too large) | 512 samples at 16kHz = 32ms. Was 1024 (64ms), originally 4096 (256ms). Google optimal: 20-40ms |
| Nothing in /tmp | ALL files (research, auditions, test pages) go in committed directories, never /tmp |
| Commit everything | ALL work must be visible in git history. Commit frequently. Nothing excluded |
| WHY in commits | Every commit must explain WHY. Include Huy's live testing feedback quotes verbatim |
| System prompt modular | Character voice (personality, humor, emotions) lives in `character-voice.ts` — shared by Live API + Flash summary |
| Interruption is non-negotiable | Student MUST be able to interrupt mid-speech. Audio queue clears on `interrupted` |
| `show_scene` image gen 12-15s on free tier | Queue-based throttling, not prompt or resolution. Paid tier expected 2-3s. See `docs/gemini-cost-estimation.md` |
| `sessionResumption` has no `transparent` field | Only `{ handle?: string }`. `transparent: true` crashes the connection |
| Gemini 1011 internal error | Server-side crash, not our code. May correlate with tool calling + native audio (#843). Log close code/reason for diagnosis |
| `generationConfig` doesn't exist | Use `config: { temperature: 0.7 }` not `generationConfig` in `@google/genai` SDK |
| VAD was INVERTED in code (fixed 2026-03-16) | Correct: `START_SENSITIVITY_LOW` + `END_SENSITIVITY_HIGH`. Code had it backwards |
| `ws.onclose` race condition | TCP close beats WebSocket messages. 500ms grace period before error escalation in browser |
| `suppressAudio()` in `clearAudioQueue()` | REMOVED — was permanently killing audio. Suppression only for barge-in |
| Audio suppression needs safety timeout | 3s auto-unsuppress fallback via `SUPPRESS_SAFETY_MS`. Without it, audio stays permanently muted |
| `inputAudioTranscription` is low quality | Gemini's built-in has NO config options. Web Speech API runs as parallel source for display |
| `show_scene` needs re-anchor nudge | Model won't call tools reliably. Nudge at turn 4+ if show_scene hasn't fired |
| Scene images: pre-generate ALL at preview | Don't wait for Live to call show_scene. Cache by `previewId → title → base64`. 0ms on cache hit |
| Secret Manager names lowercase-hyphens | `gemini-api-key` not `GEMINI_API_KEY`. `deploy.sh` uses correct names |
| Clerk appearance: shared constant | `src/lib/clerk-appearance.ts` — single source of truth, `appearance` prop on all Clerk components |
| Blog drafts NEVER in public repo | Gitignored via `docs/blog-post-*`. `scripts/extract-public-repo.sh` also excludes them |
| Cross-session memory wired (2026-03-16) | `relay.ts` calls `getProfile()` → passes `pastSessions` to `buildSystemPrompt()` |
| Topic broadening (2026-03-16) | `extract-topic` returns `{ topic_extracted, figures[3] }`. UI shows 3 figure cards for any topic |
| Svelte 5: `$` prefix reserved | Cannot import `$sessionId` directly in `.svelte`. Use alias: `import { $sessionId as sessionId } from ...` |
| Debug endpoint | `/api/debug/:sessionId` (full) and `/api/debug/:sessionId/summary` (condensed). Queries Cloud Logging. No auth needed |
| Session ID in summary URL | `/summary?session=SESSION_ID`. Agents construct debug URL from this |

---

## Project Documentation Index

| Doc | Path | Contents |
|-----|------|----------|
| **UX Details** | `design/ux-details.md` | Call metaphor, preview flow, in-call layout, emotional boundaries, choice cards, call log, content safety, preset rotation, auth |
| **Brand Voice** | `design/brand-voice.md` | 5 registers (Codex, Dispatch, Gilded Ruin, Midnight Theater, Glitch Cinema). Loading text, chat log format, error copy |
| **Persona Research** | `design/research/personas.md` | 6 student personas used for validation |
| **Council Verdict** | `design/research/council-verdict.md` | Persona council results and decision rationale |
| **Phase 1 Todos** | `todos/phase-1-feedback-fixes.md` | Feedback issues with full details, error states, batches |
| **Phase 2 Todos** | `todos/phase-2-judge-impressors.md` | Firestore, Gemini summary, share card, auth, preset rotation |
| **Demo Video** | `todos/demo-video.md` | Recording flow, pitch points, timing breakdown |
| **Asset Prompts** | `todos/asset-pipeline-prompts.md` | Scene image + character portrait prompt engineering |
| **Architecture** | `todos/architecture-diagram.md` | System diagram requirements |
| **README** | `todos/readme-spinup.md` | Spin-up instructions for judges |
| **Public Repo** | `todos/public-github-repo.md` | Strategy for extracting from monorepo |
| **GCP Proof** | `todos/gcp-deployment-proof.md` | Deployment proof options |
| **Text Description** | `todos/hackathon-text-description.md` | Submission text content |
| **Cost Estimation** | `docs/gemini-cost-estimation.md` | Per-session cost breakdown ($0.25/call), free vs paid tier, scale estimates |
| **Tool Calling Plan** | `~/.claude/plans/tool-calling-implementation.md` | Tool declarations, protocol changes, voice catalog, execution batches |

---

## Skills & Docs

| Skill | Purpose |
|-------|---------|
| `gemini-live-api-dev` | Live API patterns for JS/TS (installed at `.agents/skills/`) |
| `google-adk-typescript` | ADK agent patterns (installed at `.agents/skills/`) |
| `astroflare` | Astro + Cloudflare Workers |
| `svelte-code-writer` | Svelte 5 components |
| `web-haptics` | Haptic feedback on interactive elements |

| Doc | URL |
|-----|-----|
| Live API overview | `https://ai.google.dev/gemini-api/docs/live.md.txt` |
| Live API capabilities | `https://ai.google.dev/gemini-api/docs/live-guide.md.txt` |
| Live API tools | `https://ai.google.dev/gemini-api/docs/live-tools.md.txt` |
| Session management | `https://ai.google.dev/gemini-api/docs/live-session.md.txt` |
| Ephemeral tokens | `https://ai.google.dev/gemini-api/docs/ephemeral-tokens.md.txt` |
| WebSocket API ref | `https://ai.google.dev/api/live.md.txt` |
| JS SDK repo | `https://github.com/googleapis/js-genai` |
| Live API examples | `https://github.com/google-gemini/gemini-live-api-examples` |

---

## Hackathon Checklist

- [x] Public GitHub repo with README + spin-up instructions (`nqh-packages/past-live`)
- [x] Backend on Cloud Run (`past-live-backend-709469269798.us-central1.run.app`)
- [x] Architecture diagram (in server/README.md)
- [ ] Demo video < 4 min
- [ ] Text description (features, tech, findings)
- [x] Optional: blog post draft ready (V4, gitignored locally, publish to dev.to)
- [x] Optional: automated Cloud deployment (`server/deploy.sh` + `server/cloudbuild.yaml`)
- [ ] Optional: GDG profile link
