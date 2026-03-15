# Past, Live — Story Script Implementation Context (2026-03-16)

## Topic

Implementing the bag-of-material story script architecture: Flash generates personality + hooks + facts + choices + scenes per character, Live performs from the bag conversationally. Replaces current thin metadata (name + year + decision points).

## What is Past, Live?

Students call historical figures via Gemini Live API. Real-time voice. Characters are funny, self-aware storytellers. Phone call metaphor. Hackathon submission for Gemini Live Agent Challenge (deadline: March 16, 2026 @ 8:00pm EDT).

## Governance Files (MUST READ)

| File | What it contains |
|------|-----------------|
| `apps/past-live/CLAUDE.md` | All decisions, architecture, stack, bag-of-material patterns, conversation patterns |
| `apps/past-live/server/src/CLAUDE.md` | Server architecture, prompt pipeline, image gen, logging |
| `~/.claude/CLAUDE.md` | Universal rules, code style, testing, security |

## Plan File

| File | What it contains |
|------|-----------------|
| `~/.claude/plans/expressive-foraging-flame.md` | Full implementation plan with schemas, Flash prompt, system prompt assembly, plumbing, bug fixes, TDD |

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Astro 5 + Svelte 5 islands |
| Backend | Hono on Cloud Run |
| AI Voice | Gemini Live API (`gemini-2.5-flash-native-audio-preview-12-2025`) |
| AI Metadata | `gemini-3-flash-preview` (Flash) |
| AI Images | `gemini-3.1-flash-image-preview` |
| State | Nano Stores |
| Auth | Clerk |

## Architecture

```
Browser (Astro/Svelte)           Cloud Run (Hono)
┌──────────────────┐            ┌──────────────────┐
│ SessionPreview    │            │ session-preview   │ ← Flash generates storyScript
│ stores storyScript│──WebSocket─│ relay.ts          │ ← passes storyScript to buildSystemPrompt
│ in sessionStorage │            │ scenarios.ts      │ ← assembles system prompt with personality + material
│                   │◄─WebSocket─│ gemini.ts         │ ← Gemini Live session with full prompt
└──────────────────┘            └──────────────────┘
```

## Key Decisions (from tonight's session)

| Decision | Choice |
|----------|--------|
| Material structure | Bag of material — NOT linear acts/beats/scripts |
| Celebrity anchor | Flash picks a FUNNY celebrity whose delivery style to channel |
| Humor | "Be FUNNY. Tease, joke, be playful." Reactions/humor FREE, facts LOCKED |
| Prompt size | 600-1200 words sweet spot |
| WHY-first framing | Explain why rules exist, not just state them |
| Student awareness | Character asks who they are naturally, uses name at close |
| Re-anchor | Every 4 turns via sendContext (NOT sendText — triggers VAD) |
| No reciting | Material is source, not script. Own words every time |

## What Just Happened

Tonight we tested 7 prompt versions for Cleopatra. Scripted acts failed (V1-V4). Bag-of-material architecture worked at 60%. 9 dream conversation personas validated the pattern. Key remaining gaps: personality needs celebrity anchor, humor needs to be explicitly allowed (jokes, teasing, riffing). The delegated audio agent already fixed: mic chunking, echo gate, cursor playback, VAD tuning, tool validation, transcript pacing, auto-scroll, sanitizer.

## Dependencies Between Batches

```
Batch 1: schemas.ts (types — everything depends on this)
    ↓
Batch 2: preset-scenarios.ts (NEW) ─── can run parallel ───┐
Batch 3: session-preview.ts ─────── can run parallel ───────┤
Batch 4: scenarios.ts + behavioral-rules.ts ── parallel ────┘
    ↓
Batch 5: protocol.ts + client.ts + relay.ts + liveSession.ts + SessionPreview.svelte
    (depends on batches 1+3+4)

Batch 6: Bug fixes (independent, anytime)
```

## CRITICAL: Files Modified by Delegated Agent

These files were recently modified. READ CURRENT STATE before editing:

| File | What changed |
|------|-------------|
| `server/src/gemini.ts` | VAD settings, compression config, Tool type import |
| `server/src/relay-callbacks.ts` | Tool validation (21 tests), utterance accumulator, re-anchor via sendContext |
| `server/src/protocol.ts` | turn_complete forwarded to browser |
| `src/lib/liveSession/client.ts` | Transcript sanitizer, paced reveal, echo gate |
| `src/lib/liveSession/audio.ts` | Cursor playback, scheduled source tracking, echo gate |

## Test Commands

```bash
cd apps/past-live/server && npm test           # all server tests
cd apps/past-live/server && npm test -- schemas # specific file
cd apps/past-live/server && npm run build       # TypeScript build
pnpm build --filter past-live                   # frontend build
```
