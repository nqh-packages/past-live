## Judge: Priya Sharma (Google DevRel) -- Gene Kranz

33, DevRel lead at Google Cloud. Has run 15 Google-sponsored hackathons. Judges on Innovation (0-10), Technical Execution (0-10), Impact (0-10), and "Live" factor. Looking for something she'd feature in a Google I/O talk. Pet peeve: impressive tech, terrible UX. "If the user has to think, you've lost."

---

### Why Kranz Over Constantinople

Pacing. Space missions have countdowns. Countdowns create tension the VIDEO VIEWER feels in their chest. Judges know the moon landing -- zero context needed. The 1202 alarm is a perfect demo moment: obscure enough to teach something, dramatic enough to hold attention, and it has a ticking clock built in.

---

## THE DEMO VIDEO -- 3:00 FLAT

---

### 0:00 - 0:08 | LANDING PAGE

[VISUAL: Browser opens to landing page. Dark UI. Logo reads "Past, LIVE" with the red accent. Hero text fades in:]

> **"The past is speaking. Are you?"**

[VISUAL: Mouse moves to CTA button]

**PRESENTER (voiceover, calm):** "What if you could call anyone in history -- and they picked up?"

[VISUAL: Clicks "Dial in" CTA. Navigates to /app]

---

### 0:08 - 0:18 | HOME SCREEN -- PICK A PERSON

[VISUAL: Home screen loads. Three person cards visible with currency-engraving portraits in orange and black. Gene Kranz card in the middle:]

```
[portrait] Gene Kranz
  Apollo 11, 1969
  "25 seconds of fuel."
                         [ call ]
```

**PRESENTER:** "Three people. Three moments. All real. Let's call Gene Kranz."

[VISUAL: Taps the Gene Kranz card]

---

### 0:18 - 0:28 | PREVIEW CARD

