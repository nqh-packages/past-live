# Dogfood Report: Past, Live (Tomas - Reluctant 11th Grader)

| Field | Value |
|-------|-------|
| **Date** | 2026-03-14 |
| **App URL** | http://localhost:7278 |
| **Session** | past-live-tomas |
| **Scope** | Full app -- perspective of a 16yo reluctant student |

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 3 |
| Medium | 3 |
| Low | 2 |
| **Total** | **9** |

## Issues

### ISSUE-001: Custom topic "call" breaks -- "incomplete preview data"

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Category** | functional |
| **URL** | http://localhost:7278/app |
| **Repro Video** | N/A |

**Description**

Typed "world war 2" in the topic input, hit the [ call ] button, got a preview overlay that says "> call failed" with "incomplete preview data" and a [ RETRY ] button. The one feature that would actually be useful for studying -- typing my own topic -- doesn't work. If I can't type "french revolution" or "cold war" and get something useful, this is just a demo with three preset cards. Useless for actual test prep.

**Repro Steps**

1. Navigate to /app, type "world war 2" in the text box
   ![Step 1](screenshots/16-typing-topic.png)

2. Click the [ call ] button (it enables when text is entered)

3. **Observe:** Preview overlay shows "> call failed / incomplete preview data / [ RETRY ]"
   ![Result](screenshots/issue-001.png)

---

### ISSUE-002: My typed messages don't show in the chat log

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | ux |
| **URL** | http://localhost:7278/session?scenario=moon-landing-1969&mic=0 |
| **Repro Video** | N/A |

**Description**

I typed "uhh is the computer gonna crash?" and "so should we abort or keep going?" in the text box during the session. Gene Kranz responded (so the messages got through to the AI), but my messages never showed up in the chat log. The whole transcript is just Gene Kranz talking to himself. It makes it look like I'm not even part of the conversation. On the summary page it literally says "your call: (no spoken input captured)" even though I typed two messages. So basically the app ignores that I said anything.

**Repro Steps**

1. Navigate to session page with mic=0
   ![Step 1](screenshots/08-session-page.png)

2. Type and send messages in the text input

3. **Observe:** Only Gene Kranz's messages appear in the chat log. Student messages are invisible. Summary says "(no spoken input captured)".
   ![Result](screenshots/11-summary-top.png)

---

### ISSUE-003: Preset scenario cards skip preview -- go straight to live call

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | ux |
| **URL** | http://localhost:7278/app |
| **Repro Video** | N/A |

**Description**

Clicking a preset card (Gene Kranz, Constantine XI, Jamukha) takes you directly to `/session?scenario=xxx&mic=1` -- straight into a live call with mic ON. No preview, no "here's who you're calling," no chance to back out. I saw the preview card flash for a second but then it loaded the session and Gene Kranz was already talking. For someone who doesn't know who Gene Kranz is (me), I just got thrown into a conversation with a stranger with my mic on. That's anxiety-inducing. The preview card exists (I saw it when the custom topic broke) so why don't the presets use it?

**Repro Steps**

1. On /app, click the Gene Kranz / Apollo 11 card
   ![Step 1](screenshots/04-app-page-annotated.png)

2. **Observe:** Immediately navigates to /session with mic=1, call starts, Gene Kranz is already talking.
   ![Result](screenshots/08-session-page.png)

---

### ISSUE-004: Scenario cards have no portraits -- placeholder [ portrait ] text

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | visual |
| **URL** | http://localhost:7278/session?scenario=moon-landing-1969&mic=0 |
| **Repro Video** | N/A |

**Description**

The session page shows "[ portrait ]" as literal text instead of an actual image. The app page cards also have no images -- just text names. It looks unfinished. If I showed this to my friends they'd think it was broken. Quizlet at least has pictures.

**Repro Steps**

1. Start a session
   ![Result](screenshots/08-session-page.png)

---

### ISSUE-005: Only 3 scenario options, none relevant to what I'm studying

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | ux |
| **URL** | http://localhost:7278/app |
| **Repro Video** | N/A |

**Description**

Constantinople 1453, Moon Landing 1969, Mongol Empire 1206. My history test is on the French Revolution. None of these help me. The custom topic input (the only thing that would help) is broken (ISSUE-001). So this app literally cannot help me study for my test. I'd close the tab and go back to Quizlet.

**Repro Steps**

1. Navigate to /app, look at the three preset cards
   ![Result](screenshots/05-app-scrolled.png)

---

### ISSUE-006: Landing page is too much reading before I can do anything

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | ux |
| **URL** | http://localhost:7278/ |
| **Repro Video** | N/A |

**Description**

The landing page has a tagline, three bullet points, a CTA, then "how it works" with three steps, then ANOTHER CTA, then a "for judges" section. I don't care about any of this. My mom sent me a link, I need to study. The CTA says "[ who do you want to call? ]" which is kind of cool but also -- call who? I don't get it yet. Would have preferred the /app page to just BE the landing page. Skip the pitch.

The "for judges" section is especially confusing. Judges? Like... school judges? What is this?

**Repro Steps**

