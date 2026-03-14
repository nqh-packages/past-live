# Past, Live

History role-play tutor via Gemini Live API. Real-time voice conversation with historical characters. Camera opt-in only (demo for judges, skippable for users). Text input available alongside voice.

**Hackathon**: Gemini Live Agent Challenge | **Deadline**: March 16, 2026 @ 8:00pm EDT
**Category**: Live Agents (real-time voice + vision)

---

## Decisions Log

All decisions made by Huy during concept/research phase (2026-03-13). Do NOT re-ask.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Category | Live Agents | Real-time voice + vision = strongest wow |
| Concept | Historical role-play + expression reading | "Time Machine" — surroundings become the setting |
| Non 'Live' Model | `gemini-3-flash-preview` (code/JSON output) | Huy's explicit choice |
| Image Gen Model | `gemini-3.1-flash-image-preview` | Imagen replacement — character portraits + color themes |
| Live API Model | `gemini-2.5-flash-native-audio-preview-12-2025` | Native audio, affective dialog, VAD |
| Voice | Single voice (`Charon`) + affective dialog | Can't switch mid-session; tone modulation via prompt + affective |
| Camera in role-play | Demo-only: opt-in for judges, skippable for users | 6/6 personas rejected forced camera. Affective dialog replaces expression reading |
| Camera at input | Default ON — "show me what you're studying" | Voice + vision is the product |
| Text input | Hybrid: agent speaks, student can speak OR type | 4/6 personas voice-blocked. Text field always visible below subtitles |
| Scoring | None — pure story | Gamification IS the narrative |
| Profile storage | Firestore (full schema) | Satisfies GCP requirement + personalization depth |
| Session structure | Flexible natural ending (7-14 min, max 15) | Agent paces to engagement. Diego needs 7 min, Aisha gets 14 |
| Character breaking | NEVER break character. All probing in-role | 4/6 personas: teacher-mode = trust destroyed |
| Corpsing | Rare narrator break, max 1x/session, must be earned | **laugh**, silence, then back in narrator voice: "Even the storyteller didn't see that coming" |
| Onboarding | Instant scene — under 30 sec to action | Zero tutorials. Name collected conversationally by character |
| Post-session | Key facts + "what actually happened" + suggested next | 5/6 couldn't verify learning without summary |
| Scenario selection | Menu + input hybrid: 3 cards + open input | Judges see polished cards; students can explore any topic |
| Frontend | Astro app in monorepo (`apps/past-live/`) | Standard pattern |
| Backend | Hono on Cloud Run | TS, lightweight, WebSocket support |
| Art | Gemini → color theme, `gemini-3.1-flash-image-preview` → scene image + character avatar | Full-stack Google |
| Demo scenarios | Constantinople 1453, Moon Landing 1969, Mongol Empire 1206 | 3 diverse regions/eras |
| Warm-up | Agent-generated from previous session; first visit: name + age | Cannot skip — continuous data collection |
| App name | **Past, Live** (slug: `past-live`) | Comma = pause. Reads as command: "Past, live." |
| Naming style | "Past" (muted/serif) + "Live" (bright/bold) | Visual contrast |

