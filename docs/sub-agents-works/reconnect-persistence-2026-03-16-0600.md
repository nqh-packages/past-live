# Past, Live — Agent Context (2026-03-16)

## Topic

1011 auto-reconnect + Firestore session persistence + API call logging. Three related features that make sessions resilient and traceable.

## What is Past, Live?

Students "call the past" — phone historical figures via Gemini Live API real-time voice. Astro 5 + Svelte 5 frontend, Hono/TS backend on Cloud Run, WebSocket relay to Gemini Live. Hackathon project for Gemini Live Agent Challenge.

## Governance Files (MUST READ)

| File | What it contains | Why agent needs it |
|------|-----------------|-------------------|
| `apps/past-live/CLAUDE.md` | All decisions, architecture, stack, API contracts, gotchas | Single source of truth |
| `apps/past-live/server/src/CLAUDE.md` | Image gen pipeline protection rules | Don't break protected files |
| `~/.claude/CLAUDE.md` | Universal rules, TDD, code style, security | Quality gates |

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Astro 5 + Svelte 5 | Monorepo `apps/past-live/` |
| Backend | Hono (TypeScript) on Cloud Run | `apps/past-live/server/` |
| AI Voice | `gemini-2.5-flash-native-audio-preview-12-2025` | `@google/genai` SDK, v1alpha |
| AI JSON | `gemini-3-flash-preview` | Structured output for metadata/summary |
| AI Image | `gemini-3.1-flash-image-preview` | Scene images + portraits |
| DB | Firestore (`past-live-490122`, EU eur3) | Already set up, SDK in server deps |
| Auth | Clerk (`@clerk/astro`) | Anonymous-first |
| State | Nano Stores | Cross-island state |

## Architecture

```
Browser (Astro/Svelte)           Cloud Run (Hono/TS)
┌─────────────────────┐         ┌──────────────────────┐
│ SessionManager       │         │ relay.ts (orchestrator)│
│ ChatLog, CallControls│──WS────│ gemini.ts (Live API)  │
│ liveSession store    │         │ session-preview.ts    │
│ sessionStorage       │◄─WS────│ post-call-summary.ts  │
│ transcript-pacer     │         │ scene-image.ts        │
└─────────────────────┘         │ extract-topic.ts      │
                                │ firestore.ts          │
                                └──────────┬───────────┘
                                           │
                                ┌──────────▼───────────┐
                                │ Gemini Live API       │
                                │ Firestore             │
                                └──────────────────────┘
```

## Key Files (task-relevant)

| File | Purpose | Batch |
|------|---------|-------|
| `server/src/relay.ts` | WebSocket relay orchestrator, RelayState, session lifecycle | B |
| `server/src/relay-callbacks.ts` | Gemini callbacks (onClose, onToolCall, etc.) | B |
| `server/src/gemini.ts` | Gemini Live session factory, connectWithRetry | B |
| `server/src/protocol.ts` | ClientMessage/ServerMessage types, parse/serialize | B |
| `server/src/firestore.ts` | Existing Firestore client (getDb, student profiles) | A |
| `server/src/session-preview.ts` | Flash metadata generation | A |
| `server/src/post-call-summary.ts` | Post-call Gemini summary | A |
| `server/src/scene-image.ts` | Mid-call show_scene image gen | A |
| `server/src/image-gen.ts` | Core Gemini Image API wrapper | A |
| `server/src/extract-topic.ts` | Camera → Flash topic extraction | A |
| `server/src/logger.ts` | Pino logger instance | A,B |
| `src/lib/liveSession/client.ts` | WebSocket client, message dispatch | C |
| `src/stores/liveSession.ts` | Nano Store atoms (SessionStatus, etc.) | C |
| `src/components/ChatLog.svelte` | Transcript display | C |

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| DB for logging | Firestore | Already set up, SDK in deps, free tier covers volume |
| API call log collection | `api_calls` | Flat collection, sessionId field for queries |
| Session doc collection | `sessions` | One doc per session, updated on lifecycle events |
| Reconnect max attempts | 2 | 3rd crash = give up, show error |
| Reconnect delay | 1.5 seconds | Let Gemini stabilize between crashes |
| Context replay on reconnect | Last 5 transcript turns via sendContext() | Enough for character continuity |
| Logging failures | Fire-and-forget, never crash session | Observability must not break UX |
| SessionStatus | Add `'reconnecting'` | Browser shows indicator during reconnect |
| userId field | Optional on all docs | Anonymous-first, coupled to Clerk ID later |

## Patterns & Conventions

- **Firestore client**: `server/src/firestore.ts` exports `getDb()` — use this, don't create new Firestore instances
- **Logger**: `server/src/logger.ts` exports `logger` — use structured logging with `event`, `sessionId`, `code` fields
- **Error handling**: All Firestore writes must be fire-and-forget (`.catch(() => {})`) — never crash a session because logging failed
- **Protocol types**: All WebSocket messages typed in `protocol.ts` — add new types there
- **Test pattern**: Vitest, `vi.mock` for external deps (Firestore, Gemini), colocated test files
- **File headers**: `@what`, `@why`, `@exports` JSDoc block required
- **Max file size**: 350 LOC

## What Just Happened

34% of sessions crash with Gemini 1011 (server-side internal error). Analysis of 64 sessions showed crashes cluster during unstable periods — not triggered by any single client action. Currently user must refresh and loses all conversation context. No API calls are logged. No sessions are persisted. We need: (1) auto-reconnect on 1011 with transcript replay, (2) Firestore session persistence, (3) Firestore API call logging for every Gemini call.

## Dependencies Between Batches

```
Batch A (api-call-logger + session-persistence) → creates modules
Batch B (relay reconnect) → imports from Batch A modules
Batch C (frontend reconnect) → depends on protocol types from Batch B
```

**Batch A must complete first.** Batch B imports `api-call-logger.ts` and `session-persistence.ts`. Batch C imports new protocol types.

**However**: Batch A creates NEW files (no conflicts with B or C). B and C touch different files (server vs frontend). So B and C can run in parallel AFTER A completes.

**Strategy**: Run A first. Then B and C in parallel.
