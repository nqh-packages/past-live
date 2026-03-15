# Story Script Pivot — Session Record (2026-03-16)

## Session Context

| Key | Value |
|-----|-------|
| Date | 2026-03-16 ~22:00–23:30 UTC-5 |
| Starting state | Past, Live deployed to `past-live.ngoquochuy.com`, 3 preset scenarios working |
| Trigger | Live testing revealed 3 production bugs + fundamental prompting weakness |
| Outcome | Identified architectural pivot: Flash pre-generates story scripts, Live performs them |

---

## Pivot History (for context)

| Pivot | What Changed | Commit |
|-------|-------------|--------|
| V1 | Original: role-play tutor with narrator + student assigned a role | `0f7e1dc` |
| V2 | "Shit. That's a new app" — students CALL historical figures. No narrator. Phone metaphor | `c8af139` |
| V3 | Characters go from panicking heroes to calm, funny, self-aware storytellers. Bright/fun design | Session `180c0894` |
| **V4 (this session)** | Flash pre-generates full story script with derivable learning. Live performs, doesn't improvise | This session |

---

## Production Bugs Found

### Bug 1: Scene image shows avatar instead of scene

| Aspect | Detail |
|--------|--------|
| Root cause | `SceneImageDisplay.svelte:29` checks `avatar` before `sceneImage` |
| Effect | Small square portrait stretched into 16:9 landscape banner |
| Fix | Swap priority: check `sceneImage` first |

### Bug 2: Session redirects to summary after show_scene

| Aspect | Detail |
|--------|--------|
| Root cause | Gemini Live API crashed with `closeCode=1011, reason=Internal error occurred.` |
| Confirmed via | `gcloud logging read` — session `1773623734711-pwh0g4wy` |
| Timeline | Session created → 85s → show_scene tool call → 4s later → Gemini 1011 crash |
| Why it redirected | `onClose` in `relay-callbacks.ts:163` sends `{ type: 'ended' }` for ALL closes — client treats as normal end |
| Fix | Distinguish: `closeCode === 1011` → send `{ type: 'error' }` (shows retry), not `ended` (redirects) |

### Bug 3: Historical inaccuracy — Bolívar "dragging ships over mountains"

| Aspect | Detail |
|--------|--------|
| Root cause | `show_scene` tool declaration example: `"The ships being dragged over the hills"` (Constantinople-specific) |
| Effect | Model playing Bolívar conflated the example with Bolívar's Andes crossing |
| Confirmed via | Logs: `show_scene` args were `title: "Dragging the ships over the Andes"` |
| Deeper issue | Flash gave Live almost nothing: `characterName: "SIMÓN BOLÍVAR"`, `historicalSetting: "Simón Bolívar, 1822"` — no actual context |

---

## The Core Problem: Live Improvises Everything

**Current flow**: Flash generates thin metadata → Live improvises the entire conversation

| What Flash gives Live | What Live has to invent |
|----------------------|------------------------|
| Character name | What to say |
| Year | When to show scenes (inventing descriptions) |
| 2-3 vague decision point titles | When to present choices (inventing options) |
| Color palette, voice name | Historical facts (sometimes wrong) |

**Result**: Live hallucinated. Bolívar "dragged ships over mountains" because the model had no actual historical content to work with — just a name and a year.

---

## The Pivot: Story Script Pre-Generation

### StudyBit Connection

Past, Live's pedagogy comes from StudyBit (`/CODES/expo/apps/studybit/`). Core principle: **derivable learning**.

| StudyBit Principle | Past, Live Application |
|---|---|
| Every answer derivable from reasoning, not recall | Student reasons from anchors, doesn't need to know history |
| 2-3 anchors per question (temporal, causal, emotional) | Character weaves anchors into the story before asking |
| Wrong answers historically absurd — test context understanding | Choice options are what actually happened or was considered |
| "You are Napoleon. What do you do?" framing | "My general wants to break away. What would you do?" |

### Key Insight: Student Knows Nothing

**V1's problem**: It loaded everything onto the student. "You are Bolívar's advisor" — but the student doesn't know who Bolívar is, where Colombia is, or what Spain was doing there.

**Fix**: Every fact anchored to **universal human experience**:

| Historical fact | Anchored version |
|---|---|
| Gran Colombia fragmented due to regional autonomy disputes | "Imagine you build a house with five people. The moment it's done, everyone wants their own room." |
| Bolívar's 12-year liberation campaign | "Twelve years. Can you imagine fighting for twelve years?" |
| Bolívar declared dictator after being liberator | "The day you win, you become the problem. Because now YOU'RE the one with power." |
| Santander wanted federalism | "My vice president thinks I have too much power" |

