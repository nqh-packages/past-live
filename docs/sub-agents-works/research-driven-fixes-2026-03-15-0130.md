# Past, Live — Research-Driven Fixes (2026-03-15)

## Topic
7 fixes to the Gemini Live API server based on research into API quirks, best practices, and production case studies. Hackathon deadline: March 16 @ 8pm EDT.

## What is Past, Live?
Phone call historical figures via Gemini Live API real-time voice. Characters are calm, funny, self-aware storytellers. Backend is Hono + Node.js WebSocket relay to Gemini Live. Hackathon entry for Gemini Live Agent Challenge.

## Governance Files (MUST READ)

| File | What it contains | Why you need it |
|------|-----------------|-----------------|
| `apps/past-live/CLAUDE.md` | All decisions, architecture, Gemini Live API reference, tool calling, call flow | Single source of truth |
| `~/.claude/CLAUDE.md` | Universal code rules, testing (90% coverage), security, file limits (350 LOC) | Quality gates |

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Hono (TypeScript) on Cloud Run |
| AI Voice | Gemini Live API (`gemini-2.5-flash-native-audio-preview-12-2025`) |
| AI Summaries | Gemini 3 Flash (`gemini-3-flash-preview`) |
| AI Images | Gemini 3.1 Flash Image (`gemini-3.1-flash-image-preview`) |
| SDK | `@google/genai` v1.45.0 (v1alpha for affective dialog) |
| Logging | Structured pino via `logger.ts` |

## Key Files

| File | Purpose | LOC |
|------|---------|-----|
| `server/src/gemini.ts` | Thin wrapper around `ai.live.connect()`, callbacks | 262 |
| `server/src/relay.ts` | WebSocket relay: browser ↔ Gemini | 313 |
| `server/src/relay-callbacks.ts` | Shared callback builder (initial + GoAway reconnect) | 166 |
| `server/src/behavioral-rules.ts` | BEHAVIORAL_RULES text + TOOL_DECLARATIONS (4 tools) | 166 |
| `server/src/scenarios.ts` | `buildSystemPrompt()` + preset scenario metadata | 156 |
| `server/src/character-voice.ts` | CHARACTER_VOICE shared personality text | 49 |
| `server/src/post-call-summary.ts` | Flash generates post-call summary, manual JSON validation | 206 |
| `server/src/session-preview.ts` | Flash generates preview metadata, manual JSON validation | 456 |
| `server/src/protocol.ts` | Client/server message types, parse/serialize | 180 |
| `server/src/scene-image.ts` | Mid-call image generation via show_scene tool | 84 |

## Key Decisions (from this session)

| Decision | Choice | Why |
|----------|--------|-----|
| googleSearch tool | REMOVED | Was crashing Gemini Live sessions |
| GoAway + session resumption | IMPLEMENTED | Transparent reconnection on server disconnect |
| show_scene tool | KEEP | "Where the magic comes from" — Huy's words |
| Video/camera mid-call | REMOVED | Too limiting (2min audio+video limit) |
| System prompt order | persona → rules → guardrails | Google best practices research |
| "Unmistakably" keyword | Use in 2-3 key constraints | Research shows more effective than MUST/NEVER |

## Patterns & Conventions

| Pattern | Rule |
|---------|------|
| Logging | `logger.info/warn/error({ event, code?, action?, err? }, message)` — structured pino |
| Error codes | `DOMAIN_ISSUE_NNN` format (e.g., `GEMINI_SESSION_001`) |
| File headers | `@what`, `@why`, `@exports` JSDoc block |
| Tool calls | All NON_BLOCKING — model continues speaking while tool runs |
| Audio | Input: PCM 16-bit LE mono 16kHz. Output: PCM 24kHz |
| Tests | Vitest, colocated `.test.ts` files, `npx vitest run` |

## What Just Happened

3 parallel research agents investigated Gemini Live API quirks (GitHub issues), case studies (hackathon winners, production deployments), and best practices (Google docs, technical blogs). Key findings:

1. Tool calling + native audio is a KNOWN BUG (GitHub #843, 43+ reactions) — our tools work but fragile
2. WebSocket 1008 errors are intermittent (#1236) — need retry logic
3. Mid-sentence truncation (#2117) — can't fix, only detect
4. System prompt order matters (persona → rules → guardrails)
5. All production systems use bounded audio queues
6. Zod/Pydantic eliminates ~40% of validation code
7. "Your Story" section still references Google Search (removed) — must clean up

Plan approved at `/Users/huy/.claude/plans/purring-bouncing-turing.md`.

## Dependencies Between Batches

| Batch | Creates | Used by |
|-------|---------|---------|
| Batch 1 (Zod) | `schemas.ts` with exported types | Batch 1 also refactors post-call-summary.ts and session-preview.ts |
| Batch 2 (Retry + Logging + Truncation) | Changes to gemini.ts, relay.ts, relay-callbacks.ts | Independent |
| Batch 3 (Prompt fixes) | Changes to scenarios.ts, behavioral-rules.ts | Independent |
| Batch 4 (Audio queue) | NEW `relay-audio-queue.ts`, wires into relay-callbacks.ts | Must run AFTER Batch 2 (both touch relay-callbacks.ts) |

**Batch 4 MUST run after Batch 2 completes** — both modify relay-callbacks.ts.
