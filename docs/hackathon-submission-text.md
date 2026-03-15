# Past, Live — Hackathon Submission Text

**Category**: Live Agents (real-time voice + function calling)

---

## What It Is

Pick up the phone. Constantine XI answers. The walls are falling, and he wants your advice.

Past, Live is a voice-first learning app where students call historical figures through the Gemini Live API. Type any topic — or speak it, or scan a textbook — and Flash returns 3 historical figures who lived it. Pick one, and they answer. You talk. You interrupt. You give advice. They react. When you hang up, you know what happened and why.

No quizzes. No flashcards. No wrong answers. Just a phone call with someone who was there.

---

## How It Works

### Call flow

1. **Input** — Type a topic, speak it (Web Speech API), or point the camera at a textbook. Flash vision extracts the topic.
2. **Topic resolution** — Flash returns 3 `person+moment` cards inline. Student picks one.
3. **Preview** — Character portrait (Gemini 3.1 Image), era, teaser. All scene images are pre-generated and cached here — 0ms latency when `show_scene` fires during the call.
4. **Call** — Gemini Live connects. Automated privacy notice plays. Character picks up — already knowing who's calling via Firestore profile, referencing past sessions.
5. **Conversation** — Natural back-and-forth. Character leads. At key moments: 2-3 tappable choice cards (`announce_choice` tool). Student picks by voice, tap, or text.
6. **Hang up** — 9-min wrap-up inject. 10-min force-close. Student can hang up any time.
7. **Call log** — Key facts, what actually happened historically, character's farewell, suggested next calls. Downloadable 9:16 share card.

---

## Technical Implementation

### 3 Gemini models per session

| Call | Model | Purpose |
|------|-------|---------|
| 1 | `gemini-3-flash-preview` | Topic resolution + structured preview JSON: character, setting, stakes, OKLCH colors, `voiceName` |
| 2 | `gemini-3.1-flash-image-preview` | Era-specific scene banner (16:9), pre-generated at preview |
| 3 | `gemini-3.1-flash-image-preview` | Character portrait (neutral pose, cached) |
| 4 | `gemini-2.5-flash-native-audio-preview-12-2025` | Live API session (real-time voice) |
| 5 | `gemini-3-flash-preview` | Transcript → key facts, outcome comparison, farewell message |

**5 calls per session. 3 models collaborating.**

### Google Cloud infrastructure

| Service | Role |
|---------|------|
| **Cloud Run** | Backend (Hono/TS WebSocket relay) + frontend — full Google stack |
| **Firestore** | Student profiles, session history, cross-session memory |
| **Secret Manager** | `gemini-api-key`, `clerk-secret-key` at runtime |
| **Cloud Build** | Automated deploy on push (`cloudbuild.yaml`) |

### Cross-session memory

Firestore profile is read at session start and injected into the Live API system prompt. Returning students are recognized: "Back again? Last time you let the harbor fall." First-time visitors get the name asked conversationally — in character.

### Web Speech API

Runs in parallel to Gemini's `inputAudioTranscription` for the student's transcript display. Gemini's built-in transcription has no config options and lower accuracy. Web Speech API provides accurate, real-time "YOU" labels in the chat log.

### Scene pre-generation

All scene images are generated and cached during the preview step — before the call starts. When Gemini Live calls `show_scene`, the image is served from cache at 0ms. No waiting during conversation.

### Gemini Live API specifics

**`v1alpha` required.** `enableAffectiveDialog` (emotional tone modulation) is only accepted on `v1alpha`. Without `httpOptions: { apiVersion: 'v1alpha' }`, the connection is rejected.

**`NON_BLOCKING` tools throughout.** All function declarations use non-blocking execution. The model keeps speaking while tools execute — blocking `end_session` would silence the character mid-farewell, breaking the phone call illusion.

**Bounded audio queue.** `AudioOutputQueue` (maxSize=10 chunks) with backpressure. On `interrupted`, queue clears instantly — character stops mid-sentence.

**`connectWithRetry()`.** WebSocket 1008 errors (GitHub #1236) are transient. Relay retries 3× with 1s/2s/4s exponential backoff. Auth errors skip retry.

**System prompt order.** Persona first, conversational rules second, guardrails last. Google's guidance confirms order matters for voice models — persona defined last gets overridden.

---

## Findings

**Tool calling with native audio is fragile.** GitHub issue #843 (43+ reactions, open since May 2025) describes crashes when tools fire during native audio sessions. Removed `googleSearch` entirely after repeated session drops. Rule: one tool per turn, keep the set minimal.

**Image latency is a queue problem, not a prompt problem.** 5×5 benchmark (5 prompt styles × 5 runs) on free tier: variance across runs (12-15s) dwarfed variance across prompt styles (<1s). Bottleneck is GPU queue position. Pre-generation at preview hides this entirely.

**`sessionResumption.transparent` does not exist.** Passing `{ handle, transparent: true }` crashes the connection. Correct form: `{ handle?: string }` only.

**System prompt order matters more than wording.** "unmistakably" outperforms MUST/NEVER/ALWAYS for voice models (Google docs). More importantly, persona defined last gets overridden by earlier rules — order is structural.

**Camera during calls hits a 2-minute wall.** Audio+video sessions cap at ~2 minutes. Audio-only runs to 15 minutes (API), 10 minutes (our hard max with context window compression). Camera is textbook-scan only — not mid-call.

**"No wrong answers" is the highest-impact copy.** Validated against a 6-persona council (ages 13-42). One persona — exchange student from a shame-avoidant culture — read it three times before proceeding.

---

## Design Decisions Worth Noting

**No narrator.** Every word comes from the character. `switch_speaker` introduces other voices — they are also characters, not narrators.

**Emotional boundaries by design.** Characters feel urgency, pride, historical grief — but never dependency. System prompt: "You existed before this call and will continue after. End every call with a positive observation. Never make the student feel guilty for hanging up."

**Blocked callers stay in metaphor.** Requesting a perpetrator returns "This number is not in service" — no lecture. UI offers 3 alternative witnesses or resistors from the same event.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Astro 5 + Svelte 5 |
| Backend | Hono (TypeScript) on Google Cloud Run |
| AI Voice | `gemini-2.5-flash-native-audio-preview-12-2025` |
| AI Text | `gemini-3-flash-preview` |
| AI Image | `gemini-3.1-flash-image-preview` |
| Database | Firestore (`past-live-490122`, EU eur3) |
| Secrets | Google Cloud Secret Manager |
| CI/CD | Google Cloud Build |
| Auth | Clerk (anonymous-first, sign-up-later) |
