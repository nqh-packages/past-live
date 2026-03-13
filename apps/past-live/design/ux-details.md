# Past, Live — UX Details

Comprehensive UX decisions from persona council validation (2026-03-13). 6 personas tested, 8 decisions made.

**Source:** `design/research/council-verdict.md` | `design/research/personas.md`

---

## Decision Summary

| # | Decision | Choice | Source |
|---|----------|--------|--------|
| 1 | Camera mechanic | Demo-only: opt-in for users, shown in video for judges | Council blocker — 6/6 rejected |
| 2 | Text input | Hybrid: agent speaks, student can speak OR type | Council blocker — 4/6 voice-blocked |
| 3 | Character breaking | Never break character. Probing/hints all in-character | Council friction — 4/6 trust-destroyed |
| 4 | Onboarding | Instant scene — under 30 sec to action, zero tutorials | Council universal — 6/6 slow = quit |
| 5 | Post-session | Key facts summary + "what actually happened" comparison | Council friction — 5/6 can't verify learning |
| 6 | Scenario selection | Menu + input hybrid: 3 cards + open input field | Maya's Netflix insight + judges need to see demos |
| 7 | Session length | Flexible with natural ending (7-14 min) | Diego 5min, Aisha 45min, API max 15min |
| 8 | Corpsing rule | Rare narrator break — max 1x per session, must be earned | Huy: "like a real actor on set" |

---

## 1. Camera: Demo-Only

**Problem:** 6/6 personas rejected "Show Me Your Face." Tomás/Jun would uninstall. Zara would block on family devices.

**Solution:**

| Context | Camera Behavior |
|---------|----------------|
| Demo video (for judges) | Show camera moment working once — proves vision capability |
| Step 1 (input scan) | Camera ON — student shows textbook. Regular Gemini vision call, NOT Live API |
| Steps 2-10 (role-play) | Camera OFF by default |
| Climax moment | One-time opt-in prompt: "Want to try something?" with clear **Skip** button |
| If skipped | Agent uses affective dialog instead: "You sound nervous, advisor!" — same emotional interactivity, zero camera |

**System prompt rule:** Never guilt-trip skipping camera. If student declines: "Fair enough. I'll imagine your brave face — it's magnificent."

**Privacy:**
- No photo stored, ever
- Camera frames processed in real-time via Gemini, discarded immediately
- App UI shows: "Camera is off" indicator during role-play

---

## 2. Text Input: Hybrid Mode

**Problem:** Jun (accent anxiety), Tomás (family hearing), Maya (bedroom-only) can't always speak.

**Solution:** Agent ALWAYS speaks via voice. Student can respond via voice OR text.

```
┌─────────────────────────────┐
│  [Character portrait]        │
│  [Live subtitles]            │
│                              │
│  ┌────────────────────────┐  │
│  │ Type a response...     │  │
│  └────────────────────────┘  │
│  [🎙️ Hold to speak]         │
└─────────────────────────────┘
```

| Input Method | UI Element | Default |
|-------------|------------|---------|
| Voice (mic) | Hold-to-speak button | Primary (larger) |
| Text | Input field below subtitles | Secondary (always visible) |
| Camera | Only at opt-in moment | Hidden until prompted |

**For hackathon demo video:** Show voice interaction (matches challenge). Text input exists but isn't the focus.

**Technical:** Text input uses `session.sendRealtimeInput({ text: '...' })` — same API, no extra complexity.

---

## 3. Never Break Character

**Problem:** 4/6 personas said teacher-mode language ("Good try! Actually...") destroys trust instantly.

**Rules for system prompt:**

| Allowed | Forbidden |
|---------|-----------|
| Character reacts in-role | "Good try!" / "Actually..." / "Let's think about..." |
| "General! The harbor falls if we follow YOUR plan!" | "The correct answer is..." |
| "Khan is patient... but not forever" | "Let me give you a hint..." |
| Character laughs at student's joke | Breaking to explain the joke |

### Probing — All In-Character

| Probe Level | Example (Constantinople) |
|-------------|--------------------------|
| 1. Probe | "If we leave the chain unguarded, advisor, what stops their fleet?" |
| 2. Hint | "Think — the Genoese told us about the overland route. What did they mean?" |
| 3. Progress story | "The scouts return. They say Mehmed's men are dragging ships across Galata. Now what?" |
| 4. Graceful fail | "The harbor falls. But you know what? Even Constantine himself didn't see it coming. You're in good company." |

