# Past, Live

Call the past. Students call historical figures to learn through conversation via Gemini Live API. Real-time voice. The student is the caller — they dial into the past, the character answers.

**Hackathon**: Gemini Live Agent Challenge | **Deadline**: March 16, 2026 @ 8:00pm EDT
**Category**: Live Agents (real-time voice + vision)

---

## Decisions Log

All decisions made by Huy during concept/research phase (2026-03-13, 2026-03-14). Do NOT re-ask.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Category | Live Agents | Real-time voice = strongest wow |
| Concept | Call the past — students phone historical figures | "Past, Live" = the line is open |
| Non 'Live' Model | `gemini-3-flash-preview` (code/JSON output) | Huy's explicit choice |
| Image Gen Model | `gemini-3.1-flash-image-preview` | Character portraits + color themes |
| Live API Model | `gemini-2.5-flash-native-audio-preview-12-2025` | Native audio, affective dialog, VAD |
| Voice | Flash picks per character from 30 voices | Each character gets a fitting voice. Locked at connect time |
| Camera | Input only (textbook scan). NO camera during calls | Persona council: 3/6 blocked on camera during sessions |
| Camera checkbox | REMOVED from preview card | No camera during calls = no checkbox needed |
| Text input | Hybrid: character speaks, student can speak OR type | 4/6 personas voice-blocked. Text always visible |
| Scoring | None — natural conversation | No gamification |
| Profile storage | Firestore (full schema) | Satisfies GCP requirement + personalization |
| Session structure | Natural conversation. 10 min hard max. 9 min wrap-up inject | Character leads, no rigid steps |
| Character breaking | No narrator. Everything is the character | No corpsing. No narrator voice. Multi-character via `switch_speaker` |
| Onboarding | Profile from Firestore. Character knows who's calling. Zero tutorials | First visit: character asks name conversationally |
| Post-call | Call log: who, duration, key facts, what happened after, character's message | Not "session complete" — it's a call receipt |
| Scenario selection | Person+moment cards on home screen. "Who do you want to call?" | Not event-focused dispatch cards |
| Topic clarification | Flash returns 3 people+moments for vague topics | Inline on /app, NOT in overlay |
| Tool calling | `end_session`, `switch_speaker`, `announce_choice`. All NON_BLOCKING | Model controls session flow |
| Explicit choices | Via `announce_choice` tool — tappable cards | Not just prompt instruction |
| Preview flow | Preview card → calling screen → connected (hybrid) | Brief card, then iPhone-style calling animation |
| Privacy voice | Automated "This call is live and not recorded" before character speaks | Robotic tone, clearly not the character |
| Share card | Call receipt with character's farewell message. Downloadable moment | 9:16 for Instagram stories |
| Timer | Counts UP (phone call style), not countdown | `00:04:32` — natural phone behavior |
| Tone | Character-driven. No blanket "humor mandatory" | Emperor under siege = intense. Inventor = playful |
| Emotional boundaries | Emotion serves learning, not attachment. NEVER extremes | See Emotional Boundaries section |
| Content safety | Blocked callers get "This line is disconnected" | Redirect to witnesses/resistors |
| Preset rotation | Large pool in Firestore, rotate 3 per visit. Cache portraits | User-generated cards join the pool |
| Frontend | Astro app in monorepo (`apps/past-live/`) | Standard pattern |
| Backend | Hono on Cloud Run | TS, lightweight, WebSocket support |
| Art | Flash → color theme, Gemini 3.1 → character portrait | Full-stack Google |
| Demo scenarios | Constantinople 1453, Moon Landing 1969, Mongol Empire 1206 | 3 diverse regions/eras |
| App name | **Past, Live** (slug: `past-live`) | Comma = pause. "Past, live." |
| Landing page | Hero + 3 feature bullets + CTA | Single page for judges + users |
| Home input | Multimodal: text + Web Speech API (voice) + Gemini Flash (image) | All 3 input modes |
| Hero copy | "The past is speaking. Are you?" | Align title, og:title, hero |
| Sentry | Disabled (guard DSN check) | Placeholder `__SENTRY_DSN__` throws errors |

