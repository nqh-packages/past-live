# Past, Live — Agent Context (2026-03-15)

## Topic

Hackathon submission deliverables: README, architecture diagram, repo extraction script, text description polish. Deadline: March 16, 2026 @ 8:00pm EDT.

## What is Past, Live?

Voice-first app where students call historical figures via Gemini Live API. Type a topic, pick a character, have a real-time conversation. Built for the Gemini Live Agent Challenge hackathon.

## Governance Files (MUST READ)

| File | What it contains | Why agent needs it |
|------|-----------------|-------------------|
| `apps/past-live/CLAUDE.md` | All decisions, architecture, stack, env vars, call flow, gotchas | Single source of truth |
| `~/.claude/CLAUDE.md` | Universal rules, code style, testing, security | Monorepo-wide governance |

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Astro 5 + Svelte 5 | `apps/past-live/`, port 7278 |
| Frontend host | Cloudflare Workers | `@astrojs/cloudflare` adapter |
| Backend | Hono (TS) on Cloud Run | `apps/past-live/server/`, port 8787 |
| AI Voice | Gemini Live API | `gemini-2.5-flash-native-audio-preview-12-2025` |
| AI Text | Gemini Flash | `gemini-3-flash-preview` (preview JSON, summary) |
| AI Image | Gemini 3.1 Image | `gemini-3.1-flash-image-preview` (portraits, scenes) |
| Profile DB | Firestore | `past-live-490122`, EU eur3 |
| Auth | Clerk | `@clerk/astro`, anonymous-first |
| Monitoring | Sentry | Currently disabled |

## Architecture

```
Browser (Astro/Svelte)              Cloud Run (Hono/TS)
┌─────────────────────┐            ┌──────────────────────┐
│ Mic (getUserMedia)   │            │ @google/genai         │
│ Audio playback       │──WebSocket─│ ai.live.connect()    │
│ UI (transcript, art) │            │ Tool call handler     │
│ Text input           │◄─WebSocket─│ Scenario prompts     │
│                      │            │ Profile read/write    │
│ Host: CF Workers     │            │                      │
└─────────────────────┘            └──────────┬───────────┘
                                              │
                                   ┌──────────▼───────────┐
                                   │ Gemini Live API       │
                                   │ Gemini Flash          │
                                   │ Gemini 3.1 Image      │
                                   └──────────────────────┘
                                   ┌──────────────────────┐
                                   │ Firestore (profiles)  │
                                   │ Clerk (auth/JWT)      │
                                   └──────────────────────┘
```

## Key Files (task-relevant only)

| File | Purpose |
|------|---------|
| `apps/past-live/package.json` | Frontend deps, scripts (dev port 7278) |
| `apps/past-live/server/package.json` | Backend deps, scripts (dev port 8787) |
| `apps/past-live/CLAUDE.md` | All env vars, decisions, architecture |
| `apps/past-live/todos/readme-spinup.md` | README requirements |
| `apps/past-live/todos/architecture-diagram.md` | Diagram requirements |
| `apps/past-live/todos/public-github-repo.md` | Repo extraction requirements |
| `apps/past-live/todos/hackathon-text-description.md` | Text description draft |
| `apps/past-live/docs/gemini-cost-estimation.md` | Cost per session ($0.25) |

## Key Decisions (from this session)

| Decision | Choice | Why |
|----------|--------|-----|
| API tier | Paid (pay-as-you-go) for demo | Free tier throttles image gen 12-15s |
| Image gen model | `gemini-3.1-flash-image-preview` | Nano Banana 2, best quality |
| googleSearch tool | REMOVED | Crashed Gemini Live sessions |
| Camera mid-call | NO — input scan only | 2min audio+video limit too restrictive |
| sessionResumption | `{ handle }` only | `transparent` field does not exist |

## Environment Variables (for README)

### Frontend (`apps/past-live/.env`)

```
PUBLIC_BACKEND_WS_URL=ws://localhost:8787/ws
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
PUBLIC_POSTHOG_KEY=phc_...
```

### Backend (`apps/past-live/server/.env`)

```
GEMINI_API_KEY=...
GOOGLE_CLOUD_PROJECT=past-live-490122
ALLOWED_ORIGIN=http://localhost:7278
CLERK_SECRET_KEY=sk_test_...
```

## What Just Happened

Huy went to sleep (3:30am). Session debugged: sessionResumption `transparent` crash (fixed), Gemini 1011 internal errors (server-side, logged), image gen latency benchmarked (12-15s free tier floor, paid needed). All 7 research-driven fixes implemented and committed. 267+ tests passing. Now completing hackathon submission deliverables autonomously.

## Dependencies Between Batches

None — all 4 batches are fully independent. README references architecture diagram but can use ASCII placeholder. Repo extraction is a script, not code changes.
