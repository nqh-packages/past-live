# User Testing Report: Past, Live

| Field | Value |
|-------|-------|
| **Date** | 2026-03-14 |
| **App** | Past, Live (http://localhost:7278) |
| **Personas** | 5 (Maya 15, Tomás 16, Aisha 14, Zara 42, Diego 13) |
| **Total Issues** | 46 raw → **14 unique** (after dedup) |
| **Method** | Parallel persona-player agents via agent-browser |

---

## Cross-Persona Issue Heatmap

Issues ranked by how many personas independently hit them.

| # | Issue | Maya | Tomás | Aisha | Zara | Diego | Count | Severity |
|---|-------|------|-------|-------|------|-------|-------|----------|
| 1 | **Custom topic calling broken** ("incomplete preview data") | x | x | x | x | x | **5/5** | BLOCKER |
| 2 | **Student messages invisible** in chat transcript | x | x | x | — | x | **4/5** | BLOCKER |
| 3 | **Portrait placeholder** "[ portrait ]" everywhere | x | x | x | — | x | **4/5** | HIGH |
| 4 | **Summary shows wrong/hardcoded data** (wrong character, fake 12:34 duration) | x | x | x | — | x | **4/5** | BLOCKER |
| 5 | **No privacy policy** / terms / contact info | — | — | x | x | — | **2/5** | BLOCKER (for parents) |
| 6 | **Preset cards skip preview**, go straight to live call with mic=1 | — | x | x | x | — | **3/5** | HIGH |
| 7 | **Only 3 preset scenarios** — none match real homework | x | x | — | — | — | **2/5** | HIGH |
| 8 | **Tiny mono text** — wall of text, hard to read | — | x | — | — | x | **2/5** | HIGH |
| 9 | **"For Judges" section** visible/empty | x | x | x | x | — | **4/5** | MEDIUM |
| 10 | **Default Astro 404 page** breaks branding | x | — | x | x | — | **3/5** | LOW |
| 11 | **Mic/camera buttons** on /app do nothing | x | x | — | x | — | **3/5** | MEDIUM |
| 12 | **No session history/export** | — | — | x | — | — | **1/5** | MEDIUM |
| 13 | **AudioContext blocked** — no audio without gesture | — | — | — | — | x | **1/5** | MEDIUM |
| 14 | **Call ends abruptly** (41s, no warning) | — | x | — | — | — | **1/5** | MEDIUM |

---

## Blockers (Fix Before Hackathon Submission)

### 1. Custom Topic Calling Broken — 5/5 personas hit this

Every single persona tried typing a custom topic. Every single one got "incomplete preview data." This is the **core feature** that differentiates Past, Live from a 3-scenario demo.

- Maya: "cleopatra egypt" → failed
- Tomás: "world war 2" → failed
- Aisha: "ethics of dropping the atomic bomb" → failed
- Zara: "Hitler" → failed (should show blocked-caller UX, got generic error instead)
- Diego: "samurai" → failed

**Impact**: Without this, the app is a 3-preset demo. Every persona said custom topics working would change their verdict.

### 2. Student Messages Invisible — 4/5 personas

Typed messages send to the AI (characters respond to them) but never appear in the chat transcript. No `[YOU]` tag, no visual feedback. The transcript reads as a monologue.

- Tomás: "summary says '(no spoken input captured)' even though I typed two messages"
- Diego: "I have no idea if my message was even received"
- Maya: "the whole transcript is just the character talking to himself"

**Impact**: Makes the experience feel broken and one-sided. Destroys study utility since you can't review your own questions.

### 3. Summary Shows Wrong/Hardcoded Data — 4/5 personas

Summary page shows Constantine XI data regardless of which character was called. Duration always shows "12:34" regardless of actual call length.

- Diego: Called Jamukha → summary shows Constantine XI
- Maya: Called Gene Kranz → summary shows Constantine XI
- Aisha: "If the summary data is fake, why should I trust the key facts?"
- Tomás: "the summary page is actually the most useful part... if it worked"

**Impact**: Completely undermines the post-call learning experience. The summary IS the study tool — showing wrong data is worse than showing nothing.

### 4. No Privacy/Terms/Contact — 2/5 (but BLOCKS parent approval)

Only Aisha and Zara flagged this, but Zara's verdict is **BLOCK**. No parent will approve an app that:
- Has no privacy policy
- Processes minors' voice through unnamed servers
- Has no age verification
- Has no contact information
- Defaults mic to ON

**Zara**: "Great product, zero trust."

**Impact**: Even if the app is perfect, parents won't let kids use it. This blocks the entire target audience.

---

## High Priority

### 5. Portrait Placeholder "[ portrait ]" — 4/5 personas

The 16:9 banner on the session page shows literal text "[ portrait ]" instead of a character image. Scenario cards also have no images.

- Diego: "I'm supposed to be on a phone call with a Mongol warrior and I can't even see his face?"
- Maya: "On Character.AI the characters have actual pictures"

**Impact**: Kills immersion. The "phone call" metaphor falls apart when you're calling a blank screen.

### 6. Preset Cards Skip Preview — 3/5 personas

Preset scenario cards link directly to `/session?scenario=...&mic=1`, skipping the preview overlay and auto-enabling mic.

- Tomás: "I got thrown into a conversation with a stranger with my mic on. That's anxiety-inducing"
- Zara: "mic defaults to ON — that's exactly the kind of dark pattern that makes me block apps"

**Impact**: Worst for shy/anxious students (Tomás profile) and privacy-conscious parents.

### 7. Only 3 Preset Scenarios — 2/5 personas

Constantinople, Moon Landing, Mongol Empire. None match what students actually study.

- Tomás: "My test is on the French Revolution. None of these help me"
- Maya: "Two out of three are pretty niche for AP World History"

**Impact**: Combined with broken custom topics (#1), the app can't help any student with their actual homework.

---

## Universal Truths (All Personas Agree)

1. **The concept is excellent.** Every persona — even the skeptic mom — praised the idea. "Better than anything else out there" (Aisha), "way cooler than Quizlet" (Tomás), "genuinely better AI conversation quality than Khanmigo" (Zara).

2. **The character dialogue is strong.** When it works, the AI characters are compelling. Diego: "The dawn wind carries the dust of a hundred thousand horses" — "OK that SLAPS." Maya: "way better than the flat responses I get on Character.AI."

3. **The summary page is the study tool** — if it worked. Tomás: "the key facts are basically what I'd put on a Quizlet card." But all personas found it shows wrong data.

4. **Custom topics = make or break.** Every persona tried typing a topic. Every persona hit the same error. Every persona said fixing this would change their verdict.

---

## Split Opinions

| Topic | Enthusiasts (Maya, Diego) | Pragmatists (Aisha, Tomás) | Skeptic (Zara) |
|-------|--------------------------|---------------------------|----------------|
| **Dark aesthetic** | "kind of fire" / "hacker terminal" | "doesn't look like school" | neutral |
| **Mono font** | too small, skip over it | noticed but tolerated | readable for her |
| **Voice vs text** | want voice | want text option (have it) | mic should default OFF |
| **"For judges"** | confused but ignored | confused | red flag (hackathon = amateur) |

---

## Top 3 Recommendations (Hackathon Deadline: March 16)

### 1. Fix custom topic calling (BLOCKER)
The backend preview endpoint returns incomplete data. Every persona's verdict hinges on this working.

### 2. Fix summary page data (BLOCKER)
Summary shows hardcoded Constantine XI data regardless of actual session. Needs to read real session data from sessionStorage or pass it through the session flow.

### 3. Show student messages in chat (BLOCKER)
Text input sends to AI but `[YOU]` entries never appear in the transcript. The `ChatLog.svelte` component doesn't create entries for user-sent messages.

**If time permits**: Fix portrait placeholders (#5), add privacy footer with contact (#4), make preset cards go through preview flow (#6).

---

## Per-Persona Reports

| Persona | Report | Issues | Verdict |
|---------|--------|--------|---------|
| Maya (15, drama) | [report](per-persona/maya/report.md) | 9 | "60% done — concept beats Character.AI but execution isn't there yet" |
| Tomás (16, reluctant) | [report](per-persona/tomas/report.md) | 9 | "Going back to Quizlet" |
| Aisha (14, overachiever) | [report](per-persona/aisha/report.md) | 9 | "Could be the best debate prep tool that exists — but not yet" |
| Zara (42, parent) | [report](per-persona/zara/report.md) | 10 | **BLOCK** — "Great product, zero trust" |
| Diego (13, ADHD) | [report](per-persona/diego/report.md) | 9 | "The IDEA is amazing but I'd go back to YouTube" |

---

## Screenshots

All evidence screenshots saved to `per-persona/{name}/screenshots/`.
