# Past, Live — UX Details

"Call the past" — students call historical figures to learn through conversation.

**Source:** Persona councils (2026-03-13, 2026-03-14) | Huy's live testing sessions

---

## Core Mental Model

```
Student is curious about something
  → Types topic (or speaks via Web Speech API, or scans textbook)
  → Flash returns 3 people+moments to call
  → Student picks one
  → Preview card (portrait, era, teaser) — scene images pre-generated here
  → Calling screen (iPhone-style)
  → Character picks up, already knows who's calling (Firestore profile + past sessions)
  → Conversation: character tells their story, student asks questions
  → Student hangs up OR character wraps up
  → Call log: key facts, what happened after, character's message
  → "Call someone else" (suggested next)
```

The student is the CALLER. They dial into the past. The character answers.

---

## Decision Summary

| # | Decision | Choice |
|---|----------|--------|
| 1 | Camera | Input only (textbook scan). No camera during call |
| 2 | Voice + Text | Mic ON by default (phone call). Mute toggle. Text always available. Hang up button |
| 3 | Character lock | No narrator. Everything is the character. Multi-character via `switch_speaker` tool |
| 4 | Onboarding | Profile loaded from Firestore. Character knows the student. Zero tutorials |
| 5 | Post-call | Call log: who, duration, key facts, what happened after, character's message, next calls |
| 6 | Session length | Natural conversation. 10 min hard max. Timer counts UP (phone call style) |
| 7 | Emotion | Clear boundaries: emotion serves learning, not attachment |
| 8 | Topic selection | Any topic → Flash returns 3 person+moment cards. Presets on home screen |
| 9 | Tone | Character-driven. No blanket "humor mandatory" — an emperor under siege is intense, an inventor is playful |
| 10 | Privacy | Automated voice disclaimer before call. Transcripts saved, audio never recorded |

---

## 1. Camera: Input Only

| Context | Camera |
|---------|--------|
| Home screen: scan textbook/notes | Camera ON — Gemini Flash vision → topic extraction |
| During the call | Camera OFF. No video. Audio-only phone call |
| Post-call | No camera |