### Feedback Decisions (2026-03-13 — David + Huy testing session)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Mic mode | Auto-activate on session entry, mute/unmute toggle | Hackathon: "talk naturally, can be interrupted" — hold-to-talk is unintuitive on web |
| Mic permission | Auto-activate from [ENTER SESSION] gesture; re-prompt if blocked; text-only fallback | Browser requires user gesture for getUserMedia |
| Mic checkbox | "auto-activate mic" — pre-checked ☑; controls whether mic starts ON. Uncheck = mic starts muted (NOT disabled — user can unmute anytime) | Voice is PRIMARY; checkbox controls initial state only |
| Camera checkbox | Pre-checked ☑; controls whether video is IN or NOT IN the session. Unchecked = video completely off (not just muted) | Camera is opt-in for the session |
| Speaking indicator | Audio waveform animation (CSS bars) | David: no visual feedback when model speaks |
| Chat log | Character-named: `> [CHARACTER_NAME]` or `> [NARRATOR]` / `> [YOU]` prefixes. NOT hardcoded "DISPATCH" | Huy: transcriptions pile up as one paragraph |
| Countdown | Dispatch-themed client-side overlay: STANDBY → CHANNEL OPEN → INCOMING TRANSMISSION | Huy: missing countdown that prepares mental model |
| Model speaks first | Model narrates scene setting after countdown; mic already live | Huy: default screen showed "listening" with no guidance |
| System prompt tone | Accessible period-flavored. A/B testing killed — ship variant B only | Huy: language too academic for target audience |
| Explicit choices | System prompt MUST instruct model to present 2-3 concrete choices at every decision point. Global rule + per-scenario examples | Huy: "I don't get what I need to do" — open questions leave user stranded |
| Tool calling | Gemini Live function declarations: `end_session`, `switch_speaker`, `announce_choice`. Model controls session flow | Research confirmed: Live API supports tools. Solves session ending + narrator/character tagging + choice UI |
| Voice selection | Flash JSON picks `voiceName` from 30 available voices per character/era. Relay passes to `connect()` | Each era deserves its own voice. Voice locked at connect time |
| Session preview | Overlay on home screen. Flash JSON first → then scene image + avatar in parallel (sequential, not 3-way parallel) | Avatar prompt needs `characterName` from Flash result |
| Preview edit | User can modify topic + add notes; original input preserved; Flash regenerates | Example: student scans Vietnam 1975, model assumes tank gate, student wants lead-up events |
| Preset scenarios | Always show preview overlay (pre-filled from scenario metadata) | Consistent flow |
| Landing page | Hero + 3 feature bullets + CTA (single page for judges + users) | Research: don't separate audiences |
| Home input | Multimodal: text + Web Speech API (voice) + Gemini Flash (image) | Non-negotiable: all 3 input modes |
| Hero copy | "The past is speaking. Are you?" | Align title, og:title, and hero text |
| Sentry | Disabled (guard DSN check) | Placeholder `__SENTRY_DSN__` throws errors |
| Home mic button | Wire it (Web Speech API + camera) | Dead button = critical UX bug |

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
| Domain | `pastlive.site` (primary, **NOT YET REGISTERED**) + `past-live.ngoquochuy.com` (subdomain) | Porkbun account needs phone/email verification first |
| Registrar | Porkbun → Cloudflare NS | DNS via Cloudflare once registered |
| Monitoring | Sentry | Error tracking |

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

```typescript
const session = await ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  config: {
    responseModalities: ['audio'], // TEXT or AUDIO per session, never both
    systemInstruction: { parts: [{ text: 'You are a history tutor.' }] },
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } // Informative
    },
    enableAffectiveDialog: true,
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    mediaResolution: 'MEDIA_RESOLUTION_LOW', // only matters when video frames are sent
    automaticActivityDetection: {
      startOfSpeechSensitivity: 'START_SENSITIVITY_LOW',
      endOfSpeechSensitivity: 'END_SENSITIVITY_LOW',
      prefixPaddingMs: 20,
      silenceDurationMs: 100,
    },
    contextWindowCompression: { slidingWindow: {} }, // Longer sessions
  },
  callbacks: {
    onmessage: (response) => {
      const content = response.serverContent;
      if (content?.modelTurn?.parts) {
        for (const part of content.modelTurn.parts)
          if (part.inlineData) { /* PCM 24kHz audio base64 */ }
      }
      if (content?.inputTranscription) { /* student said */ }
      if (content?.outputTranscription) { /* agent said */ }
      if (content?.interrupted) { /* stop playback, clear queue */ }
    },
    onerror: (error) => {},
    onclose: () => {},
  }
});
```

### Tool Calling (Function Declarations)

Gemini Live supports function calling during live audio sessions. Model emits `toolCall` messages; relay responds with `sendToolResponse()`.

```typescript
import { Behavior, FunctionResponseScheduling } from '@google/genai';

const tools = [{
  functionDeclarations: [
    { name: 'end_session', description: 'Story concluded. Triggers redirect to /summary.', parameters: { type: 'object', properties: { reason: { type: 'string', description: 'Why the session ended (story_complete, timeout, user_request)' } }, required: ['reason'] } },
    { name: 'switch_speaker', description: 'Switch chat log tag between narrator and character.', parameters: { type: 'object', properties: { speaker: { type: 'string', enum: ['narrator', 'character'], description: 'Who is speaking now' } }, required: ['speaker'] } },
    { name: 'announce_choice', description: 'Present 2-3 choices for the student to pick.', parameters: { type: 'object', properties: { choices: { type: 'array', items: { type: 'string' }, description: 'The concrete options for the student' } }, required: ['choices'] } },
  ]
}];

// In session config:
config: { tools, ... }

// In onmessage callback:
if (msg.toolCall) {
  const responses = msg.toolCall.functionCalls.map(fc => {
    if (fc.name === 'end_session') { /* send 'ended' to browser, close Gemini */ }
    if (fc.name === 'switch_speaker') { /* forward to browser, update $characterName or NARRATOR */ }
    if (fc.name === 'announce_choice') { /* forward choices to browser, show choice cards */ }
    return { id: fc.id, name: fc.name, response: { result: 'ok' } };
  });
  session.sendToolResponse({ functionResponses: responses });
}
```