[VISUAL: Preview panel slides up. Scene image: engraving-style Mission Control, consoles and headsets, one orange-highlighted figure at center. Kranz's portrait overlaid bottom-left.]

```
> Gene Kranz
> Apollo 11, 1969
> to them, you're: a journalist visiting Mission Control
> stakes: The lunar module is descending. The guidance
  computer keeps crashing. Fuel is critical.
  [x] enable microphone when call connects
           [ edit ]    [ CALL ]
```

**PRESENTER:** "Gemini Flash generated this in under two seconds. The portrait, the scene, the color palette -- all Gemini 3.1 Image."

[VISUAL: Taps [ CALL ]]

---

### 0:28 - 0:38 | CALLING SCREEN

[VISUAL: Full-screen iPhone-style calling screen. Kranz's circular portrait center screen with accent border. Story palette -- deep navy background, steel blue accents.]

```
        [portrait circle]

        GENE KRANZ
        Apollo 11, 1969

          calling...
```

[VISUAL: "calling..." bounces for 2 seconds, then switches to:]

```
          connected
```

[VISUAL: Automated privacy voice plays -- robotic, clearly not Kranz:]

AUTOMATED VOICE: "This call is live and not recorded."

[VISUAL: Calling screen fades. In-call screen appears: scene banner at top (16:9 engraving of Mission Control), chat log below with left accent border, call controls at bottom. Timer starts: 00:00:01]

---

### 0:38 - 0:48 | KRANZ PICKS UP

[VISUAL: Chat log updates in real-time as Kranz speaks. His tag: `> [GENE KRANZ]`. Timer counting up in the header beneath his name and era.]

**GENE KRANZ (Charon voice -- calm, precise, warm):** "So. The Eagle is descending. And the computer just threw a 1202 alarm. You know what a 1202 is?"

[VISUAL: Brief pause. Student doesn't respond yet. Kranz continues:]

**GENE KRANZ:** "Neither did we."

[VISUAL: Chat log auto-scrolls. Transcript appearing word by word as output_transcription messages arrive.]

**GENE KRANZ:** "Twenty-six-year-old kid in the back room -- Steve Bales -- had about four seconds to decide if we abort the whole mission over an error code nobody had seen before."

---

### 0:48 - 1:10 | FIRST IMAGE APPEARS (show_scene tool)

**GENE KRANZ:** "Let me show you what that room looked like."

[VISUAL: show_scene tool fires. A new scene image slides into the banner area -- engraving-style Mission Control interior: rows of consoles, men in white shirts, headsets, cigarette smoke, one orange-highlighted figure hunched over a screen. Image appears seamlessly while Kranz keeps talking. No loading spinner. No "please wait." It just appears.]

**GENE KRANZ:** "Sixty consoles. Every single one manned by someone who'd been awake for twenty hours. The room smelled like coffee and fear."

**STUDENT (speaking into mic):** "Did Bales know? Like -- did he know it was safe to keep going?"

[VISUAL: `> [YOU]` tag appears in chat log with the transcribed question. Dimmer text styling than Kranz's messages.]

**GENE KRANZ:** "He had a gut feeling. And a cheat sheet he'd made at two in the morning the night before. That cheat sheet saved the moon landing. A scribbled piece of paper."

---

### 1:10 - 1:30 | FIRST CHOICE CARDS (announce_choice tool)

**GENE KRANZ:** "But here's where it gets interesting. Bales says 'Go.' I have to decide if I trust him. Three options."

[VISUAL: announce_choice tool fires. Three tappable cards slide up inline in the chat area with staggered fade-slide-up animation (60ms delay between each):]

```
+----------------------------------+
| Trust Bales and continue descent |
| ________________________________ |
| A 26-year-old's gut call. If     |
| he's wrong, two men die on TV.   |
+----------------------------------+
| Abort the landing                |
| ________________________________ |
| Safe. But you may never get      |
| another chance to land on        |
| the moon.                        |
+----------------------------------+
| Ask for more data                |
| ________________________________ |
| Delay the decision. But the      |
| fuel gauge doesn't wait.         |
+----------------------------------+
  or speak / type your own
```

**GENE KRANZ:** "What would you do?"

[VISUAL: Student taps "Trust Bales and continue descent". Card highlights with accent left border and bg-accent/20 background. Other cards remain but dimmed.]

---

### 1:30 - 1:50 | KRANZ REACTS TO THE CHOICE

**GENE KRANZ (chuckling -- affective dialog making the laughter feel genuine, not synthesized):** "That's exactly what I did. And I'll tell you something -- my hand was shaking when I said it. But that's the job. You don't get to be nervous out loud."

**GENE KRANZ:** "Bales was right. The computer was just overloaded -- too many tasks running at once. Like your phone when you have forty tabs open."

[VISUAL: Timer reads 00:01:28. Chat log has been auto-scrolling smoothly throughout. Choice cards have been dismissed.]

---

### 1:50 - 2:10 | THE INTERRUPTION -- PROVES IT'S LIVE

**GENE KRANZ:** "Now the alarm clears, but we've got a new problem. Armstrong is looking out the window and he sees the landing zone is full of boulders the size of--"

**STUDENT (interrupting mid-sentence):** "Wait -- he took manual control, right? I read that somewhere."

[VISUAL: Kranz's audio cuts immediately. The `interrupted` message clears the audio queue. Chat log shows `> [YOU]` with the interruption text appearing via input_transcription. This is the moment -- the character stopped mid-word and responded to a live interruption. No pre-recorded system does this. The video viewer sees it happen in real time.]

**GENE KRANZ:** "You read right. He grabbed the stick and started flying that thing like a helicopter. And now I'm watching the fuel gauge. Sixty seconds. Then thirty. Then -- I kid you not -- twenty-five seconds of fuel left."

---

### 2:10 - 2:30 | SECOND SCENE IMAGE -- TWO GEMINI MODELS COLLABORATING

**GENE KRANZ:** "Let me show you what twenty-five seconds of fuel looks like from my chair."

[VISUAL: show_scene fires again. New engraving-style image slides into the banner: a single console screen close-up, fuel gauge nearly empty, orange-highlighted digits showing critical numbers, a hand gripping the edge of the desk. Appears while Kranz keeps speaking without any pause or loading indicator.]

**GENE KRANZ:** "Every screen in the room said the same thing. And nobody breathed. I mean literally -- you could hear the air conditioning."

**GENE KRANZ:** "And then Buzz says: 'Contact light.'"

[VISUAL: Brief pause in the audio. The weight of it lands. Timer reads 00:02:18.]

**GENE KRANZ:** "And the room just... exploded."

---

### 2:30 - 2:47 | THE CLOSING -- CHARACTER'S PERSONAL OBSERVATION

**GENE KRANZ (voice shifts slightly warmer -- affective dialog adjusting emotional register):** "You know what I noticed about you? You trusted the kid. The 26-year-old with the cheat sheet. Most people I talk to want more data, want to play it safe. But you said 'go.' That's the instinct that gets you to the moon."

**GENE KRANZ:** "It was good talking to you. Take care of yourself."

[VISUAL: end_session tool fires. Screen transitions smoothly to /summary. No abrupt cut -- the farewell completes fully before the transition begins.]

---

### 2:47 - 3:00 | CALL LOG / SUMMARY

[VISUAL: /summary page loads. Clean, dark, structured layout. Left accent line running down the page.]

```
> call ended
> you called: Gene Kranz
> duration: 02:09

KEY FACTS
| The 1202 alarm was a computer overload, not a malfunction
| Steve Bales, age 26, made the Go/No-Go call in 4 seconds
| Armstrong took manual control with 25 seconds of fuel remaining
| "Contact light" was the first confirmation of lunar landing

WHAT ACTUALLY HAPPENED
your call:  Trusted Bales and continued the descent.
Reality: That's exactly what Kranz did. Eagle landed with
an estimated 15-25 seconds of fuel remaining. The 1202
alarm was never seen again on any subsequent mission.

CHARACTER'S MESSAGE
"You trusted the kid. That's the instinct that gets
 you to the moon."

CALL SOMEONE ELSE
> Constantine XI · Constantinople, 1453
  "The walls held for a thousand years. They won't hold today."
> Jamukha · Mongol Steppe, 1206
  "You think you can outthink Temujin? I've been trying for twenty years."
```

**PRESENTER (voiceover):** "Five Gemini calls per session. Flash for intelligence. 3.1 for images. Live for the conversation. All running on Cloud Run. Total cost: about twenty-five cents."

[VISUAL: Screen holds on the call log for 2 seconds. Cut to black.]

---

## SCORING

### Innovation: 10/10

Two Gemini models collaborating in real-time during a live voice session. Flash decides the character and structures the metadata. Image renders what the character describes as they describe it. Live delivers the voice with affective dialog. The show_scene tool is model-initiated -- the character decides when to show you something. Nobody else is chaining Gemini surfaces this way.

### Technical Execution: 10/10

Four distinct Gemini API surfaces orchestrated through a single WebSocket relay on Cloud Run:

1. `gemini-3-flash-preview` -- structured output for session preview (character, setting, stakes, voice, colors)
2. `gemini-3.1-flash-image-preview` -- character portrait + scene images (currency engraving style with brand orange)
3. `gemini-2.5-flash-native-audio-preview` -- Live API with affective dialog, VAD, tool calling, input/output transcription
4. `gemini-3-flash-preview` -- post-call summary (key facts, outcome comparison, character's message, suggested calls)

Tool calling drives the entire UX: choice cards (announce_choice), scene images (show_scene), speaker switches (switch_speaker), session end (end_session). All NON_BLOCKING. All model-initiated.

Firestore for student profiles and cross-session memory. Clerk for auth. Story palette generated per-session via OKLCH constraints. Audio queue with backpressure. WebSocket retry with exponential backoff. Truncation detection for known Gemini issues.

### Impact: 10/10

The student didn't memorize that Steve Bales was 26. They lived the moment where a 26-year-old's cheat sheet saved the moon landing. They made the same decision Kranz made and felt the weight of it.

Research backs it: elaborative interrogation (+30-50% retention), generation effect (+40-60%), emotional encoding (+45-60%). This isn't an AI chatbot with a costume on -- it's a pedagogical model grounded in cognitive science.

The phone call metaphor is the key insight. Every student already knows how phone calls work. There's nothing to learn. Pick up, talk, hang up. The technology is invisible.

### "Live" Factor: 10/10

The interruption at 1:50 is the proof. The student talks over Kranz mid-sentence -- "Wait, he took manual control, right?" -- and Kranz stops mid-word, processes the interruption, and responds to what they actually said. No branching script. No pre-recorded alternatives. The VAD detected speech, sent the `interrupted` signal, the audio queue cleared, and the model responded to live input.

The scene images appearing mid-conversation with zero loading state is the second proof. The character says "let me show you" and the image appears while they keep talking. Two Gemini models running in parallel -- one generating voice, one generating images -- synchronized through tool calling.

### The Detail That Wins

The whole video, nobody said "AI" or "model" or "API." It's just a student calling Gene Kranz. The technology is invisible. If you have to explain how it works during the demo, you've already lost. This demo lets the experience speak for itself.

That's the I/O talk: "We built a phone line to the past. Here's what happened when students called."