Camera is for INPUT (showing what you're studying), never for the call itself. Persona council: 3/6 blocked on camera during sessions.

---

## 2. Voice + Text: Phone Call Mode

Mic auto-activates when the call connects. Student is on a phone call — mic should be ON.

### Call Controls (iPhone-style)

```
┌─────────────────────────┐
│  [🔈 speaker]  [🟥 end]  [🎙️ mute]  │
│  [say something...]                  │
└─────────────────────────┘
```

| Control | Behavior |
|---------|----------|
| 🟥 Hang up | Ends the call. Redirect to call log (/summary) |
| 🎙️ Mute/unmute | Toggle mic. Default: ON (unmuted) |
| 🔈 Speaker | Toggle speaker output |
| Text input | Always visible below controls. Placeholder: "say something...". Send via `sendRealtimeInput({ text })` |
| Spacebar | Toggles mute (only when NOT focused on text input) |

### Mic States

| State | Visual | Label |
|-------|--------|-------|
| Active | Pulsing volume ring | `connected` |
| Muted | Mic-slash icon | `muted` |
| Disconnected | 40% opacity | `call ended` |

### Transcript Display

- `> [CHARACTER_NAME]` — from `output_transcription` (Gemini)
- `> [YOU]` or `> [STUDENT_NAME]` — from **Web Speech API** (parallel to Gemini's `input_transcription`, higher accuracy, real-time)

### Interruption

Mic stays streaming while character speaks. Student just talks to interrupt — Gemini VAD detects speech, sends `interrupted`, browser clears audio queue. Natural phone call behavior.

---

## 3. No Narrator — Everything Is the Character

No narrator voice. No separate "scene-setting" mode. The character does EVERYTHING:
- Sets the scene ("You caught me at a bad time. The harbor chain — it's failing.")
- Reacts to questions ("You ask about the ships? Let me tell you...")
- Provides context ("Do you know how long these walls have held? A thousand years.")
- Wraps up ("I must go now. The dawn is coming. Thank you, stranger.")

### Multi-Character (via `switch_speaker` tool)

Some scenarios involve multiple people. The model calls `switch_speaker('character', 'A Messenger')` to introduce a new voice. Same voice (can't switch mid-call), different register/tone.

| Rule | Detail |
|------|--------|
| Primary character | The person the student called. Dominates the conversation |
| Secondary characters | Introduced briefly via `switch_speaker`. Same voice, identified by name in chat log |
| No narrator | NEVER break into omniscient third-person narration |

### Probing — All In-Character

| Level | Example (Constantinople) |
|-------|--------------------------|
| 1. Guide | "The chain holds — but only the strait. What about the northern shore?" |
| 2. Hint | "Seventy ships. He moved them over the hills. Can you hear me? Over the HILLS." |
| 3. Direct | "The harbor is breached. I have 300 men. Three options. Which do I take?" |
| 4. Resolve | "Too late. The ships are in the harbor. But you — you asked the right questions." |

---

## 4. Onboarding: Profile-Aware, Zero Tutorials

Student profile loaded from Firestore. `relay.ts` calls `getProfile()` → `buildSystemPrompt()` injects `pastSessions` into the Live API system prompt. Character already knows:
- Student's name
- Past sessions and topics covered
- Learning patterns and effective approaches
- Personality traits

### First Visit Flow

| Step | What Happens |
|------|-------------|
| 1 | Student opens app → home screen |
| 2 | Types topic, speaks it (Web Speech API), or picks a preset person |
| 3 | Flash returns 3 people+moments (or preset shows immediately) |
| 4 | Student picks one → preview card (scene pre-generated here) → [CALL] |
| 5 | Calling screen: portrait, name, era, "calling..." animation |
| 6 | Automated voice: "This call is live and not recorded." |
| 7 | Character picks up. First visit: doesn't know student name → asks conversationally |
| 8 | Conversation begins |

### Returning Visit Flow

| Step | What Happens |
|------|-------------|
| 1 | App opens → recognizes student (Clerk auth + Firestore) |
| 2 | Home screen shows suggested calls based on history |
| 3 | Character picks up and references past: "Back again? Last time you let the harbor fall." |

### Home Screen (`/app`)

```
┌─────────────────────────────┐
│  Past, LIVE                  │
│  "The past is speaking.      │
│   Are you?"                  │
│                              │
│  Who do you want to call?    │
│                              │
│  ┌────────────────────────┐  │
│  │ what are you studying? │  │
│  └────────────────────────┘  │
│  [🎙️ mic] [📷 camera]       │
│  speak, type, or snap a photo│
│                              │
│  ── or pick someone ──       │
│                              │
│  [👤] Constantine XI         │
│   Constantinople 1453        │
│   "The walls are falling."   │
│                              │
│  [👤] Gene Kranz             │
│   Apollo 11, 1969            │
│   "25 seconds of fuel."      │
│                              │
│  [👤] Jamukha                │
│   Mongol Steppe 1206         │
│   "The khan rides."          │
│                              │
│  no wrong answers            │
│  voice processed live,       │
│  never recorded              │
└─────────────────────────────┘
```

### Topic Clarification (Flash Mid-Step)

`extract-topic` returns `{ topic_extracted, figures[3] }` for any input. All topics go through Flash — there is no "specific enough to skip" path.

```
Flash returns 3 person+moment cards inline on /app (below input, NOT in overlay):

  > WHO DO YOU WANT TO CALL?

  [👤] Hồ Chí Minh
   Declaring independence, 1945
   "I built this movement from nothing"

  [👤] James, US Marine
   Khe Sanh, 1968
   "You have no idea what it was like"

  [👤] Frances FitzGerald
   Saigon, 1966
   "I saw both sides collapse"

  🎙️ or describe who you want to hear from

Student picks → preview card → calling screen
```

### Preview Card (before calling)

Pre-generation happens here. Scene images are generated and cached during this step so `show_scene` serves from cache at 0ms.

```
┌─────────────────────────────┐
│  > CALLING                   │
│                              │
│  [Portrait]                  │
│                              │
│  CONSTANTINE XI              │
│  Constantinople, 1453        │
│                              │
│  "The walls are falling.     │
│   Mehmed's army surrounds    │
│   the city."                 │
│                              │
│  ☑ Enable microphone         │
│                              │
│  [CALL]        [CANCEL]      │
└─────────────────────────────┘
```

Card inherits story palette (OKLCH from Flash). No camera checkbox — camera is input-only.

Then transitions to calling screen:

```
┌─────────────────────────────┐
│                              │
│       [Portrait circle]      │
│                              │
│      CONSTANTINE XI          │
│      Constantinople, 1453    │
│                              │
│        calling...            │
│                              │
│   [🔈]    [🟥 end]    [🎙️]   │
└─────────────────────────────┘
```

"calling..." → "connected" when Gemini session opens. Automated voice plays before character speaks.

**Waiting state copy**: "waiting for you" (not "listening...").

---

## 5. Post-Call: Call Log

After call ends (student hangs up OR character wraps up OR 10-min timeout):

```
┌─────────────────────────────┐
│  > CALL ENDED                │
│                              │
│  [Portrait]                  │
│  Constantine XI              │
│  Constantinople, 1453        │
│  Duration: 4:32              │
│                              │
│  📝 KEY FACTS                │
│  • The harbor chain was      │
│    Constantinople's primary  │
│    naval defense             │
│  • Mehmed dragged 72 ships   │
│    overland to bypass it     │
│  • The city fell May 29, 1453│
│                              │
│  📜 WHAT HAPPENED AFTER      │
│  Your advice: Consolidate    │
│  at the inner walls.         │
│  Reality: The walls held     │
│  two more days. Constantine  │
│  died fighting in the        │
│  streets.                    │
│                              │
│  💬 CHARACTER'S MESSAGE       │
│  "You asked the right        │
│   questions, stranger.       │
│   Constantinople would be    │
│   proud."                    │
│                              │
│  📞 CALL SOMEONE ELSE        │
│  • Gene Kranz, Apollo 11     │
│  • Jamukha, Mongol Steppe    │
│  • [New topic]               │
│                              │
│  [📥 Save this call]         │
└─────────────────────────────┘
```

### Downloadable Moment (Share Card)

Separate from the call log. A card with the character's farewell message:

```
┌─────────────────────────────┐
│  Past, LIVE                  │
│                              │
│  📞 You called:              │
│  CONSTANTINE XI              │
│  Constantinople, 1453        │
│                              │
│  "You asked the right        │
│   questions, stranger.       │
│   Constantinople would       │
│   be proud."                 │
│                              │
│  Duration: 4:32              │
│  The harbor fell.            │
└─────────────────────────────┘
```

Vertical (9:16 for Instagram stories). Download button OUTSIDE the card.

---

## 6. Session Length: Natural Conversation

| Aspect | Value |
|--------|-------|
| Hard maximum | 10 minutes |
| Wrap-up inject | 9 minutes → system sends "Wrap up naturally" to model |
| Force close | 10 minutes → call drops, redirect to call log |
| Timer display | Counts UP (phone call style): `00:04:32` |
| Timer position | Below character name on in-call screen |
| Minimum | No minimum. Student can hang up at 30 seconds |

---

## 7. Emotional Boundaries

Emotion serves LEARNING, not attachment. Historical characters are emotional because history IS emotional — but clear limits prevent manipulation.

### ALLOWED

| Emotion | Example |
|---------|---------|
| Urgency/stress | "The ships are in the harbor! We have hours, not days!" |
| Gratitude | "Thank you, stranger. You helped me see clearly." |
| Historical grief | "The city I swore to protect... it's falling." |
| Pride | "You think like a true general." |
| Humor (character-appropriate) | "You suggest we THROW the cannons? I like you." |
| Dramatic tension | "If I make the wrong call, everyone in this city dies." |

### FORBIDDEN

| Boundary | Why |
|----------|-----|
| "Don't leave me" / "I need you" | Creates parasocial dependency |
| Guilt for hanging up | Student must feel free to end anytime |
| "I'm real" / blurring AI boundary | Ethical clarity — this is an AI character |
| Romantic undertones | Inappropriate for educational tool targeting minors |
| Trauma dumping without resolution | Every difficult moment must resolve constructively |
| Personal emotional dependency on the student | Character is grateful, never dependent |

### System Prompt Rule

"You are a historical figure in a moment of crisis/importance. You feel real emotions appropriate to your situation. But you are NOT dependent on this student. You existed before the call and will continue after. End every call with dignity and a positive observation. Never make the student feel guilty for ending the conversation."

---

## 8. Voice Data: Ephemeral + Transparent

| Data Type | Stored? | Where | Duration |
|-----------|---------|-------|----------|
| Audio (voice) | NO | Streamed, discarded | Real-time only |
| Transcriptions | YES | Firestore | Persistent (for summary + profile) |
| Profile data | YES | Firestore | Persistent |

### Automated Privacy Disclaimer

Before every call connects (after "calling..." screen), play a brief automated-sounding voice:

> "This call is live and not recorded."

Robotic/automated tone — clearly distinct from the character's voice. Like an automated phone system disclaimer.

---

## 9. In-Call Screen Layout

Phone call layout. Scene banner at top, transcript in middle, controls at bottom.

```
┌─────────────────────────────┐
│  [Scene banner 16:9]         │  ← pre-generated, served from cache
│                              │
│  CONSTANTINE XI              │
│  Constantinople, 1453        │
│  00:03:42                    │
├─────────────────────────────┤
│  > [CONSTANTINE XI]          │  ← output_transcription (Gemini)
│    The harbor chain...       │
│  > [YOU] What happened?      │  ← Web Speech API (parallel, higher accuracy)
│    (scrollable, flex-1)      │
│                              │
│  ┌───────────────────────┐   │
│  │ Choice cards (when     │   │
│  │ announce_choice fires) │   │
│  └───────────────────────┘   │
├─────────────────────────────┤
│  [🔈]    [🟥 end]    [🎙️]    │
│  [say something...]          │
└─────────────────────────────┘
```

### Image Style — Currency Engraving + Brand Orange (LOCKED)

**Decided 2026-03-15.** All images from Past, Live use this unified style. See `server/src/prompts/CLAUDE.md` for protection rules.

| Element | Style |
|---------|-------|
| Base technique | Currency engraving / banknote — ultra-fine crosshatching parallel lines |
| Avatars | B&W engraving figure on vivid saturated warm orange textured background. ~30% orange, ~70% B&W |
| Scenes | B&W engraving landscape with main event/focal point highlighted in vivid orange. ~30% orange, ~70% B&W |
| Color reference | `server/src/assets/brand-orange-reference.webp` (26KB, Q85) sent with every Gemini Image call |
| Forbidden | Text, letters, words, frames, borders in generated images |
| Forbidden | Per-character or per-era art style variations — all characters use same engraving style |
| Static presets | `public/presets/` — 3 avatars + 3 scenes as WebP (74-98KB each) |

### Portrait

Avatars: square (1:1), displayed as circle with orange border on calling screen, square in preview card. Generated by Gemini 3.1 Image with brand orange reference. Cached per character.

### Choice Cards (via `announce_choice` tool)

Appear inline in the chat area when the character presents options. Student can: tap a card, speak, or type. If student speaks while cards are shown, cards auto-dismiss.

```
┌───────────────────────────┐
│ Reinforce the land walls   │
│ __________________________ │
│ Concentrate 300 men at the │
│ breach. Harbor unguarded.  │
├───────────────────────────┤
│ Attempt a breakout north   │
│ __________________________ │
│ Risk everything on escape. │
│ The city falls behind you. │
├───────────────────────────┤
│ Negotiate surrender        │
│ __________________________ │
│ Save lives. Lose the city. │
│ Mehmed may show mercy.     │
└───────────────────────────┘
🎙️ or describe your own idea
```

---

## 10. Chat Log Tags

| Sender | Tag | When |
|--------|-----|------|
| Primary character | `> [CONSTANTINE XI]` | Default — the person you called |
| Secondary character | `> [A MESSENGER]` | Via `switch_speaker` tool, multi-character scenes |
| Student | `> [YOU]` or `> [STUDENT_NAME]` | From Web Speech API. Default "YOU" |

No `> [NARRATOR]` tag. Everything is a character.

---

## 11. Tone: Character-Driven

No blanket "humor mandatory." The tone matches the character and moment.

| Character | Tone | Example |
|-----------|------|---------|
| Constantine XI (under siege) | Grave, urgent, dry wit | "You suggest diplomacy? Mehmed's idea of diplomacy is 80,000 soldiers." |
| Gene Kranz (mission control) | Calm precision, deadpan | "We have 25 seconds of fuel and you want to discuss options. I like your optimism." |
| Jamukha (bitter rival) | Dark wit, grudging respect | "You think you can outthink Temujin? I've been trying for twenty years." |
| Leonardo da Vinci (inventing) | Playful, enthusiastic | "You want to know about the flying machine? Sit down. This will take a moment." |

Flash JSON picks tone alongside voice. System prompt sets character's emotional register.

---

## 12. Tool Calling (Gemini Live)

| Tool | Purpose | Behavior |
|------|---------|----------|
| `end_session(reason)` | Character wraps up OR student hangs up → redirect to call log | NON_BLOCKING |
| `switch_speaker(speaker, name)` | Multi-character scenes. Same voice, different register | NON_BLOCKING |
| `announce_choice(choices[])` | Present 2-3 options as tappable cards | NON_BLOCKING |
| `show_scene(title)` | Display era scene image — served from pre-generation cache | NON_BLOCKING |

### Session End Triggers

| Trigger | Who | Mechanism |
|---------|-----|-----------|
| Character wraps up | Model | Calls `end_session('story_complete')` |
| Student hangs up | Student | Red button → frontend sends close → backend sends `end_session('student_request')` |
| 9-min inject | System | Backend sends text: "Begin wrapping up naturally." |
| 10-min timeout | System | Backend force-closes. Sends `ended` with reason `timeout` |

---

## 13. Two Palette System

| Palette | Scope | Source |
|---------|-------|--------|
| **System** | App chrome, nav, home page, inputs | Default CSS tokens (`global.css @theme {}`) |
| **Story** | Preview card, in-call screen, call log | Generated by Flash (5 OKLCH values) |

Brand accent (red) stays on Past, Live logo only. Everything else in call context inherits story palette.

### OKLCH Constraints (in Flash prompt)

| Index | Role | Lightness |
|-------|------|-----------|
| 0 | Background | 8-15% |
| 1 | Surface | 12-20% |
| 2 | Accent | 55-75% |
| 3 | Foreground (text) | 85-95% |
| 4 | Muted | 30-45% |

---

## 14. Mobile: Portrait-First

| Aspect | Detail |
|--------|--------|
| Layout | Single column, portrait-first |
| Safe areas | Safari iOS transparent status bar + safe area padding throughout |
| Chat log | Scrollable, flex-1, auto-scroll to latest |
| Call controls | Bottom bar, thumb-reachable (iPhone call layout) |
| Virtual keyboard | Text input pushes content up |
| Touch targets | Minimum 44px |
| Hang up button | Centered, prominent, red |

---

## 15. Auth: Clerk — War Room Dispatch Theme

| Feature | Anonymous | Signed In |
|---------|-----------|-----------|
| Make a call | YES | YES |
| Call log / summary | YES (session only) | YES (persistent) |
| Profile persistence | NO | YES (Firestore) |
| Character knows your name | NO ("stranger") | YES |
| Share card | YES | YES |
| Sign-up prompt | Gentle nudge on call log: "Save your calls?" | Already saved |

Clerk appearance is a shared constant: `src/lib/clerk-appearance.ts`. Single source of truth. `appearance` prop on all Clerk components. Styled to match War Room Dispatch theme (brand red, dark backgrounds, dispatch typography).

---

## 16. Preset Rotation + Caching

| Aspect | Detail |
|--------|--------|
| Pool | Large set of pre-generated person+moment cards in Firestore |
| Home display | Rotate 3 cards on each visit from the pool |
| Portraits | Generated once per character via Gemini 3.1 Image, cached in DB. Neutral pose. Same face across all their cards |
| Multiple cards per character | One character can appear in multiple moments (e.g., Constantine XI: "the walls are falling" + "the night before the siege") |
| User-generated | After Flash generates a person+moment for an open topic, cache the card + portrait for future rotation |
| Freshness | Mix preset (curated) + user-generated (community) cards |

---

## 17. Content Safety: Blocked Callers

Some historical figures should not be role-played. Flash maintains a blocklist.

### Blocked Categories

| Category | Examples |
|----------|---------|
| Perpetrators of genocide | Hitler, Pol Pot, etc. |
| Serial killers | — |
| Figures whose role-play could normalize violence | — |

### UX: "This line is disconnected"

Stays in the phone metaphor. No lecture. No judgment.

```
> CALL FAILED
> This number is not in service.
>
> Try calling someone who was there:
>
> [👤] Sophie Scholl
>   Munich, 1943
>   "I resisted. Let me tell you why."
>
> [👤] Oskar Schindler
>   Kraków, 1944
>   "I saved 1,200 lives."
```

Flash detects blocked person → returns `{ type: 'blocked', alternatives: [...] }` with 3 related-but-appropriate figures (witnesses, resistors, victims who survived). Always redirect toward people on the right side of history.

---

## Persona Council Quotes (for reference)

### Story Scope Council (2026-03-14, 6 personas)

| Persona | Key Quote |
|---------|-----------|
| Maya, 15 | "OverSimplified meets Character.AI — that's the app I wanted" |
| Tomás, 16 | "5-7 min, something happens, I see what actually happened — length of a YouTube video" |
| Aisha, 14 | "ChatGPT explains history. This could make me argue it. Completely different." |
| Jun, 17 | "'No wrong answers' — I read that three times." |
| Zara, 42 | "If the privacy basics were there, I'd seriously consider approving this." |
| Diego, 13 | "Show me three options and I'll pick the dramatic one." |
