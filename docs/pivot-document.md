# Past, Live — 4 Product Pivots Document

Synthesized from 33 session logs (93MB), 139 commits, March 13-16 2026.

Blog title: **"I Told Gemini Live to Be Funny. It Audibly Recited My System Prompt."**
Angle: Gemini Live API deep-dive — every pivot was caused by Gemini behavior.

---

## Pivot 1: Quiz App → Phone Call Concept

**When**: Mar 13 evening → Mar 14 2:04am
**Commit**: `c8af139` — "shit. that's a new app"
**Duration**: ~12 hours from scaffold to pivot

### What it was

Students were cast as historical role-players: "You ARE Constantine's advisor. The city is under siege. What do you do?" High-pressure decision-making quiz with roleplay expectations. The character quizzes the student.

### What broke

Dogfooding with 6 personas (ages 13-42) revealed the advisor framing triggered **performance anxiety**:
- Jun (17, Korean): won't roleplay — shame of performing
- Tomás (16, ADHD): freezes at "what do you do?" — doesn't know the stakes
- Aisha (14): anxiety around decision-making
- Diego (13): zones out in long advisor narratives

David's feedback: *"The people whom we are targeting are the people who do not know shit about history. That's where they're learning about it. But the language is really hard to understand. It has to be very approachable. I had to ask the model three times before I could understand what's going on."*

### The moment

> "you're calling somebody back in time, asking them about everything. You're not just the one making decision. You call the people and they're gonna tell you. You're gonna feel it too."

### Gemini connection

The original prompt had Gemini in a narrator/advisor voice that was:
- Too slow to get to the point (character setup took forever)
- Too formal/historic (language inaccessible)
- Created decision paralysis ("What do you do?" with no context)

The pivot didn't change Gemini's capabilities — it changed **who initiates**. Instead of Gemini-as-narrator asking students what they'd do, Gemini-as-character calls because they need help.

### Before → After

| Before | After |
|--------|-------|
| "You ARE Constantine's advisor" | "Constantine XI is calling you" |
| Student must decide outcomes | Student asks questions, listens |
| Narrator + character voices | Character only, no narrator |
| Quiz/test framing | Conversation framing |
| Performance anxiety | Curiosity-driven |

### Architecture impact

Zero backend changes. Zero frontend component changes. Zero new files. The relay, WebSocket protocol, audio pipeline, tool declarations — all stayed. Only system prompts and UI copy changed.

---

## Pivot 2: Panicking Heroes → Calm Funny Storytellers

**When**: Mar 14 evening → Mar 14 11:11pm
**Commit**: `bc0a835` — "shit." — pivot v3
**Duration**: ~6 hours from testing to commit

### What it was

Characters were IN their historical crisis, stressed and urgent. Constantine XI was panicking about the walls. Gene Kranz was sweating fuel. The emotional intensity was turned up.

### What broke

Testing revealed Gemini Live's native audio made stressed/panicked characters **exhausting to talk to**. A 5-7 minute call with someone panicking isn't educational — it's draining. The affective dialog feature (emotion in voice) amplified the stress instead of creating engagement.

### The moment

> "They can sound emotional, but only in a funny way. They are not actually in the stress."

> "Constantine XI isn't panicking about the walls — he's like 'Yeah, the walls fell. Wild story. Let me tell you about it.'"

### Gemini connection

`enableAffectiveDialog` + native audio made emotional characters TOO convincing. A panicking Constantine with real vocal stress was more overwhelming than educational. The same feature that makes the app work (emotional voice) needed a different emotional register: **wit, not panic**.

Also: model was too passive. Tesla asked "what brings you here?" instead of launching stories. Gemini needed explicit instruction: "YOU lead. Don't ask what they want — TELL them something wild."

### Before → After

| Before | After |
|--------|-------|
| Characters IN crisis | Characters who SURVIVED, looking back |
| Stressed, urgent, panicking | Calm, funny, self-aware |
| "The walls are falling!" | "Yeah, the walls fell. Wild story." |
| Emotional intensity | Understatement + absurdity |
| Student must help | Student gets to hear |

### Key discovery

Humor style defined: NOT jokes. The gap between how insane the situation was and how casually you describe it. Self-deprecation. Absurdity framing. "They dragged 72 ships over a mountain. Over. A. Mountain."

