# Persona Council Verdict

**Evaluated:** Past,Live — real-time voice + camera AI history role-play tutor
**Date:** 2026-03-13
**Personas:** 6 (Maya 15 enthusiast, Tomás 16 reluctant, Aisha 14 pragmatist, Jun 17 cautious/ESL, Zara 42 skeptic parent, Diego 13 ADHD)
**Research goal:** Feature validation — would students actually use this, what brings them back, what turns them off

---

## Universal Truths (6/6 agree)

| Truth | Evidence | Personas |
|-------|----------|----------|
| Camera is a dealbreaker in current form | Every persona rejected or heavily resisted the "show me your face" mechanic | All 6 |
| Voice quality makes or breaks the app | Robotic/Siri voice = instant quit. Must sound like a real dramatic narrator | All students + Diego explicitly |
| First 30 seconds decide everything | Long onboarding, tutorials, account setup = immediate close | All students |
| Post-session review material is needed | No way to verify learning = "was that studying or entertainment?" anxiety | All 6 (students need proof, parent needs evidence, Aisha needs transcript) |
| The core concept excites | Being CAST as a historical character resonates strongly across all attitudes | 5/6 students (Jun cautious but interested in concept) |

---

## Blockers (personas who would NOT use the app because of this)

### 1. Camera / "Show Me Your Face" — 6/6 blocked or resisted

| Persona | Reaction | Quote |
|---------|----------|-------|
| Tomás | Would close app instantly | "I don't even turn my camera on for Zoom for school" |
| Jun | Would uninstall immediately | "This alone would make me uninstall immediately" |
| Zara | Would block on family devices | "Facial recognition on a minor... massive legal and ethical problem" |
| Aisha | Parents would force delete | "My parents would see camera permission and immediately ask why" |
| Maya | Would do it IF alone, IF funny, IF trust earned | "If it feels cringe or the reaction is generic, I'd turn camera off permanently" |
| Diego | Would do it IF alone, IF photo not saved | "Does it save the photo? Because if it saves my face somewhere, absolutely not" |

**Severity:** BLOCKER. The "Show Me Your Face" mechanic as designed would prevent adoption. Only 2/6 personas (Maya, Diego) would consider it, and only under strict conditions.

### 2. Voice-only with no text alternative — 4/6 blocked

| Persona | Reason | Quote |
|---------|--------|-------|
| Tomás | Family can hear, social embarrassment | "They'd think I lost it" |
| Jun | Accent anxiety, shame-avoidant | "What if my roommate hears me talking to myself in bad English?" |
| Maya | Can only use in bedroom alone | "This is a bedroom-only app for me" |
| Aisha | Voice is slower than text for information | "I'm stuck at the pace the AI talks" |

**Severity:** BLOCKER for Jun and Tomás. FRICTION for Maya and Aisha. A text fallback mode would unlock 2 blocked personas.

---

## Friction Points (usable but annoying)

### 3. No learning verification — 5/6 frustrated

Students can't tell if they actually studied or just had fun. Parents can't verify educational value.

| Persona | Need | Quote |
|---------|------|-------|
| Tomás | Score + flashcard output | "How do I know when I'm done? How do I know I'm ready for the test?" |
| Aisha | Transcript + citations + gap analysis | "I need to see measurable improvement" |
| Maya | Light signal (not grade) | "Something that tells me this wasn't just entertainment" |
| Zara | Parent-visible evidence | "A mode where I can sit with my kid and try it together" |
| Diego | Achievements / dopamine hits | "My brain needs rewards. Little dopamine hits" |

### 4. Doesn't connect to actual test material — 3/6 frustrated

| Persona | Quote |
|---------|-------|
| Tomás | "If after 20 min of roleplaying I still can't answer the test questions, what was the point?" |
| Tomás | "Unless this thing somehow knows what's on my test, Quizlet wins every time" |
| Maya | "I'd need proof it actually helps me on tests before I'd trust it" |
| Aisha | "Exams want me to regurgitate specific dates and terms. This trains thinking, not memorization" |

### 5. AI breaking character = trust destroyed — 4/6 mentioned

| Persona | Quote |
|---------|-------|
| Maya | "The SECOND it feels like 'Great job! You're learning about the Ottoman Empire!' I'm out" |
| Aisha | "If it goes 'Great idea, brave advisor!' — that's useless" |
| Diego | "If Genghis Khan is like 'You DARE suggest that?' — that's different. That's fun" |
| Tomás | "If it feels like a lecture disguised as a game, I can smell that from a mile away" |

---

## Minor Issues

| Issue | Personas | Detail |
|-------|----------|--------|
| Historical accuracy anxiety | Aisha, Maya | "One historically inaccurate response and I'll think this is ChatGPT with a costume on" |
| Price sensitivity | Maya, Aisha | Max $5-10/month. "I'm 15. I don't have money" |
| App design looks "educational" | Maya | "If it looks like an educational app for 8-year-olds, I will delete it so fast" |
| No pause/resume | Maya | "If my mom calls me downstairs, can I pause and come back?" |
| Session length flexibility | Aisha, Diego | Aisha wants 45 min deep dives; Diego wants 5 min episodes |

---

## What Worked

| Feature | Personas | Quote |
|---------|----------|-------|
| Being CAST as a character | Maya, Diego, Aisha | Maya: "That's the thing that makes this different from every other study tool" |
| Voice conversation (concept) | Maya, Diego | Diego: "A MILLION times better than reading. Podcasts I listen to for hours" |
| AI pushing back on bad reasoning | Aisha, Maya | Aisha: "I want it to make me DEFEND my reasoning, not guide me to the right answer" |
| Drama twists / unexpected events | Diego, Maya | Diego: "Does that kind of surprise keep your attention? YES" |
| Warm-up from last session (cliffhanger) | Maya | "That's a cliffhanger. I'm a sucker for cliffhangers" |
| No reading required | Diego | "I literally cannot read a textbook paragraph without re-reading it four times" |
| 15-minute sessions | Maya, Tomás | Maya: "My attention span for studying is like 15 minutes" |

