# Persona Council Verdict — Story Scope & Session Design

**Evaluated:** One decision moment (5-7 min) vs full narrative arc (14 min), topic clarification flow, choice card detail level
**Date:** 2026-03-14
**Personas:** 6 (Maya 15, Tomás 16, Aisha 14, Jun 17, Zara 42/parent, Diego 13/ADHD)
**Research goal:** Feature validation — session length, interaction patterns, onboarding

---

## Universal Truths (6/6 agree)

| Truth | Evidence | Personas |
|-------|----------|----------|
| **5-7 min wins over 14 min** | Every persona rejected 14 min. Diego: "My meds are gone by 7pm." Tomás: "14 minutes is forever." Zara: "That's a full TV episode." Aisha: "I have 30 min between debate and dinner." | All 6 |
| **Choice cards are essential** | No persona wanted open-ended "what do you do?" Jun: reduces shame/failure anxiety. Diego: "I don't want to figure out how to talk to a Byzantine emperor." Tomás: without choices, he's stranded | All 6 |
| **Title + description on cards** | Title alone isn't enough context. Aisha: "I need the WHY — 'Negotiate — buys time but signals weakness to Mehmed.'" Tomás: "I don't know enough history for just a title." | All 6 |
| **Vague topics need clarification** | Every persona wants "which moment?" options for broad topics. Maya: "I'm not studying 'the Vietnam War' in general." Jun: "Korean War" failed — he assumed his topic was wrong, not the server | All 6 |
| **The concept is genuinely compelling** | Despite the app being broken during testing, every persona expressed interest in the core idea. Maya: "OverSimplified meets Character.AI." Aisha: "ChatGPT explains history. This could make me argue it." | All 6 |

## Blockers (personas who would NOT use the app)

- **Camera pre-checked without explanation** — 3 personas blocked (Zara, Jun, Tomás). Zara: "I'm done. That's a no from me right there." Jun: "I'm in my school dormitory. Other students walk behind me." **Decision: camera OFF by default, explain purpose before opt-in.**
- **No privacy policy** — 1 persona hard-blocked (Zara), 1 concerned (Jun). Zara: "I'm not approving a voice + camera AI app for a 14-year-old that doesn't have a single word about data handling." **Decision: add privacy statement (at minimum for hackathon: "voice processed in real-time, never stored").**

## Key Insights by Persona

### Maya (15, Enthusiast, Drama Club)
- **Session scope:** "5-7 min, something happens, I make a decision, I see what actually happened — that's exactly the length of a YouTube video"
- **Vague topics:** MUST ask which moment. "I'm studying specific events for specific essay questions"
- **Summary is study payoff:** "Those KEY FACTS bullets are exactly what I'd screenshot and put in my notes. That's the whole loop."
- **Killer quote:** "It's OverSimplified meets Character.AI and that's genuinely the app I wanted"
- **Would use:** During homework time (7-10pm) instead of OverSimplified videos

### Tomás (16, Reluctant, C+ Student)
- **Session scope:** "Definitely one moment. 5-7 minutes. I could do that while eating dinner."
- **Choices:** Title + one-line description. "Just a title isn't enough context"
- **Vague topics:** Show 3 options. "He doesn't trust the app enough yet to let it decide"
- **Killer quote:** "If I could type 'Vietnam War' and actually have a conversation with someone from that time period — I'd probably use it. Not every day but the night before a history test."
- **Would use:** Night before tests only. 30 min max study sessions.

### Aisha (14, Pragmatist, Debate Team)
- **Session scope:** "Option A is what I want. Option B sounds like something my teacher would assign."
- **Choice detail:** Needs the WHY. "Negotiate — buys time but signals weakness to Mehmed"
- **Cause-and-effect:** "If this app just roleplays but doesn't give me the 'here's what your choice reveals about the historical forces at work' moment, it's just fun — not useful"
- **Killer quote:** "ChatGPT explains history. This could make me argue it. That's completely different."
- **Would use:** Every night before a debate tournament. Would tell her coach.

### Jun (17, Cautious, Korean Exchange Student)
- **Session scope:** Short is mandatory. "In Korea we just memorize dates. This makes it real."
- **Input mode:** Text MUST be visually primary, not secondary to voice. "I will not speak out loud in a school dormitory"
- **Choices:** Cards reduce anxiety. "For Korean students, everything is scored. An app that says there is no wrong answer — that is genuinely interesting to me."
- **Killer quote:** "'No wrong answers' — I read that three times. If the app delivered on that promise and I could type instead of speak, I might use it every day."
- **Would use:** Daily if text-first. Never if voice-only.

