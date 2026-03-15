# Past, Live Server

## Prompt Architecture (Story Script Pivot — 2026-03-16)

### Complete Data Flow (7 Phases)

```
Phase 1: INPUT
  User types/speaks/photographs topic
    → POST /extract-topic (if image) → Flash → { topic, figures[3] }
    → POST /session-preview (if text) → Flash → { metadata } OR { figures[3] }
    → User sees 3 figure cards, picks one

Phase 2: STORY SCRIPT (background, 5-8s)
  POST /session-preview with specific figure
    → Flash (buildStoryScriptPrompt) → StoryScript JSON:
      personality (voice, humor, quirks, celebrityAnchor)
      hooks[] (myth→truth→surprise→anchor combos)
      facts[] (verified one-liners)
      choices[] (setup + options + consequences)
      scenes[] (image descriptions for show_scene)
      closingThread (final reframe)
    → Cached with 10min TTL

Phase 3: IMAGE PRE-GENERATION (parallel with Phase 2)
  Flash metadata → Image gen:
    → Avatar (1:1, currency engraving + brand orange)
    → Scene image (16:9, same style)
  StoryScript.scenes[] → Image gen (all pre-rendered):
    → Cached in preGeneratedScenesCache per previewId

Phase 4: SESSION START
  User clicks CALL → WebSocket upgrade
    → Firestore: getProfile(studentId) → pastSessions[]
    → buildSystemPrompt(characterName, setting, storyScript, pastSessions)
      = identity + CHARACTER_VOICE + BEHAVIORAL_RULES + material bag
    → createGeminiSession(systemPrompt, voiceName, tools)
    → Live connected, sendText("The student has called you")

Phase 5: LIVE CONVERSATION
  Browser ↔ Cloud Run ↔ Gemini Live (WebSocket, real-time)
    Audio chunks (16kHz PCM) relayed both ways
    Text input relayed via sendRealtimeInput
    Every 4 model turns: re-anchor injection (sendContext)
    Tool nudges: show_scene at turn 4+, announce_choice at turn 8+

Phase 6: MID-CALL TOOLS
  Live calls show_scene(title) → check preGeneratedScenesCache
    Cache hit: serve instantly (0ms)
    Cache miss: generate on-the-fly (2-3s paid, 12-15s free)
  Live calls announce_choice(choices[]) → tappable cards to browser
  Live calls end_session(reason) → triggers Phase 7

Phase 7: POST-CALL
  Flash (buildSummaryPrompt) → PostCallSummary:
    keyFacts[], outcomeComparison, characterMessage, suggestedCalls[]
  Firestore: updateSession + appendTranscriptTurns
  Browser: { type: 'ended', summary } → redirect to /summary
```

### What Flash Generates (per character) — Bag of Material, NOT Linear Script

| Field | Purpose |
|-------|---------|
| `personality` | voice, humor MECHANISM, quirks, energy. With EXAMPLE LINES showing the register |
| `hooks[]` | myth/truth/surprise/anchor combos — standalone "wait WHAT?" moments |
| `facts[]` | Verified historical details, woven in one at a time |
| `choices[]` | 1-2 derivable dilemmas with setup + options + per-option consequences |
| `scenes[]` | Pre-written image descriptions for show_scene |
| `closingThread` | Final reframe line |

**No acts. No beats. No linear arc.** Character pulls from the bag based on where the student takes the conversation.

### What's Universal (all characters)

| Rule | Source |
|------|--------|
| Phone call pacing: 1-2 sentences, wait | System prompt |
| First line under 10 words, statement not question | System prompt |
| Energy matching: bounce back bigger, never absorb | System prompt + re-anchor |
| Every line needs a hook | Re-anchor |
| Anchor facts to universal experience | System prompt + re-anchor |
| Arc building: each response builds on previous, never drop threads | System prompt |
| "What you are NOT": not tutor, not desperate, not breaking character | System prompt |

### Re-Anchoring (every 4 model turns)

Injected via `session.sendText()` in `relay-callbacks.ts`. Student never sees it.

Contains: identity lock, hook mandate, energy matching, lead rule, anchoring reminder, pacing.

### Key Files