| Tool | Purpose | Relay action |
|------|---------|-------------|
| `end_session` | Model decides story is done | Relay sends `{ type: 'ended' }` → browser redirects to `/summary` |
| `switch_speaker` | Narrator ↔ character tag in chat log | Relay sends `{ type: 'speaker_switch', speaker }` → frontend updates `$characterName` |
| `announce_choice` | Present concrete choices to student | Relay sends `{ type: 'choices', choices }` → frontend shows choice cards |

**Behavior**: `NON_BLOCKING` — model keeps speaking while tool runs.
**Scheduling**: `WHEN_IDLE` — Gemini acts on tool response after current speech finishes.

### Voice Auto-Selection

Flash JSON now returns `voiceName` alongside other metadata. Relay uses it at `ai.live.connect()`.

| Voice | Tone | | Voice | Tone | | Voice | Tone |
|-------|------|-|-------|------|-|-------|------|
| Zephyr | Bright | | Kore | Firm | | Charon | Informative |
| Fenrir | Excitable | | Leda | Youthful | | Orus | Firm |
| Aoede | Breezy | | Callirrhoe | Easy-going | | Autonoe | Bright |
| Enceladus | Breathy | | Iapetus | Clear | | Umbriel | Easy-going |
| Algieba | Smooth | | Despina | Smooth | | Erinome | Clear |
| Algenib | Gravelly | | Rasalgethi | Informative | | Laomedeia | Upbeat |
| Achernar | Soft | | Alnilam | Firm | | Schedar | Even |
| Gacrux | Mature | | Pulcherrima | Forward | | Achird | Friendly |
| Zubenelgenubi | Casual | | Vindemiatrix | Gentle | | Sadachbia | Lively |
| Sadaltager | Knowledgeable | | Sulafat | Warm | | Puck | Upbeat |

**Voice is locked at connect time** — cannot switch mid-session. Flash picks the best voice for the character/era.

### Sending Input

```typescript
session.sendRealtimeInput({ audio: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
session.sendRealtimeInput({ video: { data: base64, mimeType: 'image/jpeg' } });
session.sendRealtimeInput({ text: 'Hello' });
// sendClientContent → ONLY for history injection, NOT new messages
```

### Audio Formats

| Direction | Format | Rate |
|-----------|--------|------|
| Input (mic) | PCM 16-bit LE mono | 16kHz |
| Output (speaker) | PCM 16-bit LE mono | 24kHz |

### Session Limits

| Mode | Duration | Notes |
|------|----------|-------|
| Audio only | **15 min** | Our primary mode |
| Audio + video | **~2 min** | Only at input scan + climax burst |
| With compression | Unlimited | Quality degrades over time |

### Token Costs

| Input | Cost |
|-------|------|
| Video frame (<=384px) | 258 tokens |
| Audio | 32 tokens/sec |
| Text | ~1 token/4 chars |

At 1fps video + audio: ~290 tokens/sec → 128k / 290 ≈ 7 min max.

### VAD Config

```typescript
automaticActivityDetection: {
  startOfSpeechSensitivity: 'START_SENSITIVITY_LOW',
  endOfSpeechSensitivity: 'END_SENSITIVITY_LOW',
  prefixPaddingMs: 20,
  silenceDurationMs: 100,
}
```

### Session Resumption

```typescript
config: { sessionResumption: { handle: previousSessionHandle } }
// Tokens valid 2hrs after disconnect
// Server sends GoAway before killing (includes timeLeft)
// Use audioStreamEnd when mic paused to flush cached audio
```

### `gemini.ts` implementation defaults

| Setting | Value | Notes |
|---------|-------|-------|
| Voice | `Charon` | Fixed at connect time |
| VAD | LOW / LOW, `20ms` padding, `100ms` silence | Match hold-to-speak UX |
| Compression | `contextWindowCompression: { slidingWindow: {} }` | Longer sessions |
| Transcriptions | Enable input + output | Required for subtitle UI |
| Media resolution | `MEDIA_RESOLUTION_LOW` | Use when sparse video is enabled |
| Mic release | `audio_end` → `audioStreamEnd` | Flush cached audio on button release |

### Rules

| Rule | Detail |
|------|--------|
| `sendRealtimeInput` | ALL real-time input (audio, video, text) |
| `sendClientContent` | ONLY history injection |
| `media` key | Do NOT use — use `audio`, `video`, `text` separately |
| Response modality | Locked per session: TEXT or AUDIO |
| Native audio | Generates speech directly (not text→TTS) — natural, emotional, low-latency |
| Voice switching | IMPOSSIBLE mid-session. Must close + reconnect |
| `MEDIA_RESOLUTION_LOW` | Fewer tokens per frame — use for sparse video |