---

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Astro 5 + Svelte 5 | Monorepo `apps/past-live/` |
| Backend | Hono (TS) on Cloud Run | `apps/past-live/server/` — WebSocket relay to Gemini |
| AI Voice | Gemini Live API (`gemini-2.5-flash-native-audio-preview-12-2025`) | Real-time voice + sparse vision |
| AI Image | `gemini-3.1-flash-image-preview` | Character portraits + color themes |
| Profile DB | Firestore | Student profiles, session history |
| Frontend Host | Cloudflare Workers | Standard monorepo deploy |
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

### Preset Voice Mapping

| Scenario | Voice | Why |
|----------|-------|-----|
| Constantinople (Constantine XI) | Gacrux (F, Mature) | Gravitas + dry wit of a doomed emperor |
| Moon Landing (Gene Kranz) | Charon (M, Informative) | Calm precision under pressure |
| Mongol Empire (Jamukha) | Algenib (M, Gravelly) | Weathered rival, dark wit |

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
| 5 | **[Phase 2]** Post-call summary | `gemini-3-flash-preview` | Transcript → key facts |

**Phase 1 total**: 3 non-Live calls + 1 Live session = 4 calls

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
  | { type: 'start'; scenarioId?: string; topic?: string; voiceName?: string; studentName?: string }
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
  | { type: 'ended'; reason: string };
```

| Rule | Detail |
|------|--------|
| `start` payload | Must include exactly ONE of `scenarioId` or `topic`. Optional `voiceName` |
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
| **Phase 1** | Feedback fixes + call metaphor pivot + tool calling | In progress |
| **Phase 2** | Judge-impressors | TODO |

#### Phase 2 TODO

- [ ] **Firestore profiles** — StudentProfile schema, name/age collection, session history
- [ ] **Post-call Gemini summary** — Send transcript to Flash, extract key facts
- [ ] **Returning visit warm-up** — Character references past calls
- [ ] **Student profile persistence** — Save learning patterns, personality to Firestore
- [ ] **Downloadable share card** — Character's farewell as 9:16 image. Download button outside card
- [ ] **Preset rotation** — Firestore pool of person+moment cards, rotate 3 per visit
- [ ] **Persistent avatar** — Top-right corner. Links to Clerk auth
- [ ] **Auth strategy** — Clerk auth, profile in Firestore. Anonymous-first, sign-up-later
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
| `GOOGLE_CLOUD_PROJECT` | Cloud Run | Firestore project |
| `PUBLIC_POSTHOG_KEY` | `.env.production` | Analytics |

---

## Commands

```bash
pnpm dev --filter past-live           # Frontend dev
pnpm build --filter past-live         # Frontend build
wrangler deploy                       # Deploy frontend

# Backend (apps/past-live/server/)
cd apps/past-live/server && gcloud run deploy past-live-backend --source . --region us-central1
```

---

## Gotchas

| Issue | Fix |
|-------|-----|
| `@google/generative-ai` | DEPRECATED — use `@google/genai` |
| Voice can't switch mid-session | Pick one at connect. Affective dialog for tone shifts |
| Video burns 258 tokens/frame | `MEDIA_RESOLUTION_LOW`, frames only at input scan |
| Audio+video = 2 min limit | Audio-only calls (10 min max), sparse video at input only |
| `sendClientContent` vs `sendRealtimeInput` | `sendRealtimeInput` for new input. `sendClientContent` for history only |
| Response modality locked | TEXT or AUDIO per session. We use AUDIO |
| PCM rates differ | Input: 16kHz, Output: 24kHz |
| Affective dialog needs v1alpha | `httpOptions: { apiVersion: 'v1alpha' }` |
| `VITE_*` unavailable in Svelte islands | Pass as props from `.astro` parent |
| Firestore in Cloud Run | Application Default Credentials (no API key) |
| No narrator exists | Everything is the character. `switch_speaker` is multi-character only |

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

- [ ] Public GitHub repo with README + spin-up instructions
- [ ] Backend on Cloud Run (proof recording)
- [ ] Architecture diagram
- [ ] Demo video < 4 min
- [ ] Text description (features, tech, findings)
- [ ] Optional: blog post with #GeminiLiveAgentChallenge
- [ ] Optional: automated Cloud deployment (Dockerfile + gcloud)
- [ ] Optional: GDG profile link