### Step 10 (Positive Insight) — In-Character

- "You think like a true strategist. Constantinople would be proud to have you."
- NOT: "Great job! You demonstrated understanding of Byzantine defense strategy."

### Corpsing Rule (Max 1x Per Session)

When student says something genuinely unexpected/hilarious:

```
Student: "What if we just yeet the cannons?"

NARRATOR (rare, max 1x):
"...even the storyteller didn't see that coming."

GENGHIS KHAN (back in character):
"You speak strangely, warrior. But I like your fire.
Now — WHERE do we yeet them?"
```

**Trigger:** Must be earned by genuinely unexpected input. NOT for every joke. The narrator voice is the same voice with a different tone (affective dialog handles this).

---

## 4. Instant Scene — Zero Onboarding

**Problem:** Every student persona said slow startup = instant quit. Diego: "If I see 'Welcome to Past, Live,' I'm out."

### First Visit Flow

| Time | What Happens |
|------|-------------|
| 0s | App opens. Browser mic permission prompt |
| 3s | Agent voice: "Hey! What's your name?" |
| 5s | Student: "Diego" |
| 7s | "Diego! What are you studying today?" |
| 10s | Student: "Ottoman Empire" (voice) or types topic |
| 12s | "Constantinople, 1453. The walls have held for a thousand years. You're the emperor's last advisor. Ready, or want to change anything?" |
| 20s | Student: "Ready" |
| 22s | 3... 2... 1... |
| 25s | **IN THE SCENE** |

**Name + age collected conversationally** by the character, not a form. Saved to Firestore naturally.

### Returning Visit Flow

| Time | What Happens |
|------|-------------|
| 0s | App opens. Recognizes student (cookie/localStorage) |
| 2s | Agent: "Diego! Last time you were advising the emperor and the harbor fell. Ready to try something new?" |
| 5s | Warm-up question from last session |
| 10s | "What are you studying today?" OR show home screen with scenario cards |

### Home Screen (Menu + Input Hybrid)

```
┌─────────────────────────────────┐
│                                 │
│  What are you studying?         │
│  [🎙️ speak or type here      ] │
│                                 │
│  ── or try a story ──           │
│                                 │
│  ┌────────┐ ┌────────┐ ┌────────┐
│  │  1453  │ │  1969  │ │  1206  │
│  │ Walls  │ │  Moon  │ │  Khan  │
│  │ fall   │ │ landing│ │ rises  │
│  └────────┘ └────────┘ └────────┘
│                                 │
│  🔒 Voice processed live,      │
│     never recorded              │
└─────────────────────────────────┘
```

- Input field is primary (supports voice + text)
- 3 scenario cards below for browsing / demo purposes
- Privacy footer always visible

---

## 5. Post-Session Summary

**Problem:** 5/6 personas couldn't verify if they actually learned. Tomás: "How do I know I'm ready for the test?"

### Summary Screen (after session ends)

```
┌─────────────────────────────────┐
│  Session Complete               │
│                                 │
│  📚 Key Facts                   │
│  • The chain across the Golden  │
│    Horn was Constantinople's    │
│    primary naval defense        │
│  • Mehmed II dragged 70 ships   │
│    overland to bypass the chain │
│  • Genoese mercenaries held     │
│    the sea walls until the end  │
│                                 │
│  📖 What Actually Happened      │
│  Your decision: Hold the harbor │
│  Reality: Mehmed bypassed it    │
│  entirely. Constantinople fell  │
│  on May 29, 1453.              │
│                                 │
│  💡 Suggested Next              │
│  → The Reformation, 1517       │
│  → Ottoman Golden Age, 1520    │
│  → Fall of Rome, 476 AD        │
│                                 │
│  [Start New Session]            │
└─────────────────────────────────┘
```

### How It Works

| Step | Technical Approach |
|------|-------------------|
| During session | Store transcriptions (input + output) in memory |
| Session ends | Send transcript to Gemini (non-Live, text model) with prompt: "Extract 3-5 key historical facts, compare student's decisions to actual history, suggest 3 related topics" |
| Display | Render summary screen in Svelte |
| Save | Key facts + outcome → Firestore student profile |

### Suggested Next Scenario

Generated by the post-session Gemini call based on:
- Topic just covered
- Connections to related historical events
- Student's interests from profile

This is the "Netflix up next" mechanic — keeps students coming back.

---