### 30 Voices (picked ONCE at session start)

Selected: **Charon** (Informative). Other notable options: Fenrir (Excitable), Kore (Firm), Puck (Upbeat), Enceladus (Breathy), Leda (Youthful), Sulafat (Warm), Gacrux (Mature).

---

## Architecture

```
Browser (Astro/Svelte)              Cloud Run (Hono/TS)
┌─────────────────────┐            ┌──────────────────────┐
│ Camera (getUserMedia)│            │ @google/genai         │
│ Mic (getUserMedia)   │──WebSocket─│ ai.live.connect()    │
│ Audio playback       │            │ Session state         │
│ UI (subtitles, art)  │◄─WebSocket─│ Scenario prompts     │
│                      │            │ Profile read/write    │
│ Deploy: Cloudflare   │            │                      │
└─────────────────────┘            └──────────┬───────────┘
                                              │ WebSocket
                                   ┌──────────▼───────────┐
                                   │ Gemini Live API       │
                                   └──────────────────────┘
                                   ┌──────────────────────┐
                                   │ Firestore (profiles)  │
                                   │ Gemini 3.1 (portraits)  │
                                   └──────────────────────┘
```

---

## API Calls Per Session

### Asset Pipeline

- Scene image: Gemini 3.1 Image (immersive scene art)
- Character avatar: Gemini 3.1 Image (character portrait)
- DROPPED: background texture (colors from JSON are enough)
- DROPPED: scenario card thumbnail

### Non-Live API Calls