User: *"Funny is the human thing. I want to extract whatever transcript we have available of like real funny moments... because LLM AI in general are so unfunny."*

---

## Pivot 3: Scripted Acts → Bag-of-Material Architecture

**When**: Mar 15 → Mar 16 12:41am
**Commit**: `052040a` — bag-of-material prompt architecture
**Duration**: ~36 hours of script iteration failure before breakthrough

### What it was

Four versions of scripted conversation structures, each trying to give the character a path through the conversation:

**V1 — Exact dialogue lines**
```
Beat 1: "So imagine this. You spend twelve years -- twelve -- fighting
the biggest empire in the world."
```
Student interrupted. Model restarted the same beat word for word. Three times. Then apologized: "My apologies. I got caught up in the drama."

**V2 — Hints instead of lines**
```
CONVEY: 12-year war, barefoot soldiers, mountain ranges, Spain's empire
Then ASK: "Can you imagine that?"
```
40-second monologue. Model read the hint list as a checklist and delivered everything in sequence.

**V3 — Minimal hint + explicit stop**
One hook, one sentence, one question. "Then STOP TALKING and wait."
Mechanical beat-jumping. Model acknowledged student, ignored what they said, moved to next beat.

**V4 — Just destinations**
"By the end of this act, the student should understand that Bolívar's coalition is fracturing."
Model couldn't project personality. Knew where to go but had nothing specific to work with. Pleasant, vague filler.

### What broke

All four versions shared the same fundamental problem: **linear scripts don't survive a real-time voice conversation**. Students interrupt, ask unexpected questions, go on tangents. A script that says "do A then B then C" breaks the moment someone says "wait, what about X?"

### The moment

From 9 "dream conversation" transcripts the user wrote, the best moments came from specific weird historical facts delivered casually:
> "I looked like a coin. Which honestly, for a queen, was more useful."
> "A carpet would have been ridiculous."
> "They dragged 72 ships over a mountain. Over. A. Mountain."

These aren't things you put in a sequence. They're material the character grabs when the conversation makes them relevant.

### Gemini connection

Gemini Live's native audio model is fundamentally conversational — it responds to flow, not structure. When given a script, it either:
- Recites it verbatim (V1)
- Dumps everything at once (V2)
- Follows mechanically, ignoring the human (V3)
- Has nothing to say (V4)

When given a **bag of standalone material** (hooks, facts, choices, scenes), it picks the right piece based on what the student just said. The model is good at relevance matching in real-time. It's bad at following sequences.

### Before → After

| Before | After |
|--------|-------|
| Linear acts (Act 1 → Act 2 → Act 3) | Bag of material (pull based on flow) |
| "Say this, then this" | "You have these hooks. Use them when they fit." |
| Model follows sequence | Model matches to conversation |
| Interruptions break the flow | Interruptions redirect to new material |
| Fixed arc | Emergent arc |

### The architecture

Flash generates a bag of material per character:
- **Hooks**: myth/truth combos — "wait, WHAT?" moments
- **Facts**: verified historical details, one at a time
- **Anchors**: universal experience the student relates to
- **Choices**: 2-3 decisions with pre-mapped consequences
- **Scenes**: image descriptions for `show_scene` tool
- **Closing line**: personal observation about the student

Live pulls from the bag based on conversation momentum.

### First success

Cleopatra asked the student's name ("And you are?"), used it throughout ("Simon the young"), pulled hooks based on actual words (said "pretty" → coin myth-bust, said "Spanish" → nine languages, said "fun" → linen sack), closed with personal observation ("A practical young man, Simon"). No scripted acts. No mechanical beats.

---

## Pivot 3.5: The Humor Unlock (sub-pivot of bag-of-material)

**When**: Mar 16 3:29am
**Commits**: `0df4f32`, `17982a9`, `79c5b30`
**Duration**: ~3 hours of humor iteration

### What happened

Bag-of-material worked, but characters sounded like British diplomats. "One must adapt to the prevailing currents." Technically correct. Zero personality.

### THE BLOG TITLE MOMENT

When told "be funny," Gemini started **reciting the system prompt out loud** — word for word, in character voice. The hook lines, the facts, the closing thread. Not improvising. Just reading what was written in the prompt as if it were dialogue.

> "I told Gemini to be funny and it recited my prompt."

### What failed