### New Architecture

| Aspect | Before | After |
|--------|--------|-------|
| Flash output | Thin metadata (name, year, colors, 2-3 decision titles) | Full decision tree: 3-4 acts, branching outcomes, scene descriptions, choice cards |
| System prompt | ~1.5K tokens, vague "tell your story" | ~4-5K tokens, structured script with every beat mapped |
| Live's role | Writer + performer (invents everything) | Performer only (follows Flash's script, adapts delivery) |
| Scene descriptions | Invented mid-call by Live | Pre-written by Flash, historically accurate |
| Choice cards | Invented mid-call by Live | Pre-mapped by Flash with branch outcomes |
| Historical accuracy | Model hallucinated | Every fact pre-verified by Flash |

### Story Script Format (approved)

```
Flash generates → structured JSON with acts/choices/branches
  ↓
Full tree injected into Live's system prompt
  ↓
Live follows the script: calls tools with pre-written content
  ↓
Student choices follow pre-mapped branches (nextActId)
```

| Decision | Choice | Why |
|----------|--------|-----|
| Where does the tree live? | Full tree in system prompt | Simple, one injection point, Live sees everything from start |
| Script depth | 3-4 acts, 2-3 choices each | Covers 5-7 min call, 6-12 total act nodes |
| Script style | Narrative hints, not exact lines | Model finds own words, doesn't repeat verbatim |
| Images | Descriptions pre-written, images generated on-demand | Live calls show_scene with Flash's description, image generates in background |
| Branching | Flash pre-maps all branch outcomes | Student picks → Live reads matching branch |
| Format | Structured JSON with acts/choices | Validated by Zod schema |

---

## Test: Hardcoded Bolívar Script

### Setup

| Component | Detail |
|-----------|--------|
| Script file | `server/src/test-scripts/bolivar.ts` |
| Test page | `design/test-story-script.html` → served at `localhost:8787/test-script` |
| Scenario ID | `test-story-script-bolivar` (relay intercepts, bypasses `buildSystemPrompt()`) |
| Tools | Disabled (`tools: []`) — voice only |
| Voice | Orus (firm, male) |
| Swappable | Change import at `relay.ts:10` to test different scripts |

### Code Changes

| File | Change |
|------|--------|
| `server/src/test-scripts/bolivar.ts` | Hardcoded story script with 4 acts, derivable anchors, no tool calls |
| `server/src/relay.ts` | Import test script, intercept `test-story-script-*` scenario IDs |
| `server/src/gemini.ts` | Added `tools?: Tool[]` override to `GeminiSessionConfig` |
| `server/src/server.ts` | Added `GET /test-script` route |
| `design/test-story-script.html` | Test page with queued audio playback |

### Test Results (first run)

| Observation | Detail |
|-------------|--------|
| Opening line | ✅ "I freed five countries. They tried to kill me." — correct |
| Anchoring | ✅ "You spend twelve years fighting the biggest empire..." — universal framing |
| Repetition | ❌ Model repeated Act 1 beat 3 times verbatim after interruption |
| Audio bleed on interrupt | ❌ Previous response kept playing after student interrupted — test page doesn't flush audio queue |
| Session duration | 71 seconds, clean close (code=1000) |
| No tool calls | ✅ No tools fired (as intended) |
| Script too prescriptive | ❌ Near-exact dialogue lines caused verbatim repetition. **Decision: use hints, not lines** |
| Input transcription | Chunked incrementally per utterance — final piece of each chunk logged |

### Root Cause: Repetition

The script gave near-exact dialogue:

```
"So imagine this. You spend twelve years — twelve — fighting the biggest
empire in the world. Spain owned everything from Mexico to Argentina."
```

When interrupted, the model restarted from the same beat because the prompt told it EXACTLY what to say. After 3 repetitions it apologized: "My apologies. I got caught up in the drama."

**Fix direction**: Use `narrativeHint` (what to convey) instead of scripted lines. Model finds its own words each time.

### Root Cause: Audio Bleed

Test page creates audio chunks with `BufferSource.start(scheduledTime)`. On interruption, `nextPlayTime` is still in the future — queued chunks keep playing. Main app's `AudioOutputQueue` handles this; test page doesn't.

---

## What Changes (Full Scope)

### AI Pipeline

| Layer | Current | After pivot |
|-------|---------|-------------|
| Flash prompt | Asks for metadata + 2-3 decision titles | Asks for full story script with acts, choices, branches, scene descriptions |
| Flash output schema | `{ metadata, decisionPoints }` | `{ metadata, storyScript: { acts: [...] } }` |
| System prompt | Vague "tell your story" + behavioral rules | Structured script injection + "follow this, don't invent" rules |
| Tool declarations | `show_scene` example: "ships over hills" (leaks) | Era-neutral examples, scripted descriptions |
| Live behavior | Improvises everything | Performs script, adapts delivery only |

