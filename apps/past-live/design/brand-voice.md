# Past, Live — Brand Voice

Two tones. Same DNA. Pick by context.

| Tone | When | Feel |
|------|------|------|
| **External** | Marketing, landing, post-call, share cards, social | Poetic provocation. The page speaks. |
| **In-app** | UI states, person cards, call controls, loading, errors | Compressed brevity. Incoming signal. |

Both share: present tense, "you" as subject, history as alive, app as invisible.

---

## External Tone

### Voice in One Line

Short declarative setup → provocative turn → you're implicated.

### Mechanics

| Element | Rule | Example |
|---------|------|---------|
| Setup | State something familiar as fact. Short. Flat. | "The past is speaking." |
| Turn | Flip it onto the reader. Question or command. | "Are you?" |
| Follow-through | One concrete image, then reframe what the product IS. | "Your textbook becomes a portal." |
| Closer | Redefine the relationship. "No longer X — now Y." | "History is no longer something you read — it's someone you call." |

### Tone Dials

| Dial | Value |
|------|-------|
| Declarative | High — state, don't ask permission |
| Poetic | Medium — one image per block, never two |
| Educational | Zero — never explain, never teach in copy |
| Urgent | High — present tense, active voice |
| Playful | Low — dry, not cute. Wit lives in the turn |

### Sub-Tones (within external)

| Context | Lean toward | Example |
|---------|-------------|---------|
| Landing page, marketing | Provocative | "Talk to the dead. They talk back." |
| Post-call reflections | Poetic, warm | "The harbor fell. But you held longer than the emperor himself." |
| Character farewell message | Intimate, dignified | "You asked the right questions, stranger. Constantinople would be proud." |
| Share card | Blunt, irreverent | "History has opinions. Yours are wrong." |
| Social media | Confrontational, modern | "The dead don't grade on a curve." |

### Sentence Rules

| Rule | Detail |
|------|--------|
| Max length | 12 words. Break anything longer. |
| Pronouns | "You" is dominant. "We" is forbidden. "It" refers to history, the voice, the moment — never the app. |
| Tense | Present. Always present. History is happening now. |
| Punctuation | Periods > exclamation marks. Em dashes for the reframe. Question marks only at the turn. |

### Word List

| Use | Avoid |
|-----|-------|
| speak, voice, answer, listen, call, dial | learn, study, practice, review |
| portal, breach, summon, enter, line, signal | tool, platform, feature, experience |
| the page, the record, the moment, the line | the app, the AI, the session |
| advisor, witness, strategist, stranger | student, learner, user |
| falls, burns, rises, breaks | helps, supports, enables, empowers |

### Pattern: Headlines

```
[Thing] is [doing something unexpected].
[Pointed question aimed at you.]
```

Examples:
- "The past is speaking. Are you?"
- "The walls are falling. What's your order?"
- "The emperor is on the line. He knows your name."
- "The countdown hit zero. You're still talking."

### Pattern: Body Copy

```
[Concrete image — one sentence, one object becoming something else.]
[Reframe — "no longer X — Y" or "not X. Y."]
```

Examples:
- "Your textbook becomes a portal. History is no longer something you read — it's someone you call."
- "The date on the page becomes a coordinate. You're not studying 1453 — you're on the line with it."
- "A voice across centuries picks up the phone. This isn't a recording — it's a conversation that's been waiting 500 years."

### Pattern: CTAs

Verbs that imply entering, connecting. You cross a threshold.

| Use | Avoid |
|-----|-------|
| Dial in | Start learning |
| Start the call | Begin session |
| Enter the archive | Try it now |
| Open the line | Get started |

### Anti-Patterns

| Pattern | Why it fails |
|---------|-------------|
| "Learn history through immersive voice calls" | Feature description. Dead on arrival. |
| "Past, Live makes studying fun!" | Tells instead of shows. Patronizing. |
| "Powered by Gemini Live API" | Tech spec, not voice. Save for README. |
| "Ready to explore the past?" | Generic. Could be any history app. |
| "An AI that brings history to life" | "Brings to life" is a dead metaphor. History is already alive. |

---

## In-App Tone

### Voice in One Line

Stripped-down field communications. Status. Location. Signal. You're already connected.

### Mechanics

| Element | Rule | Example |
|---------|------|---------|
| Header | Classification or signal type. All caps. | `> INCOMING TRANSMISSION` |
| Fields | Key-value pairs. No prose. | `> caller: constantine xi` / `> year: 1453` |
| Status | One line — the situation. | `> status: walls breached` |
| Prompt | Ends on you. Question or action. | `> start the call` |