### Zara (42, Skeptic Parent)
- **Session scope:** "5-7 min is homework-length. 14 min is too long — that's a full TV episode."
- **Camera:** Hard blocker. Must be OFF by default with explanation before opt-in.
- **Privacy:** No policy = no approval. Period.
- **Structure:** "The choice cards with location/status/role/threat level are really smart — much better than open-ended voice chat. I can see what my kid is getting into."
- **Killer quote:** "If the privacy basics were there, I'd be seriously considering approving this."
- **Would approve:** Only with privacy policy + camera off by default.

### Diego (13, ADHD, Enthusiast-if-engaged)
- **Session scope:** "5-7, no contest. My meds are gone by 7pm. One YouTube video length is all I've got."
- **Choices:** "Cards 100%. Show me three options and I'll pick the dramatic one."
- **Multiple sessions:** "Do one scenario, see the key facts, feel like I did something. Multiple short every time."
- **Visuals:** Character portrait is critical. "A face makes it a person. A blank box is a text document."
- **Killer quote:** "The concept is genuinely interesting in a way that Quizlet isn't."
- **Would use:** Multiple short sessions. Needs constant stimulation (visuals, choices, consequences).

## Split Opinions

| Topic | Split | Design Tension |
|-------|-------|---------------|
| **Voice vs text default** | Maya/Diego/Aisha: voice is exciting. Jun/Tomás: voice is scary. | Text and voice must feel equally primary. Neither should feel like a fallback. |
| **Preset cards vs custom topic** | Maya/Diego: jump straight to preset cards. Aisha/Jun/Tomás: need custom topics for their actual schoolwork. | Both paths must work equally well. Presets for discovery, custom for study. |
| **How much scaffolding** | Aisha: "challenge me." Diego: "show me three options and I'll pick." | Choices solve both — Aisha can ignore cards and speak freely, Diego taps. |

## Surprising Insights

1. **"No wrong answers" is the killer copy** — Jun read it three times. Diego loved it. Tomás would trust the app more. This single phrase addresses the deepest fear across all personas: looking stupid.
2. **Summary page = study payoff** — Maya would screenshot KEY FACTS for her notes. This is the retention mechanism. Without a real summary (currently hardcoded), the learning loop is broken.
3. **The aesthetic works** — Every persona liked the dispatch/terminal vibe. Maya: "chills." Diego: "looks like a spy game." Even Zara acknowledged it's compelling. Don't change the visual direction.
4. **Multiple short sessions > one long** — Diego explicitly said this. Tomás implied it. This suggests a "playlist" model: do 3 moments in 15 min instead of 1 long story.

## Recommendations (by priority)

1. **Ship Option A (one decision moment, 5-7 min)** — 6/6 unanimous. No debate.
2. **Camera OFF by default** — Blockers for 3 personas including the parent gatekeeper. Explain purpose before opt-in.
3. **Topic clarification with "which moment?" cards** — 6/6 want this for vague topics. Title + description format.
4. **Choice cards with title + description + WHY** — Essential for all personas. Reduces anxiety (Jun), provides scaffolding (Diego/Tomás), adds depth (Aisha).
5. **Text input visually equal to voice** — Jun/Tomás won't speak. Text can't feel like a fallback.
6. **Real summary from actual session** — Maya's study payoff. Currently hardcoded = broken learning loop.
7. **Privacy statement** — Zara won't approve without one. Add at minimum for hackathon.
8. **"No wrong answers" — make it more prominent** — It's the most powerful copy in the app and it's buried in small bullets.

## Persona Summary

| Persona | Age | Attitude | Session Pref | Input Pref | Choices? | Would Use? |
|---------|-----|----------|-------------|------------|----------|------------|
| Maya, 15 | Enthusiast | 5-7 min | Voice first | Yes, title+desc | Yes, during homework |
| Tomás, 16 | Reluctant | 5-7 min | Type/tap | Yes, title+desc | Maybe, night before tests |
| Aisha, 14 | Pragmatist | 5-7 min | Voice + type | Yes, with WHY | Yes, before debate tournaments |
| Jun, 17 | Cautious | 5-7 min | Text only | Yes, reduces anxiety | Yes if text-first, never if voice-only |
| Zara, 42 | Skeptic (parent) | 5-7 min | N/A (gatekeeper) | Structured = safer | Only with privacy + camera off |
| Diego, 13 | ADHD dual | 5-7 min | Tap cards | Essential | Yes, multiple short sessions |
