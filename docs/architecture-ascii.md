# Past, Live — System Architecture (ASCII)

Fallback for environments where the SVG cannot render.
Full SVG at `public/architecture.svg`.

---

## 5 Gemini API Calls Per Session

| # | Call | Model | When |
|---|------|-------|------|
| 1 | Topic resolution + preview JSON — character, setting, voice, colors | `gemini-3-flash-preview` | Before preview card |
| 2 | Scene image — era-specific 16:9 art | `gemini-3.1-flash-image-preview` | Before preview card (cached) |
| 3 | Character portrait — neutral pose | `gemini-3.1-flash-image-preview` | Before preview card (cached per character) |
| 4 | Voice session — real-time audio conversation | `gemini-2.5-flash-native-audio-preview-12-2025` | During call |
| 5 | Post-call summary — key facts, character message | `gemini-3-flash-preview` | After hang-up |

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            CLERK (Auth + JWT)                               │
│            Anonymous-first · Sign-up later · War Room Dispatch theme        │
└───────────────┬───────────────────────────────────┬────────────────────────┘
                │ auth UI                            │ JWT validate
                ▼                                   ▼
┌──────────────────────────┐         ┌──────────────────────────────────────┐
│   BROWSER                │         │   BACKEND                            │
│   Astro 5 + Svelte 5     │         │   Hono / TypeScript                  │
│   ─────────────────────  │◄──WS───►│   ─────────────────────────────────  │
│   Mic (getUserMedia)     │ audio   │   WebSocket relay                    │
│   Web Speech API (YOU)   │ text    │   Tool call handler                  │
│   Audio playback         │ tools   │   Scenario prompt builder            │
│   Transcript display     │         │   Session timer (9-min inject)       │
│   Choice cards           │         │   Audio output queue (maxSize=10)    │
│   Scene images (cached)  │         │   Profile read / write               │
│   Safari safe areas      │         │   Scene pre-gen cache                │
│                          │         │                                      │
│   ☁ Cloud Run            │         │   ☁ Google Cloud Run                 │
│   past-live.ngoquochuy.  │         │   past-live-backend-709469269798     │
│   com                    │         │   .us-central1.run.app               │
└──────────────────────────┘         └────────┬─────────────┬───────────────┘
                                              │             │
                              ┌───────────────┘             └────────────────────────┐
                              │ WebSocket (real-time voice)                           │
                              ▼                                                       │
         ┌────────────────────────────────────┐                                      │
         │   GEMINI LIVE API  (Call #4)        │                                      │
         │   gemini-2.5-flash-native-audio     │                                      │
         │   ─────────────────────────────     │                                      │
         │   Native audio generation           │                                      │
         │   Voice Activity Detection          │                                      │
         │   Affective dialog (v1alpha)        │                                      │
         │   Context window compression        │                                      │
         │   Tool calling (NON_BLOCKING):      │                                      │
         │     end_session · switch_speaker    │                                      │
         │     announce_choice · show_scene    │                                      │
         └────────────────────────────────────┘                                      │
                                                                                     │
         ┌──────────────────────────┐   ┌──────────────────────────┐                 │
         │   GEMINI FLASH           │   │   GEMINI 3.1 IMAGE       │                 │
         │   gemini-3-flash-preview │   │   gemini-3.1-flash-image │                 │
         │   ──────────────────── ◄─┼───┤   ──────────────────── ◄─┼─────────────────┘
         │   Call #1: Topic         │   │   Call #2: Scene image   │
         │     resolution + preview │   │     (pre-gen at preview, │
         │     JSON (3 figures for  │   │      cached → 0ms on     │
         │     any topic)           │   │      show_scene)         │
         │   Call #5: Post-call     │   │   Call #3: Portrait      │
         │          summary         │   │     (cached per char)    │
         └──────────────────────────┘   └──────────────────────────┘

         ┌────────────────────────────────────┐   ┌──────────────────────────┐
         │   FIRESTORE                         │   │   SECRET MANAGER         │
         │   past-live-490122 · EU eur3        │   │   gemini-api-key         │
         │   ─────────────────────────────     │   │   clerk-secret-key       │
         │   Student profiles (name, age,      │   └──────────────────────────┘
         │     learning patterns, personality) │
         │   Session history → injected into   │   ┌──────────────────────────┐
         │     system prompt on each call      │   │   CLOUD BUILD            │
         │     ("Back again? Last time you     │   │   cloudbuild.yaml        │
         │      let the harbor fall.")         │   │   Auto-deploy on push    │
         │   Scene cache (previewId → base64)  │   └──────────────────────────┘
         └────────────────────────────────────┘
```

---

## Data Flow Summary

```
Student types / speaks / scans topic
        │
        ▼
Browser → Backend (HTTP)
        │
        ▼ Call #1
Backend → Gemini Flash ─→ 3 person+moment cards (topic resolution)
        │
        │   Student picks one
        │
        ▼ Call #1 (preview JSON)
Backend → Gemini Flash ─→ Preview JSON (character, setting, OKLCH colors, voiceName)
        │
        ├─ Call #2 → Gemini 3.1 Image ─→ Scene image (16:9) ─→ cache
        ├─ Call #3 → Gemini 3.1 Image ─→ Character portrait ─→ cache
        │
        ├─ Firestore → getProfile() ─→ past sessions + learning patterns
        │
Student confirms → [CALL]
        │
        ▼
Browser ←──WebSocket──→ Backend ←──WebSocket──→ Gemini Live  (Call #4)
(mic PCM 16kHz)                   (audio PCM 24kHz back)
 Web Speech API ─→ "YOU" display
        │                                    │
        │                              Tool calls:
        │                              show_scene ─→ serve from cache (0ms)
        │                              announce_choice ─→ tappable cards
        │                              end_session ─→ redirect
        │
Student hangs up or character calls end_session
        │
        ▼ Call #5
Backend → Gemini Flash ─→ Post-call summary → /summary page
        │
        ▼
Backend → Firestore ─→ Save session to student profile
                    ─→ available as memory in next call
```