1. Navigate to landing page
   ![Result](screenshots/01-landing.png)

2. Scroll through all the content before reaching the app
   ![After scroll](screenshots/02-landing-scrolled.png)

---

### ISSUE-007: "speak, type, or snap a photo" -- camera button doesn't explain what it does

| Field | Value |
|-------|-------|
| **Severity** | low |
| **Category** | ux |
| **URL** | http://localhost:7278/app |
| **Repro Video** | N/A |

**Description**

There are two small icon buttons next to the text input (microphone and camera). The help text says "speak, type, or snap a photo" but I don't know what snapping a photo of my textbook would actually do. Would it read my textbook and find someone to call? That's cool if so but it doesn't say that. I'd just ignore those buttons.

**Repro Steps**

1. Look at the input area on /app
   ![Result](screenshots/04-app-page-annotated.png)

---

### ISSUE-008: Call ended after 41 seconds with no warning

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | ux |
| **URL** | http://localhost:7278/session |
| **Repro Video** | N/A |

**Description**

I typed two messages and the call ended after 41 seconds. Gene Kranz was in the middle of explaining stuff and then suddenly I'm on the summary page. No warning, no "the call is ending soon," nothing. I thought the app said calls go up to 10 minutes. 41 seconds is not enough to learn anything. Maybe this is because I was using text-only (mic=0) and the AI ran out of stuff to say? Either way it felt abrupt.

**Repro Steps**

1. Start a session, type two responses
   ![During call](screenshots/09-session-after-wait.png)

2. **Observe:** After 41 seconds, call ends and redirects to summary
   ![Result](screenshots/11-summary-top.png)

---

### ISSUE-009: Share card says "NASA MISSION CONTROL ENGINEER" instead of Gene Kranz

| Field | Value |
|-------|-------|
| **Severity** | low |
| **Category** | content |
| **URL** | http://localhost:7278/summary |
| **Repro Video** | N/A |

**Description**

The share card at the bottom says "NASA MISSION CONTROL ENGINEER" in big text and "Apollo 11 Moon Landing" below it. But during the session it said "Gene Kranz." If I downloaded this to show my mom as proof I studied, she'd be like "who?" The name should match what was on the call screen. Also the share card says "(no spoken input captured)" which makes it look like I didn't do anything, but I typed stuff.

**Repro Steps**

1. See the share card on the summary page
   ![Result](screenshots/13-summary-share-card.png)

---

## Tomas's Verdict

### First Impression

OK so my mom sent me this link and said "try it for your history test." The landing page looks kind of moody and dark, like a movie trailer website. "The past is speaking. Are you?" is a cool tagline honestly. The vibe is better than most school apps -- it doesn't look like something a teacher made in 2014.

But then I have to figure out what "call" means. You're telling me I'm going to call a dead person on the phone? That's... weird? Kind of cool? I don't know. I clicked the Moon Landing guy because space is at least somewhat interesting.

### What I Actually Did

- Skimmed the landing page for 3 seconds, clicked the CTA
- On /app, looked at the three cards. None of them are about the French Revolution so they're useless to me
- Tried typing "world war 2" because that's at least related. IT BROKE. "incomplete preview data." At that point in real life I would have closed the tab
- Clicked the Moon Landing card anyway just to see what happens
- Got thrown into a live conversation with Gene Kranz with NO preview, NO explanation, mic ON
- Typed two messages because no way I'm talking out loud (mom is in the other room, also it's weird)
- Gene Kranz responded but my messages didn't show up in the chat. Felt like I was invisible
- Call ended after 41 seconds. I learned like 3 facts about the Moon Landing. Cool but won't help on my test
- Summary page was actually decent -- the "key facts" list is basically what I'd put on a Quizlet card

### What Confused Me

- "Call" a historical figure? Like on the phone? I thought this was a text app at first
- The camera button -- am I supposed to take a photo of something?
- Why do preset cards go straight to a call but typing a topic shows a preview? Pick one
- "for judges" on the landing page. What judges?
- The mic was ON by default when I clicked the card. I panicked for a second
- 41 seconds and the call is over? Was that normal?

### What I Wish Was There

- A topic that's actually useful for my test (French Revolution, Civil War, literally anything besides these three random ones)
- The custom topic input actually working
- My messages showing up in the chat so I can see the whole conversation
- A way to just READ the conversation without being in a "call" -- like a text chat mode
- After the call, let me copy the key facts into my notes or export them as flashcards
- More than 3 options. Quizlet has millions of study sets

### Would I Come Back?

Honestly? Not in its current state. The three preset scenarios don't match anything I'm studying, and the custom topic feature is broken. If I could type "French Revolution" and actually get a working call with Robespierre or whoever, AND if the key facts at the end were good enough to study from... maybe. The summary page with key facts is actually the most useful part -- it's basically what I'd put on flash cards. But I need it to work for MY topics, not just three random demos.

The "calling a historical figure" thing is a cool concept though. Way cooler than Quizlet. If this worked with any topic, I'd show my friends. But right now it's just three specific conversations that have nothing to do with my test tomorrow.

I'm going back to Quizlet.