### Server

| File | Change |
|------|--------|
| `schemas.ts` | Add `storyActSchema`, `storyScriptSchema`, `actChoiceSchema` Zod schemas |
| `session-preview.ts` | Rewrite Flash prompt for story script. Include `storyScript` in response |
| `preset-scenarios.ts` (NEW) | Extract presets from `session-preview.ts` (over 350 LOC). Add hand-written story scripts |
| `scenarios.ts` | `buildSystemPrompt()` accepts + formats story script. "Your Story Script" section replaces vague "Your Story" |
| `behavioral-rules.ts` | Script adherence rules. Era-neutral tool examples |
| `protocol.ts` | Add `storyScript` to `start` client message |
| `relay.ts` | Extract `storyScript` from start message, pass to `buildSystemPrompt()` |
| `gemini.ts` | Pass close code/reason to `onClose` callback |
| `relay-callbacks.ts` | `closeCode === 1011` → send `error` not `ended` |

### Client

| File | Change |
|------|--------|
| `liveSession.ts` | Add `StoryScript` types, add to `PreviewData` |
| `client.ts` | Send `storyScript` in `connectSession()`. Add `case 'tool_call'` logging |
| `SessionPreview.svelte` | Store `storyScript` in preview data |
| `SceneImageDisplay.svelte` | Swap scene/avatar priority (bug fix) |

### UX

| Aspect | Change |
|--------|--------|
| Student experience | Identical — still calls historical figures, hears voice, sees scenes, taps choices |
| Quality improvement | Historically accurate, better paced, more interactive |
| Crash recovery | Error overlay with retry button instead of redirect to summary |
| Scene banner | Shows actual scene image instead of stretched avatar |

---

## Files Modified This Session

| File | Purpose |
|------|---------|
| `server/src/test-scripts/bolivar.ts` | Hardcoded Bolívar story script |
| `server/src/relay.ts` | Test script import + intercept logic |
| `server/src/gemini.ts` | `tools` override in config |
| `server/src/server.ts` | `/test-script` route |
| `design/test-story-script.html` | Test page |

## Commits

| Hash | Message |
|------|---------|
| `b5283ba` | `feat(past-live): story script test harness for derivable learning framing` |

---

---

## Test V2: Hints-Based Script

### Changes Made

| File | Change |
|------|--------|
| `test-scripts/bolivar.ts` | Rewrote prompts: hints not lines. Beat 1 shortened to 15s max. Explicit "after you ASK, STOP TALKING" rule |
| `relay-callbacks.ts` | Transcription accumulator — logs complete utterances (`output_utterance` / `input_utterance`) instead of per-word chunks. Flushes on 2s silence, interruption, or turn_complete |

### V2 Test Observations

| Observation | Detail |
|-------------|--------|
| Opening monologue | ❌ 40 seconds before student could speak. Model delivered Beat 1 + Beat 2 in one breath |
| Root cause | Beat 1 had too much to CONVEY. Model treated all hints as things to say NOW |
| Fix applied | Beat 1 reduced to: hook line + one context sentence + question. "Then STOP TALKING." |
| Input transcription fragmented | ❌ Each word-chunk logged separately: `" aga"`, `"in"`, `" why"` |
| Root cause | `onInputTranscription` logged every tiny Gemini chunk as separate event |
| Fix applied | Accumulator with 2s flush timer. Logs `STUDENT: fighting home, what happened?` as one line |

### Prompt Changes (V1 → V2 → V3)

| Version | Beat 1 approach | Result |
|---------|----------------|--------|
| V1 (scripted lines) | Exact dialogue: "So imagine this..." | Model repeated verbatim 3x on interrupt |
| V2 (hints) | CONVEY: 12-year war, barefoot soldiers, mountains, empire | Model said everything at once — 40s monologue |
| V3 (minimal hints + stop rule) | CONVEY: freed 5 countries, 12 years. ASK then STOP. Save details for after response | Testing next |

## Next Steps (not started)

| Priority | Task |
|----------|------|
| 1 | Test V3 script (minimal Beat 1 + stop rule) |
| 2 | Iterate on beat pacing based on results |
| 3 | Implement full pipeline: Flash prompt → Zod schema → system prompt injection |
| 4 | Bug fixes: scene/avatar priority, 1011 crash handling, tool example |
| 5 | Deploy + production test |
