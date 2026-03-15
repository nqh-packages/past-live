# CLAUDE.md Audit — Past, Live (2026-03-16)

## Files Audited

| File | LOC | Grade |
|------|-----|-------|
| `apps/past-live/CLAUDE.md` | 806 | C — Overloaded, partially stale, needs offloading |
| `apps/past-live/server/src/CLAUDE.md` | 98 | B — Mostly current, one stale gotcha |
| `apps/past-live/server/src/prompts/CLAUDE.md` | 31 | A — Correct, locked content, well-scoped |
| `apps/past-live/server/src/test-scripts/CLAUDE.md` | 52 | B+ — Accurate, missing cleopatra status |

---

## 1. apps/past-live/CLAUDE.md (806 LOC)

**Hard limit is 350 LOC. This file is 230% over.**

### Stale Content

#### 1a. Core Architecture section misrepresents current state (lines 10–60)

The section headline says "Flash Fills the Bag, Live Performs (2026-03-16)" and describes a bag-of-material model with hooks/facts/choices as standalone items. This is the V4 *direction*, but it is NOT how the current production code works.

Actual current state (verified in code):
- `schemas.ts` has `storyScriptSchema` (acts, choices, branches)
- `scenarios.ts` imports `StoryScript` type
- `session-preview.ts` is 434 LOC (Flash story-script prompt exists)
- `relay-callbacks.ts` uses `sendContext()` for re-anchoring (not `sendText`)

The CLAUDE.md describes "hooks[] / facts[] / choices[]" as Flash-generated fields (lines 21–26), but the actual schema uses `storyScript.acts[]` with `actChoiceSchema`. The "bag" model is the conceptual framing; the implementation uses a structured act/branch tree. Claude reading this file will build against the wrong schema.

**Suggested fix**: Update the architecture table to reflect `storyScript: { acts: [...] }` and link to `schemas.ts:storyScriptSchema`.

#### 1b. "Decisions Log" row for `Non 'Live' Model` (line 71)

Value: `` `gemini-3-flash-preview` ``. This model identifier appears throughout, but the `session-preview.ts` file should be checked — the actual model string in the codebase may differ. Low confidence this is current. Flag for verification.

#### 1c. Architecture diagram (lines 244–261) shows "Deploy: Cloudflare" for frontend

The frontend moved to Cloud Run (line 123 of the same file). The ASCII diagram still says `Deploy: Cloudflare` inside the browser box. Contradiction within the same file.

**Suggested fix**: Change `Deploy: Cloudflare` → `Deploy: Cloud Run` in the diagram.

#### 1d. Tool calling table lists only 3 tools, missing `show_scene` (lines 172–177)

The Decisions Log (line 85) and the body both reference `show_scene` as a fourth tool. The tool calling reference table lists `end_session`, `switch_speaker`, `announce_choice` — `show_scene` is absent.

**Suggested fix**: Add `show_scene` row to the tool calling reference table.

#### 1e. Re-anchor gotcha is wrong in the main gotchas table (line 745–748 area)

The gotchas section does NOT mention re-anchoring via `sendText` triggering VAD. However, `server/src/CLAUDE.md` line 92 documents this. The root cause was confirmed and the fix was implemented — re-anchoring now uses `sendContext()` (which maps to `sendClientContent` internally, not `sendRealtimeInput`). The CLAUDE.md has no mention of this important resolved gotcha.

**Suggested fix**: Add gotcha: `sendRealtimeInput({ text })` triggers VAD (cuts off model). Re-anchoring uses `sendContext()` → `sendClientContent({ turnComplete: false })`.

#### 1f. Hackathon phases section (lines 608–620) is outdated

Lists "Phase 1: Done" and "Phase 2: Done" with remaining stretch items. Tonight's story-script pivot is effectively "Phase 3" work but is not represented. The phase table no longer reflects where the project is.