### Tone Dials

| Dial | Value |
|------|-------|
| Declarative | Maximum — no hedging |
| Poetic | Zero — beauty comes from compression |
| Urgent | Maximum — every word costs transmission time |
| Playful | Zero — the situation doesn't allow it |
| Human | Low — cracks through only in the character's farewell |

### Sentence Rules

| Rule | Detail |
|------|--------|
| Max length | 6 words. If longer, it's two lines. |
| Format | Lowercase after `>`. No periods — line breaks ARE the punctuation. |
| Pronouns | No "we." No "I." The system has no personality. |
| Numbers | Raw. `1453` not `fourteen fifty-three`. `70 ships` not `seventy ships`. |

### Word List

| Use | Avoid |
|-----|-------|
| transmission, signal, line, call, dial | notification, message, alert |
| caller, connected, incoming | role, assigned, playing as |
| status, confirmed, breach, critical | info, update, news |
| start, accept, end, hang up | begin, submit, finish |

### Pattern: Person Cards (Home Screen)

```
[👤] Constantine XI
  Constantinople 1453
  "The walls are falling."
```

### Pattern: Loading / Connecting

```
> dialing 1453...
> connecting the line...
> locating the signal...
> the past is loading...
> reaching across centuries...
> wiring up the time machine...
> dusting off the history books...
```

Loading messages rotate randomly. Same component used for pre-call loading AND connection wait.

### Pattern: Call Status

```
> connected
> 03:42
> constantine xi is speaking
```

### Pattern: Call Controls

| Context | Copy |
|---------|------|
| Mic active | `connected` |
| Mic muted | `muted` |
| Mic disabled | `offline` |
| Timer | `03:42` (counts UP) |
| Hang up | Red button, no text needed |
| Text input placeholder | `type a question...` |

### Pattern: Errors / Disconnects

```
> signal lost
> the past is not responding
> [retry]
```

```
> call failed
> this number is not in service
> [try someone else]
```

### Pattern: Post-Call Handoff (in-app → external)

The call log starts in-app tone, then softens into external tone for the reflective content:

```
> call ended
> duration: 04:32
> caller: constantine xi

[External tone takes over for the reflection]
The harbor fell. But you held the walls longer
than Constantine himself. Not bad for a first call.
```

### Pattern: Chat Log Tags

| Sender | Tag | Note |
|--------|-----|------|
| Primary character | `> [CONSTANTINE XI]` | The person you called |
| Secondary character | `> [A MESSENGER]` | Multi-character scenes |
| Student | `> [YOU]` or `> [NAME]` | From profile, default "YOU" |

No `> [NARRATOR]` tag. Everything is a character.

### Examples by Context

| Context | Copy |
|---------|------|
| Person card headline | `"The walls are falling."` |
| Person card subtitle | `Constantinople 1453` |
| Calling screen | `calling...` → `connected` |
| Timer | `03:42` |
| Loading | `> dialing 1453...` |
| Error | `> signal lost` |
| Blocked caller | `> this number is not in service` |
| Chat log (character) | `> [CONSTANTINE XI] The harbor chain...` |
| Chat log (student) | `> [YOU] What happened next?` |
| Text input | `type a question...` |
| Returning visit | `> caller recognized` → "Last time the harbor fell. Ready for a new call?" |

---

## Tone Guide (When to Use What)

| Context | Tone | Sub-lean |
|---------|------|----------|
| Landing page | External | Provocative |
| Marketing / social | External | Blunt, confrontational |
| Home screen | External | Poetic, inviting |
| Person cards | In-app | Compressed |
| Loading / connecting | In-app | Compressed |
| Calling screen | In-app | Minimal |
| In-call UI | In-app | Compressed |
| Call log header | In-app | Compressed |
| Call log reflection | External | Poetic, warm |
| Character farewell | External | Intimate, dignified |
| Share card | External | Blunt, irreverent |
| Errors | In-app | Compressed |
| Returning visit | In-app → External | Compressed → warm |

---

## Mixing Tones

The two tones bleed at transitions. The shift happens when the functional moment gives way to the reflective moment.

| Transition | From | To | Example |
|------------|------|----|---------|
| Home → Call | External | In-app | "The walls are falling." → `> dialing 1453...` |
| Call → Call log | In-app | External | `> call ended` → "The harbor fell. You held longer than expected." |
| Error recovery | In-app | In-app | `> signal lost` → `> reconnecting...` |
| Returning visit | In-app → External | — | `> caller recognized` → "Last time the harbor fell." |