| # | Call | Model | Purpose |
|---|------|-------|---------|
| 1 | Session preview JSON | `gemini-3-flash-preview` | Structured output: role, setting, stakes, colors, characterName |
| 2 | Scene image | `gemini-3.1-flash-image-preview` | Era-specific scene art (can potentially combine with #3) |
| 3 | Character avatar | `gemini-3.1-flash-image-preview` | Character portrait for session UI |
| 4 | Voice conversation | `gemini-2.5-flash-native-audio-preview-12-2025` | Live API session (real-time voice) |
| 5 | **[Phase 2]** Post-session summary | `gemini-3-flash-preview` | Transcript extraction → key facts |

**Phase 1 total**: 3 non-Live calls (preview JSON + scene image + character avatar) + 1 Live session = 4 calls
**Phase 2 total**: 4 non-Live calls (add post-session summary) + 1 Live session = 5 calls

---

## Game Flow

| Step | Action | Mode |
|------|--------|------|
| 0 | **Warm-up** — First visit: name + age → Firestore. Returning: agent-generated question from last session | Pre-session |
| 1 | **Input** — Student provides topic via text, voice (Web Speech API), or image (camera → Gemini Flash). Multimodal | Home screen |
| 1b | **Session Preview** — Flash JSON first (role/setting/stakes/colors/characterName/voiceName), then scene image + avatar in parallel. Overlay on home screen. Preview card inherits story palette. User reviews, can EDIT or ACCEPT | Home overlay |
| 1c | **Input Checkboxes** — ☑ "auto-activate mic" (pre-checked, controls whether mic starts ON) + ☑ "enable camera" (pre-checked, controls whether video is IN or NOT IN the session; unchecked = video completely off, not just muted). Voice is PRIMARY interaction | Home overlay |
| 2 | **Enter Session** — User clicks [ENTER SESSION]. Client-side countdown overlay: STANDBY → CHANNEL OPEN → INCOMING TRANSMISSION. Meanwhile: Gemini Live API connects in background. Mic auto-activates (if checkbox checked) | Client-side + WS connect |
| 3 | **Scene Setting** — Model speaks first. Agent narrates scenario in character voice. Mic already live — student can respond, interrupt, or revise | Live API, audio-only |
| 4 | **Story** — Agent plays character(s) with affective dialog. Encourages acting but accepts calm reasoning | Audio-only |
| 5 | **Drama twist** — Planned from scenario start. NEVER sensitive content | Audio-only |
| 6 | **Student responds** | Audio-only |
| 7 | **Probing** (if student can't demonstrate historical reasoning) — probe → hint → rephrase → progress story. Max 3 | Audio-only |
| 8a | **Pass** → Funny story resolution from correct answer | Audio-only |
| 8b | **Fail** → Funny hypothetical from wrong/no answer | Audio-only |
| 9 | **Positive insight** about student. Save to profile: learning patterns, personality, topic history, next warm-up | Post-session |

### Camera: Demo-Only (Persona Council Decision)

Camera OFF during role-play by default. At ONE climactic moment, agent offers opt-in:
- Prompt: "Want to try something?" + clear **Skip** button
- If accepted: 3-sec burst, agent reacts, done. No photo stored
- If skipped: Agent uses affective dialog: "You sound nervous, advisor! Constantinople needs confidence!"
- Never guilt-trip skipping. "Fair enough — I'll imagine your brave face. It's magnificent."
- **Demo video for judges** shows the camera moment working once

### Voice + Text Input (Hybrid Mode)

Agent ALWAYS speaks via voice. Student can respond via **voice OR text**.
- Mic auto-activates on session entry (mute/unmute toggle, spacebar shortcut when NOT focused on text input)
- Text input field below chat log (always visible)
- Text uses `session.sendRealtimeInput({ text: '...' })` — same API
- Mic stays streaming while model speaks → user can interrupt naturally (VAD detects speech)
- Spacebar toggles mic mute/unmute ONLY when `document.activeElement` is NOT the text input. If focused on text input, spacebar types normally. Can also click mic button to toggle
- No `sendAudioEnd` on pauses — only when user explicitly mutes mic

### Probing System (Step 8) — ALL IN-CHARACTER

1. **Probe** — "If he's still hangry, he might not promote your father to..."
2. **Hint** — Rephrase with more context
3. **Progress story** — Move narrative toward answer so student can answer with common sense
4. Max 3 probes → graceful fail (step 9b with humor)

Effective probing method saved to profile for future sessions.

### Corpsing Rule (Max 1x Per Session)

When student says something genuinely unexpected, narrator can briefly break:
- "...even the storyteller didn't see that coming."
- Then immediately back in character. Must be EARNED. Not for every joke.

### Voice Personality (Prompt Engineering)

| Mode | Instruction |
|------|-------------|
| Narrator | Slower, descriptive, setting the scene |
| Character | In-character, emotional, reactive |
| Probing | Encouraging, patient, guiding |
| Celebration | Excited, genuine praise |

Affective dialog handles emotional modulation; prompt handles role shifts.

### Scenario prompt requirements (`scenarios.ts`)

| Requirement | Detail |
|-------------|--------|
| Never break character | No teacher-mode language. All correction/probing stays in role |
| Probing ladder | Probe → hint → rephrase → progress story |
| Corpsing | Max 1x per session, only if earned, then immediately back in role |
| Session pacing | Open fast, escalate clearly, wrap naturally by ~14 min |
| Positive insight | End with an in-character positive observation about the student |
| Twist | Seed conflict early so step 6 feels inevitable, not random |
| Tone flexibility | Reward theatrical play, but also accept calm/logical answers |

`scenarios.ts` is the demo-critical file. The relay only carries the experience; the prompt creates it.

---

## Two Palette System

| Palette | Name | Purpose | When applied |
|---------|------|---------|-------------|
| **System** | Default CSS tokens | App chrome: nav, logo, inputs, home page | Always — `global.css` `@theme {}` |
| **Story** | Generated by Gemini Flash | Era atmosphere: session page, preview card | Per-session — inline CSS vars from OKLCH |

**Rule**: Brand accent (red) stays fixed on the Past, Live logo. Everything else in session/preview inherits the story palette.

### Story Palette OKLCH Constraints (enforced in Flash prompt)

| Index | Role | Lightness | Example |
|-------|------|-----------|---------|
| 0 | Background | 8-15% | Very dark era tone |
| 1 | Surface | 12-20% | Dark panel/card |
| 2 | Accent | 55-75% | Vibrant era color |
| 3 | Foreground | 85-95% | Readable text |
| 4 | Muted | 30-45% | Subtle/secondary |

**Guarantees**: 7:1+ contrast between foreground (3) and background (0). Preview card + session page both apply story palette via CSS custom properties.

---

## UI Layout (Audio-Only Story)

```
┌─────────────────────────────┐
│  [blurred color theme bg]   │
│  > session active            │
│  > constantinople 1453       │
│  ┌───────────────────────┐  │
│  │  Character Portrait   │  │
│  │  (Gemini-generated)   │  │
│  └───────────────────────┘  │
│  ▁▃▅▇▅▃▁  (waveform)       │
│  ┌───────────────────────┐  │
│  │  > [CONSTANTINE XI]   │  │
│  │    The harbor chain.. │  │
│  │  > [YOU] Should we    │  │
│  │    close the harbor?  │  │
│  └───────────────────────┘  │
│  click mic to mute · type   │
│  ┌──────────────────┐       │
│  │ 🎙️ channel open  │       │
│  └──────────────────┘       │
│  ┌───────────────────────┐  │
│  │ type your orders...   │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

| Element | Source |
|---------|--------|
| Color theme | Gemini Flash → 5 OKLCH colors override ALL session CSS custom props (background, surface, accent, foreground, muted). Brand logo color stays fixed. Full era-specific atmosphere. |
| Scene image | Gemini 3.1 Image (from session preview). NOT a portrait — immersive scene art that sets tone/mood. Responsive size. Era-specific art style (Byzantine mosaic, NASA photo, Mongolian ink wash). Different prompt per era — see `server/src/image-prompts.ts` |
| Waveform | CSS animation, driven by `$isSpeaking` audio playback state |
| Chat log | Three sender tags: `> [CHARACTER_NAME]` (from preview JSON), `> [NARRATOR]` (corpsing only — detect via "even the storyteller" keyword), `> [YOU]` or `> [USER_NAME]` (default "YOU", use student name from Firestore/storage when available). Auto-scroll |
| Hint bar | "click mic to mute · or type below" (persistent, subtle) |
| Mic button | Mute/unmute toggle (auto-active, spacebar shortcut) |
| Text input | Always visible, sends via `sendRealtimeInput({ text })` |

### Session Preview Overlay (Home Screen)

```
┌───────────────────────────────┐
│  > SESSION BRIEFING            │
│  ┌─────────────┐              │
│  │  [Portrait]  │              │
│  │  generated   │              │
│  └─────────────┘              │
│  You are: Emperor's advisor   │
│  Setting: Constantinople 1453 │
│  Stakes: The walls are        │
│    falling. Mehmed's army     │
│    surrounds the city.        │
│                               │
│  ☑ Auto-activate mic           │
│  ☑ Enable camera               │
│                               │
│  [EDIT]    [ENTER SESSION]    │
└───────────────────────────────┘
```

### Session Preview Loading

Simple spinner + fun loading text in brand voice (uses shared Loading Text Component). Overlay appears fully populated when all Gemini calls complete.

### Countdown Overlay (Session Page)

3 seconds total. Plays fully regardless of connection speed — it's a mental-model builder, not a progress bar.

```
> STANDBY...           (1s)
> CHANNEL OPEN...      (1s)
> INCOMING TRANSMISSION... (1s)
→ Session active, model speaks first
```

| Scenario | Behavior |
|----------|----------|
| Connection faster than countdown | Countdown still plays fully. Session starts after countdown |
| Connection slower than countdown | After countdown, show brand-voice fun loading messages (same rotating text component as preview loading) until ready |

Countdown runs while Gemini Live API connects in background. Mic + camera activate during countdown (from ENTER SESSION gesture).

### Loading Text Component (DRY — Shared)

Same rotating fun text component used for BOTH preview loading AND connection wait. Single source of truth.

| Usage | When |
|-------|------|
| Session preview loading | While Flash generates JSON + images |
| Connection wait | If WS connection slower than countdown |

Examples: "> wiring up the time machine...", "> dusting off the history books...", "> recruiting your character..."

---

## Demo Scenarios

| Scenario | Era | Role | Twist |
|----------|-----|------|-------|
| Fall of Constantinople | 1453 | Emperor's advisor | Mehmed drags ships overland — harbor defense failed |
| Moon Landing | 1969 | NASA mission control | Fuel warning — 25 sec to decide: abort or land |
| Mongol Empire | 1206 | Khan's rival | Alliance or war — tribe survival at stake |

### What each scenario prompt must contain

| Section | Purpose |
|---------|---------|
| Role + stakes | Tell Gemini who it is, who the student is, and what failure costs |
| Opening beat | Reach scene-setting fast, under 30 sec to action |
| Historical anchors | 2-3 facts the student can reason from |
| Twist handling | Define the crisis turn and how to escalate it |
| Probe behavior | Keep nudging in-character without sounding like a tutor |
| Ending logic | Resolve to pass/fail gracefully and land step 10 insight |

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
    expressionReactivity: 'performative' | 'reserved' | 'shy';
  };
  personality: {
    traits: string[];           // "quick thinker", "empathetic", "strategic"
    humorStyle: string;         // "dry", "playful", "slapstick"
    confidenceLevel: 'bold' | 'moderate' | 'cautious';
  };
  sessions: {
    scenarioId: string;
    date: Timestamp;
    outcome: 'pass' | 'probed' | 'fail';
    probesUsed: number;
    topicsCovered: string[];
    agentInsight: string;       // Positive observation from step 10
  }[];
  nextWarmUp: {
    question: string;
    context: string;            // Why this question was chosen
  };
}
```

---

## Backend Relay Contract (Hackathon Slice)

### Browser → backend

```typescript
type ClientMessage =
  | { type: 'start'; scenarioId?: string; topic?: string; studentName?: string }
  | { type: 'audio'; data: string; mimeType: 'audio/pcm;rate=16000' }
  | { type: 'audio_end' } // relay sends Gemini audioStreamEnd
  | { type: 'text'; text: string }
  | { type: 'video'; data: string; mimeType: 'image/jpeg' };
```

### Backend → browser

```typescript
type ServerMessage =
  | { type: 'connected'; sessionId: string }
  | { type: 'audio'; data: string }
  | { type: 'input_transcription'; text: string }
  | { type: 'output_transcription'; text: string }
  | { type: 'interrupted' }
  | { type: 'error'; message: string }
  | { type: 'ended'; reason: string };
```

| Rule | Detail |
|------|--------|
| `start` payload | Must include exactly ONE of `scenarioId` or `topic` |
| Scenario cards | Use `scenarioId` |
| Freeform study input | Use `topic` |
| Subtitle event name | Standardize on `output_transcription` |
| Hold-to-speak release | Browser sends `audio_end`; relay maps to Gemini `audioStreamEnd` |

---

## Backend Packaging

| Decision | Value |
|----------|-------|
| Location | `apps/past-live/server/` |
| Package management | Own `package.json` + local `node_modules` |
| Workspace membership | Keep OUT of `pnpm-workspace.yaml` |
| Why | Cloud Run deploy isolation + simpler hackathon backend |

---

## Testing Strategy (Hackathon Slice)

### Full-flow states to cover

| State | Screen | Success condition |
|-------|--------|-------------------|
| `home` | `/` | User can start from scenario card or typed topic |
| `connecting` | `/session` | Browser opens WS and sends `start` |
| `active` | `/session` | Audio, subtitles, mic, text input all work |
| `camera_opt_in` | `/session` | Accept and skip paths both preserve flow |
| `ended` | `/summary` | Browser routes after `{ type: 'ended' }` |
| `error` | `/session` | Browser shows reconnect / retry UI |

### Test layers

| Layer | What to test | Tool |
|-------|--------------|------|
| Browser state | Session status transitions, summary artifact, reconnect state | Vitest |
| Prompt logic | Scenario prompt depth and rules | Vitest |
| Relay integration | WS upgrade, message forwarding, cleanup, interruption | Vitest + `ws` |
| Manual critical path | Mic, speaker playback, camera opt-in, reconnect UX | Browser + local dev server |

### Required coverage

| Area | Must verify |
|------|-------------|
| Protocol | `start`, `audio`, `audio_end`, `text`, `video`, `interrupted`, `ended`, `error` |
| Prompt quality | Character lock, probing ladder, corpsing limit, pacing, positive ending |
| Voice path | Hold-to-speak streams PCM 16kHz and flushes on release |
| Text path | Typed response gets the same Gemini turn handling as voice |
| Audio output | PCM 24kHz playback queues and clears on interruption |
| Summary handoff | `/summary` receives deterministic session artifact |
| Error handling | Socket close / server error moves UI into retry state |

### Summary MVP

| Field | Source |
|-------|--------|
| Scenario title / role | Selected scenario metadata |
| Duration | Browser session timer |
| Key facts | Deterministic scenario facts |
| What actually happened | Deterministic scenario outcome copy |
| Your call | Last meaningful student transcript / text input |
| Next briefings | Static related scenarios |

### Hackathon Implementation Phases

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 1** | Feedback fixes (13 issues from David/Huy testing) — makes demo workable | In progress |
| **Phase 2** | Judge-impressors — makes demo impressive | TODO |

#### Phase 2 TODO (after Phase 1 ships)

- [ ] **Firestore profiles** — StudentProfile schema, name/age collection, session history, learning patterns
- [ ] **Post-session Gemini summary** — Send transcript to Flash, extract real key facts (replace deterministic summary)
- [ ] **Camera demo moment** — Climax opt-in (Step 5 twist), 3-sec burst, agent reacts. For demo video
- [ ] **Returning visit warm-up** — Agent-generated question from last session
- [ ] **Student profile persistence** — Save learning patterns, personality, effective probes to Firestore
- [ ] **Social sharing card** — After session, generate a funny summary card (downloadable/screenshottable for Instagram). Download button OUTSIDE the card. If user has a photo saved, generate face variation wearing character's outfit (head swap). Example: "If you were Khan, the Mongolian Empire would have been gone 100 years earlier than it did"
- [ ] **Persistent avatar** — Top-right corner of app. Links to Clerk auth. Saves progress to Firestore
- [ ] **Auth strategy** — Clerk auth, profile data in Firestore. Anonymous-first, sign-up-later pattern. Welcome signups, save profiles. DO NOT force registration to use the app
- [ ] **Clerk + Firestore** — Auth via Clerk, profile data in Firestore (not Convex)

---

## Session Timer

Hidden until 5 minutes remaining. Dispatch format: `> 4:32 remaining`. At `> 2:00 remaining` turns accent color + pulses. Agent wraps up by ~14 min via prompt pacing.

---

## Error States for Preview

| Failure | Behavior |
|---------|----------|
| Flash JSON fails | Show error, allow retry |
| Image model fails | Show placeholder image, session still works |
| Both fail | Fall back to preset scenario metadata |

---

## Mobile Responsiveness

Portrait responsive layout for session page:
- Chat log scrollable
- Mic/text accessible with virtual keyboard open
- All controls reachable in portrait mode

---

## LLM Dogfooding / Testing Strategy

Claude is used to dogfood the app but cannot process audio directly.

| Strategy | Purpose |
|----------|---------|
| Mode 1: Verbose event logs | Structured console/server logs for every event: WS messages, state transitions, audio start/stop, transcriptions, errors. Always-on in dev, off in prod |
| Mode 2: Text-only test endpoint | `POST /test-session` — runs full Gemini Live session in TEXT mode (no audio). Claude calls directly via curl/WebFetch. Returns structured JSON transcript |
| Mode 3: Structured test output | Post-session JSON report: all messages with timestamps, state transitions, prompt variant, duration, error count. For automated A/B analysis |

---

## PostHog Setup

PostHog component exists but needs configuration. Add as prerequisite task before launch.

---

## Demo Video

Submission requirement: demo video < 4 min. Plan recording flow before deadline.

---

## Submission Deliverables

Each gets its own todo file:

| Deliverable | Status |
|-------------|--------|
| README with spin-up instructions | TODO |
| Public GitHub repo strategy (currently in monorepo) | TODO |
| GCP deployment proof (screen recording) | TODO |
| Hackathon text description | TODO |
| Architecture diagram | TODO |
| Demo video (< 4 min) | TODO |

---

## Origin: StudyBit

Pedagogy from `/Volumes/BIWIN/CODES/expo/apps/studybit/`:

| Concept | Detail |
|---------|--------|
| Derivable learning | Questions require reasoning, not memorization |
| Anchors | 2-3 contextual anchors per question for deriving answers |
| Framings | Role-play + timeline framings (`studybit/framings/`) |
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
| Video burns 258 tokens/frame | `MEDIA_RESOLUTION_LOW`, frames only at climax |
| Audio+video = 2 min limit | Audio-only role-play (15 min), sparse video at key moments |
| `sendClientContent` vs `sendRealtimeInput` | `sendRealtimeInput` for new input. `sendClientContent` for history only |
| Response modality locked | TEXT or AUDIO per session. We use AUDIO |
| PCM rates differ | Input: 16kHz, Output: 24kHz |
| Affective dialog needs v1alpha | `httpOptions: { apiVersion: 'v1alpha' }` |
| `VITE_*` unavailable in Svelte islands | Pass as props from `.astro` parent |
| Firestore in Cloud Run | Application Default Credentials (no API key) |

---

## Project Documentation Index

| Doc | Path | Contents |
|-----|------|----------|
| **UX Details** | `design/ux-details.md` | All UX decisions, mockups, persona quotes, scope. 15 sections covering camera, input, auth, mobile, social, timer |
| **Brand Voice** | `design/brand-voice.md` | 5 registers (Codex, Dispatch, Gilded Ruin, Midnight Theater, Glitch Cinema). Loading text, chat log format, error copy |
| **Persona Research** | `design/research/personas.md` | 6 student personas used for validation |
| **Council Verdict** | `design/research/council-verdict.md` | Persona council results and decision rationale |
| **Phase 1 Todos** | `todos/phase-1-feedback-fixes.md` | 15 feedback issues with full details, error states, batches |
| **Phase 2 Todos** | `todos/phase-2-judge-impressors.md` | 9 items: Firestore, Gemini summary, camera demo, social card, auth, dogfooding |
| **Demo Video** | `todos/demo-video.md` | Recording flow, pitch points, timing breakdown |
| **Asset Prompts** | `todos/asset-pipeline-prompts.md` | Scene image + character avatar prompt engineering (needs brainstorming) |
| **Architecture** | `todos/architecture-diagram.md` | System diagram requirements |
| **README** | `todos/readme-spinup.md` | Spin-up instructions for judges |
| **Public Repo** | `todos/public-github-repo.md` | Strategy for extracting from monorepo |
| **GCP Proof** | `todos/gcp-deployment-proof.md` | Deployment proof options |
| **Text Description** | `todos/hackathon-text-description.md` | Submission text content |
| **Observability** | `todos/configure-observability.md` | Logging/monitoring setup |
| **Implementation Plan** | `~/.claude/plans/crispy-stargazing-cocke.md` | Full batched implementation plan with TDD |

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