**Suggested fix**: Add Phase 3 row for story script pivot or remove phase tracking (it's per-session implementation detail, not useful long-term context).

#### 1g. `pastlive.site` domain noted as "NOT YET REGISTERED" (line 124)

This was the state on 2026-03-15. Unknown if it changed. If still unregistered, fine. If registered, stale. Flag for manual check.

---

### Duplication With server/src/CLAUDE.md

| Content | Main CLAUDE.md | server/src/CLAUDE.md | Action |
|---------|----------------|----------------------|--------|
| Bag-of-material architecture | Lines 10–60 | Lines 1–58 | Overlap is ~80%. server doc is more precise. Main should summarize + link |
| Re-anchor mechanism | Not mentioned | Lines 43–44 | main doc missing this entirely |
| Key file table | Not in main | Lines 49–58 | Correct to be in server doc only |
| Logging table | Lines 75–86 of server doc | Not in main | Correct to be in server doc only |
| Gotcha: Lean into fun | Line 95 of server doc | Not in main | Correct to be in server doc only |

The Core Architecture section in `CLAUDE.md` (lines 10–60) and the Prompt Architecture section in `server/src/CLAUDE.md` (lines 1–58) tell the same story. The server doc is more precise and more current. The main doc's version should be condensed to 4–5 rows pointing at the server doc for details.

---

### Content That Should Be Offloaded to `.claude/rules/`

The main CLAUDE.md is 806 LOC because it carries content that belongs in reference files:

| Section | Lines (approx) | Should go to |
|---------|----------------|-------------|
| Gemini Live API Technical Reference | ~95 lines | `.claude/rules/gemini-live-api.md` |
| Research-Driven Architecture patterns | ~20 lines | `.claude/rules/gemini-live-api.md` |
| Backend Relay Contract (full TypeScript types) | ~40 lines | `.claude/rules/relay-protocol.md` |
| Student Profile Firestore schema | ~30 lines | `.claude/rules/data-schemas.md` |
| Emotional Boundaries (ALLOWED/FORBIDDEN tables) | ~35 lines | `.claude/rules/character-guidelines.md` |
| Content Safety section | ~25 lines | `.claude/rules/character-guidelines.md` |
| Two Palette System + OKLCH constraints | ~25 lines | `.claude/rules/design-system.md` |
| Conversation Patterns table (lines 41–57) | ~20 lines | `.claude/rules/character-guidelines.md` or summary in main |

If all the above were offloaded with one-line references in the main doc, the main CLAUDE.md would drop to approximately 300–320 LOC — within the 350 limit.

---

### Missing From Tonight's Work

The following decisions/fixes from tonight's session are NOT documented in `apps/past-live/CLAUDE.md`:

| Missing | Where it should go |
|---------|--------------------|
| Bug fix: scene/avatar priority in `SceneImageDisplay.svelte:29` | Gotchas table or bug note |
| Bug fix: `closeCode === 1011` → send `{ type: 'error' }` not `{ type: 'ended' }` | Gotchas table |
| Story script pivot: Flash now generates `storyScript: { acts[] }` not thin metadata | Core Architecture section |
| `preset-scenarios.ts` extraction is NOT yet done (scenarios.ts has no story script injection yet) | Decisions Log or phase tracking |
| Re-anchor now uses `sendContext()` / `sendClientContent` (VAD fix) | Gotchas table |
| `session-preview.ts` is 434 LOC (exceeds 350 limit) | Flag in improvements |
| Cleopatra test script added (V2 bag-of-material) | test-scripts/CLAUDE.md |

---

## 2. apps/past-live/server/src/CLAUDE.md (98 LOC)

**Grade: B.** Mostly accurate. Two issues.

### Stale Gotcha (line 92)

```
Re-anchor via sendText triggers VAD | sendRealtimeInput({ text }) counts as "user activity" → fires interrupted → cuts off model mid-sentence. CONFIRMED root cause of audio cutoffs. Fix: use sendClientContent or delay injection
```

The fix is now IMPLEMENTED. `relay-callbacks.ts:340` uses `state.session.sendContext(anchor)` which internally calls `sendClientContent({ turnComplete: false })`. The gotcha should be updated to describe the resolved state and the fix used, not left as an open "Fix:" suggestion.

**Suggested fix at line 92**: Change to: `Re-anchor uses sendContext() → sendClientContent(turnComplete:false). Do NOT use sendText() / sendRealtimeInput({text}) for injection — triggers VAD, cuts model mid-sentence.`

### Missing: Prompt Architecture section doesn't reference storyScript

The "What Flash Generates" table (lines 17–27) lists `personality, hooks[], facts[], choices[], scenes[], closingThread` — the bag-of-material field names. But `schemas.ts:storyScriptSchema` uses `acts[]` with `actChoiceSchema`. The server doc should note the schema moved from bag fields to `storyScript.acts[]`.

**Note**: The Cleopatra test script (`test-scripts/cleopatra.ts`) still uses the bag-of-material format (hooks[], facts[], choices[]). This is intentional — it's a voice-only test without tool calls. But the server CLAUDE.md implies this is the live pipeline architecture. Clarification needed.

---

## 3. apps/past-live/server/src/prompts/CLAUDE.md (31 LOC)

**Grade: A.** Content is accurate, scope is correct, no duplication. No changes needed.

---

## 4. apps/past-live/server/src/test-scripts/CLAUDE.md (52 LOC)

**Grade: B+.** Mostly accurate. One gap.

### Missing: Cleopatra script status

The Available Scripts table (lines 26–29) lists:
- `bolivar.ts` — V4 — turn pacing fixed, hints not lines
- `cleopatra.ts` — V2 — turn ramp-up, beat navigation

`cleopatra.ts` actually implements the bag-of-material architecture (hooks/facts/choices) as a voice-only test, distinct from bolivar's hint-based approach. The status note "V2 — turn ramp-up, beat navigation" doesn't communicate that cleopatra is testing the bag architecture, while bolivar is testing hint-based scripting. These are testing different prompt approaches.

**Suggested fix**: Update cleopatra row to: `cleopatra.ts | Cleopatra VII | V2 — bag-of-material (hooks/facts/choices), voice-only, no tool calls`

---

## Summary: Priority Order for Changes

| Priority | File | Change |
|----------|------|--------|
| 1 (critical) | `CLAUDE.md` | Fix architecture diagram: `Deploy: Cloudflare` → `Deploy: Cloud Run` (line ~252) |
| 2 (critical) | `CLAUDE.md` | Add missing `show_scene` tool to tool calling table |
| 3 (critical) | `CLAUDE.md` | Document tonight's 3 bug fixes in Gotchas + flag storyScript pivot state |
| 4 (high) | `CLAUDE.md` | Update Core Architecture section to reflect `storyScript: { acts[] }` schema, not bag fields |
| 5 (high) | `server/src/CLAUDE.md` | Mark re-anchor VAD issue as RESOLVED, document `sendContext()` fix |
| 6 (medium) | `CLAUDE.md` | Offload 6 heavy sections to `.claude/rules/` — brings file under 350 LOC |
| 7 (medium) | `server/src/CLAUDE.md` | Clarify Flash pipeline now targets `storyScript.acts[]` vs cleopatra's bag-of-material being test-only |
| 8 (low) | `test-scripts/CLAUDE.md` | Update cleopatra status row to name its architecture |
| 9 (low) | `CLAUDE.md` | Remove or update Hackathon Phases table (Phase 1/2 "Done" — Phase 3 not noted) |

---

## Specific Line References

| File | Line | Issue |
|------|------|-------|
| `apps/past-live/CLAUDE.md` | 252 | `Deploy: Cloudflare` in diagram — should be `Cloud Run` |
| `apps/past-live/CLAUDE.md` | 172–177 | Tool table missing `show_scene` |
| `apps/past-live/CLAUDE.md` | 21–26 | Bag fields (`hooks[], facts[]`) — should reflect `storyScript.acts[]` schema |
| `apps/past-live/CLAUDE.md` | 608–620 | Phase 1/2 Done table — doesn't include tonight's pivot |
| `apps/past-live/server/src/CLAUDE.md` | 92 | Re-anchor VAD gotcha — fix is implemented, not still pending |