---

## Split Opinions

### Voice-only: Feature or bug?

- **Maya + Diego** love voice — immersive, feels like a game/podcast, drama kids thrive
- **Jun + Tomás** hate voice — accent anxiety, family can hear, social embarrassment
- **Aisha** ambivalent — voice is good for articulation practice but slower than text for information

**Design tension:** Voice IS the product (Live Agent challenge requires it), but it locks out ~40% of potential users. Text fallback doesn't satisfy hackathon requirements but would massively improve real-world adoption.

### No scores: Freedom or anxiety?

- **Maya** appreciates no pressure but still needs "some kind of signal"
- **Tomás** needs scores to know he studied ("When I get 45/50 I can tell myself okay, I know this")
- **Aisha** wants progress tracking but not points ("show me what topics I've covered and where I had gaps")
- **Diego** wants achievements and unlockables

**Design tension:** Removing scores removes pressure (good for anxious/ADHD) but removes verifiability (bad for pragmatists/parents). Solution: lightweight post-session summary, not scores.

---

## Surprising Insights

1. **Maya wants a scenario MENU like Netflix** — "Let me browse historical moments like I'm picking a show to watch. Give me thumbnails and one-line hooks." This reframes the app from "study tool" to "adventure library."

2. **Tomás would use it IF it generates flashcards afterward** — "After the role-play, show me the 10 key facts I should know for the test." The story is the hook; the flashcard output is the study justification.

3. **Aisha sees this as debate prep, not history prep** — "The skill it trains IS debate. You're thrown into a situation with incomplete information, you have to construct arguments on the spot." This is a positioning insight — "Socratic sparring partner" not just "history tutor."

4. **Diego wants background music and visuals** — "Audio alone might not be enough for my brain. Audio plus even basic visuals? That's the sweet spot." The character portrait + color theme already planned may satisfy this.

5. **Jun reveals a completely different product** — He wants text-only, no camera, transcript review, progress metrics, privacy in Korean. He's describing a different app entirely. ESL learners are not the hackathon audience.

6. **Zara's approval conditions are enterprise-grade** — SOC 2, COPPA compliance, parent dashboard, data deletion, security audit. This is the bar for real deployment, not hackathon. But her concerns are the reason past-live needs a clear privacy story even for judges.

7. **Maya and Diego both want multiplayer** — "Can my friend and I be in the same scene?" This is out of scope for hackathon but is the obvious v2 feature.

---

## Persona Summary

| Persona | Role | Tech | Attitude | Key Need | Would Use? |
|---------|------|------|----------|----------|------------|
| Maya, 15 | Drama kid, honors | High | Enthusiast | Immersive + verifiable learning | YES (if voice quality good, text fallback exists) |
| Tomás, 16 | Soccer, C+ student | Medium | Reluctant | Minimum effort, test-connected | MAYBE (needs flashcard output, text mode, no camera) |
| Aisha, 14 | Debate team, straight A | High | Pragmatist | Deep reasoning + transcript | YES (for debate prep; needs accuracy + citations) |
| Jun, 17 | Korean exchange | Medium | Cautious | Text-only, no camera, no shame | NO (too many anxiety triggers in current form) |
| Zara, 42 | Parent, healthcare IT | High | Skeptic | Privacy + evidence of learning | NO (camera = blocked; voice recording ambiguity = blocked) |
| Diego, 13 | ADHD, comics lover | Medium | Enthusiast/reluctant | High stimulation, short segments | YES (if first 30 sec hook, no lectures, stays in character) |

---

## Recommendations (by priority)

### 1. REMOVE "Show Me Your Face" camera mechanic from MVP

6/6 personas rejected or heavily resisted it. For hackathon: demonstrate the CAPABILITY (camera reads expression) but make it opt-in with a clear "skip" that doesn't penalize. The voice conversation IS the wow factor, not the camera. Judges will see the camera demo in the video; users won't use it in practice.

**Alternative wow moment:** Agent reacts to voice TONE (already have affective dialog). "You sound nervous, advisor. Constantinople needs confidence!" — same emotional interactivity, zero camera.

### 2. Add post-session summary output

After every session, show:
- Key historical facts covered (3-5 bullet points)
- What the student demonstrated understanding of
- "What actually happened" comparison (Maya's request)
- Optional: export as flashcards (Tomás's request)

This bridges the "fun vs studying" gap that 5/6 personas identified.

### 3. Voice is the product — but acknowledge the constraint

For hackathon: voice-only is correct (it's the Live Agent challenge). For real deployment: text fallback mode would unlock Jun and Tomás entirely. Not a hackathon priority but note it in the submission as a "future feature."

### 4. AI must NEVER break character

The probing system should stay in-character. Not "Good try! The answer is..." but "General, if that's your plan, the Janissaries will overrun us by nightfall. Think — what did we use to defend the harbor?" Every persona who mentioned this agreed: breaking character = trust destroyed.

### 5. First 30 seconds must be action, not onboarding

No tutorials. No account creation flow. No "Welcome to Past,Live." Open → "What are you studying?" → student answers → "Constantinople, 1453. The walls have held for a thousand years. You are the emperor's last advisor. The Ottoman fleet is visible on the horizon. What do you do?" — under 30 seconds to scene.

### 6. Scenario menu (post-hackathon)

Maya's "Netflix of historical adventures" insight is the strongest retention mechanic identified. For hackathon: 3 demo scenarios is fine. For real product: browsable library with thumbnails and hooks is the killer feature.
