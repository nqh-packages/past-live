# Past, Live — Implementation Ready Tasks (2026-03-15)

## Topic
Parallel subagent work for hackathon deadline (March 16, 2026 @ 8:00pm EDT). All decisions made. These are execution-only tasks.

## What is Past, Live?
Phone call historical figures via Gemini Live API. Real-time voice, character wit, tool calling (scene images, choices, fact-checking). Pivot V3: characters are calm storytellers, not crisis heroes. Design: bright & funny (not dark "War Room"). Full Google stack (Cloud Run, not Cloudflare).

## Governance Files (READ FIRST)
| File | What it contains | Why you need it |
|------|-----------------|-----------------|
| `apps/past-live/CLAUDE.md` | Project decisions, architecture, gotchas | Single source of truth |
| `~/.claude/CLAUDE.md` | Universal code rules, testing, security | Monorepo-wide governance |
| `apps/past-live/.claude/rules/` | Project-specific rules (deps, patterns) | Constraints |
| `apps/past-live/docs/research-gemini-live-api.md` | Gemini Live API capabilities deep-dive | Understand real-time voice |

## Relevant Documentation
| Doc | Path | What's in it |
|-----|------|-------------|
| UX Details & Feedback | `apps/past-live/design/ux-details.md` | UI/UX decisions, character feedback |
| Call Transcripts | `apps/past-live/docs/call-logs/` | Real call examples, logging patterns |
| Humor Research | `apps/past-live/docs/humor-research-*.md` | How to instruct funny (3 historical examples) |
| System Prompt Philosophy | `apps/past-live/server/src/scenarios.ts:1-100` | Unified prompt architecture |
| Character Voice | `apps/past-live/server/src/character-voice.ts` | Shared personality across Live + summaries |

## Stack
| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Svelte 5 (islands) + Astro | test-call.html is current MVP |
| Backend | Hono + Node.js (Cloud Run) | WebSocket relay pattern |
| Real-time voice | Gemini 2.5 Flash Native Audio | Streaming audio/text, tool calling |
| Image gen | Gemini 3.1 Flash Image | Mid-call scene generation |
| Summaries | Gemini 3 Flash | Post-call keyFacts + characterMessage |
| Storage | Firestore (GCP) | Cross-session memory, user profiles |
| Logging | Structured pino (@nqh/logger) | Every event tracked |

## Architecture
```
Browser (Svelte)
    ↓ WebSocket
    ↓ (audio stream, user text, tool responses)
    ↑ (transcript, tool calls, scene images)

Cloud Run (Hono)
    ↓ gRPC
    ↓ (audio, user input forwarding)
    ↑ (streaming audio, tool calls)

Gemini Live API
    ↓ gRPC bidirectional
    ↓ (user audio, tool responses)
    ↑ (assistant audio, tool calls)

Async (fire-and-forget):
  - Image generation (show_scene tool)
  - Post-call summary (Gemini 3 Flash)
  - Call logging (Firestore + disk)
```

## Key Files (task-relevant only)
| File | Purpose | Size | Task |
|------|---------|------|------|
| `server/src/relay.ts` | WebSocket relay, tool forwarding | 350 LOC | Batch 1 (scene_image handler) |
| `design/test-call.html` | Current MVP frontend | 500 LOC | Batch 2 (scene display + logging) |
| `server/src/server.ts` | Hono app, routes | 120 LOC | Batch 3 (Cloud Run deployment) |
| `server/src/post-call-summary.ts` | Gemini Flash summaries | 200 LOC | Already done (in-character voice) |
| `server/src/scenarios.ts` | Unified system prompt | 180 LOC | Already done (character-agnostic) |
| `server/src/character-voice.ts` | Shared personality | 80 LOC | Already done (consistent tone) |

## Key Decisions (from this session)
| Decision | Choice | Why |
|----------|--------|-----|
| Backend platform | Cloud Run (full Google stack) | Judges want Google ecosystem, not Cloudflare |
| Scene images | Pre-call generation (Option 2) | show_scene crashes session, deadline risk |
| System prompt | Unified `buildSystemPrompt()` | No hardcoded scenarios, reusable across characters |
| Character voice | Shared `CHARACTER_VOICE` module | Consistency Live + summary |
| Logging | Structured (pino) everywhere | Production debugging mandatory |
| Test page | `localhost:8787/test` (Hono route) | Mic requires localhost, not file:// |
| call timestamps | Millisecond precision events | Debugging call flow critical |