## 6. Session Length: Flexible Natural Ending

**Problem:** Diego wants 5 min. Aisha wants 45 min. API max is 15 min.

**Solution:** Agent manages pacing based on student engagement. No fixed timer.

| Student Behavior | Agent Response |
|-----------------|----------------|
| Fast answers, high engagement | Deeper drama, more twists, longer arc (up to 14 min) |
| Short answers, low engagement | Compress arc, reach resolution faster (7-8 min) |
| Struggling, many probes | Focus on one key moment, resolve gracefully (8-10 min) |
| Very engaged + asking questions | Extend with detail, max out the session (14-15 min) |

**System prompt instruction:** "Pace the story to reach a natural resolution. Read the student's engagement from response length, enthusiasm, and speed. A 7-minute session with a strong ending beats a 15-minute session that drags."

**Hard limit:** Live API disconnects at 15 min. Agent MUST wrap up by ~14 min to deliver step 10 (positive insight) before cutoff.

---

## 7. Voice Data: Ephemeral + Transparent

**Decision:** Audio streams real-time through Cloud Run relay to Gemini. Never stored on our server.

| Data Type | Stored? | Where | Duration |
|-----------|---------|-------|----------|
| Audio (voice) | NO | Streamed, discarded | Real-time only |
| Video (camera frames) | NO | Streamed, discarded | Real-time only |
| Transcriptions (text) | YES | Firestore | Persistent (for summary + warm-ups) |
| Profile data | YES | Firestore | Persistent (full profile) |

**App UI:** Privacy footer on home screen: "Voice processed live, never recorded"

**Gemini API terms:** Free tier may use data for model improvement. Note in README as a known limitation.

---

## 8. Student Profile: Full Schema

**Decision:** Implement complete StudentProfile. More impressive for judges (personalization depth).

```typescript
interface StudentProfile {
  id: string;
  name: string;
  age: number;
  createdAt: Timestamp;
  lastSessionAt: Timestamp;
  learningPatterns: {
    effectiveProbes: ('encourage' | 'hint' | 'rephrase' | 'progress')[];
    reasoningStyle: 'emotional' | 'logical' | 'creative' | 'mixed';
    engagementLevel: 'high' | 'medium' | 'low';
  };
  personality: {
    traits: string[];
    humorStyle: string;
    confidenceLevel: 'bold' | 'moderate' | 'cautious';
  };
  sessions: {
    scenarioId: string;
    date: Timestamp;
    outcome: 'pass' | 'probed' | 'fail';
    probesUsed: number;
    topicsCovered: string[];
    keyFacts: string[];
    agentInsight: string;
  }[];
  nextWarmUp: {
    question: string;
    context: string;
  };
  suggestedScenarios: string[];
}
```

**How profile gets populated:** Agent generates personality/learning observations during session. Post-session Gemini call extracts structured data from transcript and updates Firestore.

---

## Hackathon Scope: Features to Build

| Feature | Priority | Effort | Status |
|---------|----------|--------|--------|
| Core voice role-play (Live API) | P0 | High | Not started |
| WebSocket relay (Hono/Cloud Run) | P0 | High | Not started |
| Home screen (input + 3 cards) | P0 | Low | Not started |
| In-session UI (portrait, subtitles, mic) | P0 | Medium | Not started |
| Post-session summary screen | P1 | Medium | Not started |
| Imagen character portrait + color theme | P1 | Medium | Not started |
| Suggested next scenario | P1 | Low | Not started |
| Firestore student profile | P1 | Medium | Not started |
| Text input fallback | P2 | Low | Not started |
| Camera opt-in moment | P2 | Medium | Not started |

---

## Persona Council Key Quotes (for reference)

| Persona | Verdict | Quote |
|---------|---------|-------|
| Maya, 15 | YES | "This is literally what I wish Character.AI was but for school" |
| Tomás, 16 | MAYBE | "If after 20 min of roleplaying I still can't answer the test questions, what was the point?" |
| Aisha, 14 | YES | "I want it to make me DEFEND my reasoning, not guide me to the right answer" |
| Jun, 17 | NO | "This is designed for confident English speakers who don't mind being watched. That's not me" |
| Zara, 42 | NO | "You're asking me to hand over my minor's face, voice, name, and age to an app that sends it to Google" |
| Diego, 13 | YES | "If the first session is fire, I'll be back tomorrow. If it's mid, I'll forget this app exists by Thursday" |