1. **"Never tell jokes, facts ARE the comedy"** → Model played it safe and serious. Too restrictive.
2. **"Be FUNNY, tease, joke"** → Model recited system prompt verbatim as dialogue
3. **Student asked for jokes** → Model: "Your ability to find humor is quite charming." Instead of being funny.

### What worked

The formula: **"Be FUNNY"** + **"reactions/humor FREE, facts LOCKED"** + bag-of-material.

> "You CAN make jokes, tease, invent funny personal details. Historical events stay locked. Everything else is fair game."

Result — Cleopatra opened with: "A distant relative? How wonderfully convenient after two millennia. Are we discussing inheritances?" Genuine humor. "Textbooks! They do tend to drain the life right out of things."

---

## Technical Pivots (Gemini Live API discoveries)

These aren't product pivots but are essential for the Gemini-focused blog angle.

### googleSearch crash

Added `googleSearch` tool → immediate session crash. `closeCode=1011`. Known issue #843 (43+ reactions, open since May 2025). Tool calling + native audio is unstable. Removed entirely.

Rule: minimal tools, one per turn, all `NON_BLOCKING`.

### sendRealtimeInput triggers VAD

`sendRealtimeInput({ text })` triggers Voice Activity Detection. Gemini treats text input as "user activity" and fires `interrupted`, clearing the audio queue mid-sentence. Every cutoff in testing happened 1-2s after a re-anchor injection. 100% correlation.

Fix: `sendClientContent` with `turnComplete: false` for context injection. Does not trigger VAD.

### VAD config was inverted

Code had `START_SENSITIVITY_HIGH` (detect noise too fast) + `END_SENSITIVITY_LOW` (never let user finish). Correct: `START_LOW` + `END_HIGH`. Explains why characters kept interrupting students.

### Audio chunk size

256ms (4096 samples) → 64ms (1024) → 32ms (512). Google recommends 20-40ms. Affects latency, VAD accuracy, conversation feel. Should be fixed day one.

### System prompt order

Google's guidance: persona first, rules second, guardrails last. "Unmistakably" outperforms "MUST" and "NEVER" for voice models. Held up across every test session.

### Context compression

Audio burns 32 tokens/sec both directions. 10-minute call ≈ 38,400 tokens. `contextWindowCompression: { slidingWindow: {} }` with `triggerTokens: 10000` enabled consistent 10-minute sessions.

---

## What the current blog v4 is missing

| What's missing | Where it belongs |
|----------------|-----------------|
| **Pivot 1 (quiz → call)** barely exists | Should be the opening — the original concept and WHY it failed |
| **David's feedback** | The trigger quote that started everything |
| **Performance anxiety** insight | WHY the quiz format died — it's a Gemini Live insight (voice makes quiz pressure worse) |
| **"shit. that's a new app"** as a section header | The actual commit message, visceral |
| **"shit."** as pivot 3 header | Same energy, shorter |
| **Affective dialog making panic TOO real** | Gemini-specific: the feature that makes the app work also broke the tone |
| **Prompt recitation as blog title payoff** | The title promises this story. v4 doesn't deliver it explicitly |
| **The dream conversations** | User wrote 9 fake transcripts. The best lines came from those. That's the creative process |
| **"LLM AI in general are so unfunny"** | Sets up the humor struggle |
| **Expert panel quote** | "The smartest submission you can't actually use" — devastating, honest |
| **User testing failure** | Bolívar delivering Cleopatra's material. Maya, 15: "they would laugh AT the app" |

---

## Suggested blog structure (Gemini Live deep-dive angle)

1. **The pitch** (keep from v4 — it's good)
2. **How I build things** (keep — establishes the AI-directed workflow)
3. **Day 1: A quiz app** — original concept, David's feedback, why quiz + voice = performance anxiety
4. **"shit. that's a new app"** — the pivot to phone calls, zero architecture changes
5. **Three Gemini models collaborating** (keep from v4 — strongest technical section)
6. **"shit."** — panic doesn't work in voice. Affective dialog too convincing. Calm storytellers
7. **I told Gemini to be funny** — four script versions fail, bag-of-material breakthrough, prompt recitation
8. **The audio pipeline** — VAD, sendRealtimeInput vs sendClientContent, chunk sizes
9. **"The smartest submission you can't actually use"** — user testing, expert panel, what broke
10. **When it works** (keep from v4 — the emotional payoff)
