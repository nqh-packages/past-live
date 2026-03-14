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
| Art | Gemini → color theme, `gemini-3.1-flash-image-preview` → character portrait | Full-stack Google |
| Demo scenarios | Constantinople 1453, Moon Landing 1969, Mongol Empire 1206 | 3 diverse regions/eras |
| Warm-up | Agent-generated from previous session; first visit: name + age | Cannot skip — continuous data collection |
| App name | **Past, Live** (slug: `past-live`) | Comma = pause. Reads as command: "Past, live." |
| Naming style | "Past" (muted/serif) + "Live" (bright/bold) | Visual contrast |

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

## Game Flow

| Step | Action | Mode |
|------|--------|------|
| 0 | **Warm-up** — First visit: name + age → Firestore. Returning: agent-generated question from last session | Pre-session |
| 1 | **Input** — Student shows textbook/tells topic. Camera scans material (regular Gemini vision, NOT Live) | Camera ON |
| 2 | **Scene Setting** — Agent narrates scenario in character voice. "Ready, or change anything?" | Live API, audio-only |
| 3 | Student confirms or revises → back to 2 | Audio-only |
| 4 | **Countdown** 3-2-1 | Client-side |
| 5 | **Story** — Agent plays character(s) with affective dialog. Encourages acting but accepts calm reasoning | Audio-only |
| 6 | **Drama twist** — Planned from scenario start. NEVER sensitive content | Audio-only |
| 7 | **Student responds** | Audio-only |
| 8 | **Probing** (if student can't demonstrate historical reasoning) — probe → hint → rephrase → progress story. Max 3 | Audio-only |
| 9a | **Pass** → Funny story resolution from correct answer | Audio-only |
| 9b | **Fail** → Funny hypothetical from wrong/no answer | Audio-only |
| 10 | **Positive insight** about student. Save to profile: learning patterns, personality, topic history, next warm-up | Post-session |

### Camera: Demo-Only (Persona Council Decision)

Camera OFF during role-play by default. At ONE climactic moment, agent offers opt-in:
- Prompt: "Want to try something?" + clear **Skip** button
- If accepted: 3-sec burst, agent reacts, done. No photo stored
- If skipped: Agent uses affective dialog: "You sound nervous, advisor! Constantinople needs confidence!"
- Never guilt-trip skipping. "Fair enough — I'll imagine your brave face. It's magnificent."
- **Demo video for judges** shows the camera moment working once

### Text Input (Hybrid Mode)

Agent ALWAYS speaks via voice. Student can respond via **voice OR text**.
- Hold-to-speak button (primary, larger)
- Text input field below subtitles (always visible)
- Text uses `session.sendRealtimeInput({ text: '...' })` — same API

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

## UI Layout (Audio-Only Story)

```
┌─────────────────────────────┐
│  [blurred color theme bg]   │
│  ┌───────────────────────┐  │
│  │  Character Portrait   │  │
│  │  (Gemini-generated)   │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  Live Subtitles       │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  Constantinople 1453  │  │
│  │  Role: Emperor's      │  │
│  │  Advisor              │  │
│  └───────────────────────┘  │
│  [mic listening indicator]  │
└─────────────────────────────┘
```

Color theme: Gemini generates palette from era → Gemini 3.1 generates portrait + bg blur. Subtitles always visible (accessibility).

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

Non-Live Gemini summary extraction stays out of scope for the hackathon slice.

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

## UX Details

Full UX decisions, UI mockups, persona quotes, and scope priorities: **`design/ux-details.md`**

Persona research: `design/research/personas.md` | Council verdict: `design/research/council-verdict.md`

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