| File | Purpose |
|------|---------|
| `scenarios.ts` | `buildSystemPrompt()` — assembles identity + voice + script |
| `character-voice.ts` | Shared personality (Live + summary). Humor theory. |
| `behavioral-rules.ts` | Rules + tool declarations. Script adherence. |
| `relay.ts` | WebSocket relay. Test script import (line 10). |
| `relay-callbacks.ts` | Gemini callbacks. Re-anchoring. Utterance accumulator. |
| `session-preview.ts` | Flash prompt for metadata + story script. |
| `test-scripts/` | Hardcoded prompts for testing. See `test-scripts/CLAUDE.md`. |

## Image Generation Pipeline

| File | Purpose | Protected? |
|------|---------|-----------|
| `image-gen.ts` | Core Gemini Image API wrapper + reference image support | YES — style config locked |
| `prompts/character-avatar.ts` | Avatar prompt templates | YES — see `prompts/CLAUDE.md` |
| `prompts/scene-image.ts` | Scene prompt templates | YES — see `prompts/CLAUDE.md` |
| `scene-image.ts` | Mid-call show_scene image gen | YES — uses same style |
| `assets/brand-orange-reference.webp` | Orange texture reference (8KB) | DO NOT replace or resize |

**Art style is LOCKED.** See `prompts/CLAUDE.md` for what can/cannot be changed.

## Logging

| Event | Level | What it captures |
|-------|-------|-----------------|
| `output_utterance` | INFO | Complete model sentences (accumulated, not per-word) |
| `input_utterance` | INFO | Complete student sentences (accumulated) |
| `reanchor_injected` | INFO | Re-anchor fired at turn N |
| `tool_call_forward` | INFO | Tool call name + args |
| `gemini_session_close` | INFO | Close code + reason (1011 = crash) |
| `interrupted` | INFO | Student interrupted model |

```bash
# Watch session in real-time
tail -f logs/server.log | jq 'select(.event | test("utterance|reanchor|interrupted|close"))'
```

## Gotchas

| Issue | Detail |
|-------|--------|
| Re-anchor via ANY method triggers VAD | All 3 injection methods cause issues. Current fix: `sendContext` + `reanchorJustSent` flag suppresses the next `interrupted` signal so audio plays through. See relay-callbacks.ts |
| Re-anchor fires on model turns only | Student turns don't increment the counter. Every 4 model turns. |
| Personality needs celebrity anchor | Flash generates `celebrityAnchor` — a funny comedian/actor. System prompt says "Channel the delivery style of [X] playing [characterName]." Instant voice register. |
| Humor is mandatory | "Be FUNNY. Tease, joke, be playful." Reactions/opinions/humor FREE. Historical facts LOCKED. Can invent personal details. |
| SHORT turns | Turn 1: ONE sentence <8 words. Turn 2: ONE sentence. Ramp up. Everything punchy. |
| No reciting material | Model recites hook templates verbatim if structured. All material formatted as prose in system prompt. |
| Thread building | Each response connects to previous. Build to payoff before switching. Never drop mid-thread. |
| Utterance accumulator flush | 2s silence OR interruption OR turn_complete triggers flush |
| `scene_image_failed` message type | Added for graceful failure handling — client shows styled placeholder |
| `$sceneImageFailed` store | New Nano Store for failed scene image state |
| Tool nudge pattern | `announceChoiceCalled` (turn 8+) and `showSceneCalled` (turn 4+) tracked in relay-callbacks. Re-anchor reminds model to use tools |
| Scene pre-generation | All scenes from storyScript pre-rendered at preview via `Promise.allSettled`. Cached in `preGeneratedScenesCache`. `show_scene` checks cache first (0ms) |
| Cross-session memory | `relay.ts` calls `getProfile(studentId)` → maps sessions to `pastSessions[]` → injected into `buildSystemPrompt()` |
| Topic broadening | `extract-topic` returns `{ topic_extracted, figures[3] }` with name/era/role/teaser/relevance. `session-preview` weights story toward topic |
| Humor reciprocity | Added to `character-voice.ts`: "If the student jokes with you, joke back. Lean into it." |
| `generationConfig` → `config` | `@google/genai` SDK uses `config` not `generationConfig`. Pre-existing bug fixed in session-preview.ts |