## Dependencies Between Batches
| Batch | Depends on | Notes |
|-------|-----------|-------|
| 1 (Backend images) | `scenarios.ts` (already done) | Pre-gen images, no Live API changes |
| 2 (Frontend display) | Batch 1 (image URLs needed) | Then wire scene_image message handling |
| 3 (Cloud Run) | Batch 1 + 2 complete | Then deploy to Cloud Run + test |
| 4 (Firestore wiring) | Cloud Run running | Cross-session memory, user profiles |

## Patterns & Conventions
| Pattern | Rule | Why |
|---------|------|-----|
| Logging | `logger.info({ event, duration, code, action })` | Structured, searchable in Cloud Logging |
| Tool calls | Fire-and-forget async, not blocking Gemini | System prompt rules this |
| Error handling | Log + notify, never silent fail | Production debugging |
| File size | Max 350 LOC per file | Readability, modularity |
| Testing | TDD (RED → GREEN → REFACTOR), 90% coverage | Phase 4 requirement |

## What Just Happened (Timeline)
- **March 14, 23:59**: Sor Juana call revealed: opening too long (15+ seconds), show_scene crashed session, images not displayed on frontend
- **March 14 → 15**: Debugged prompt (max 10 words first sentence), discovered show_scene session crash
- **March 15, 00:15**: Decided to pivot show_scene: pre-call generation instead of Live API tool call
- **This session**: Created delegation context, split decision-needed vs implementation-ready tasks

## Next Steps (Batches to Delegate)

### Batch 1: Backend Image Generation
**What**: Generate scene images pre-call, store URLs in scenario metadata
**Files to touch**:
- `server/src/scenarios.ts` (add `preGeneratedImageUrl?: string` to ScenarioMeta)
- NEW `server/src/scenario-images.ts` (generate images for all 28 characters at startup)
- `server/src/relay.ts` (send preGeneratedImageUrl to browser on session start)

**Why**: Avoids session crash, images ready before call starts

### Batch 2: Frontend Scene Display + Logging
**What**: Wire scene_image messages, display portraits, add detailed browser logging
**Files to touch**:
- `design/test-call.html` (scene_image handler + logging)
- NEW `src/components/SceneDisplay.svelte` (reusable scene component for production app)

**Why**: Frontend currently ignores scene_image messages

### Batch 3: Cloud Run Migration
**What**: Switch from `@astrojs/cloudflare` to Node adapter, test on Cloud Run emulator
**Files to touch**:
- `astro.config.mjs` (change adapter)
- `wrangler.jsonc` (convert to Cloud Run config)
- `server/src/server.ts` (ensure Cloud Run compatibility)
- `.github/workflows/deploy.yml` (update CI to deploy to Cloud Run instead of Wrangler)

**Why**: Full Google stack for judges

### Batch 4: Firestore Cross-Session Memory
**What**: Wire Firestore profile fetch → buildSystemPrompt(pastSessions)
**Files to touch**:
- `server/src/firestore.ts` (user profile queries)
- `server/src/relay.ts` (fetch profile on session start, pass to buildSystemPrompt)
- `server/src/scenarios.ts` (accept pastSessions param)

**Why**: Continuity across calls (character remembers prior conversations)

### Batch 5: Public Repo Re-sync
**What**: Extract with v3 pivot changes, clean git history
**Files to touch**: ALL (full `apps/past-live/`)

**Why**: Hackathon submission needs current version with all logging, prompt rewrite, design updates

### Batch 6: Portrait Reveal Animation
**What**: CSS animation on calling screen when portrait base64 loads
**Files to touch**:
- `design/test-call.html` (fade-in + scale animation on `<img>` load)
- `src/styles/global.css` (animation keyframes)

**Why**: "Wow factor" — character faces appear smoothly

## Quality Gates (MANDATORY)
- Read every file before editing
- Max 350 LOC per file
- Run tests after changes: `pnpm test --filter past-live`
- All tests must pass — no skips
- Structured logging on every feature
- No console.log (use logger)
- Commit conventional format: `feat:`, `fix:`, etc. + file:line + testing evidence

## Do NOT
- Modify files outside your batch's scope
- Skip reading files before editing
- Guess at implementations — follow directions exactly
- Change architecture decisions (pre-call images, Cloud Run, etc.)
- Commit without tests passing
