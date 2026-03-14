# Dogfood Report: Past, Live (Diego — 13yo ADHD student)

| Field | Value |
|-------|-------|
| **Date** | 2026-03-14 |
| **App URL** | http://localhost:7278 |
| **Session** | past-live-diego |
| **Scope** | Full app — ADHD lens, engagement & stimulation focus |

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 5 |
| Medium | 3 |
| Low | 0 |
| **Total** | **9** |

## Issues

### ISSUE-001: Scenario cards are just text — no pictures of the people

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | ux |
| **URL** | http://localhost:7278/app |
| **Repro Video** | N/A |

**Description**

The three scenario cards (Constantine XI, Gene Kranz, Jamukha) are just names and quotes in dark red bordered boxes. No portraits, no images, nothing visual. If I'm about to "call" someone from history, I want to see what they look like. These cards look like a boring list, not something I'd tap. It's like a contacts list with no profile pictures — who does that?

**Repro Steps**

1. Navigate to /app
   ![Step 1](screenshots/issue-001.png)

2. **Observe:** Cards have zero images. Just tiny red text on dark background. My eyes don't even know where to look.

---

### ISSUE-002: Landing page is a wall of tiny unreadable text

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | ux |
| **URL** | http://localhost:7278/ |
| **Repro Video** | N/A |

**Description**

The landing page is almost entirely small monospace text on a dark background. The bullet points ("voice-first time travel", "you make the call", "no wrong answers") are cool concepts but they're in tiny gray text that I literally skip over. The "how it works" section with Input/Preview/Session is paragraphs of explanation that no 13-year-old is going to read. There's nothing visually exciting — no images, no color, no movement. It looks like a terminal, not a fun app.

**Repro Steps**

1. Navigate to http://localhost:7278/
   ![Step 1](screenshots/01-landing.png)

2. Scroll down to "how it works" section
   ![Step 2](screenshots/02-landing-scrolled.png)

3. **Observe:** Tiny mono text everywhere. No images. No visual hooks. I'd bounce in 3 seconds.

---

### ISSUE-003: Chat transcript is one unbroken wall of text — my messages don't show up

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | ux |
| **URL** | http://localhost:7278/session?scenario=mongol-empire-1206&mic=0 |
| **Repro Video** | N/A |

**Description**

During the call with Jamukha, I typed "What happens if we fight Temujin?" and hit enter. My message never appeared in the transcript. There's no "[YOU]" or "[DIEGO]" tag. The entire transcript is one continuous block under "[JAMUKHA]" with no line breaks between turns. So it looks like Jamukha is just monologuing and I'm invisible. I have no idea if my message was even received — it just got swallowed. Also, the whole thing is one giant paragraph of tiny mono text. My ADHD brain literally cannot track where I am in that wall.

**Repro Steps**

1. Start a session at /session?scenario=mongol-empire-1206&mic=0
   ![Step 1](screenshots/06-session-mongol.png)

2. Type "What happens if we fight Temujin?" and press Enter
   ![Step 2](screenshots/08-typing-response.png)

3. **Observe:** Message is sent but never shows as "[YOU]" in transcript. One continuous text block.
   ![Result](screenshots/issue-003.png)

---

### ISSUE-004: Portrait is just "[portrait]" text — no actual image during call

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | visual |
| **URL** | http://localhost:7278/session?scenario=mongol-empire-1206&mic=0 |
| **Repro Video** | N/A |

**Description**

The session page has a big dark rectangle in the middle that just says "[portrait]" in text. No actual picture of Jamukha. I'm supposed to be on a phone call with a Mongol warrior and I can't even see his face? The whole page is basically a dark void with tiny text. If this had an actual portrait of a Mongol warrior — armor, horses, the steppe — I'd be WAY more into it. Right now it feels like calling a blank screen.

**Repro Steps**

1. Navigate to session page
   ![Step 1](screenshots/07-session-talking.png)

2. **Observe:** "[portrait]" text placeholder where an image should be. Big empty dark area.

---

### ISSUE-005: AudioContext blocked — no audio plays without user gesture first

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | console |
| **URL** | http://localhost:7278/session?scenario=mongol-empire-1206&mic=0 |
| **Repro Video** | N/A |

**Description**

Console shows: "The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page." When I navigate directly to the session URL (like from clicking a scenario card), the browser blocks audio autoplay. So the character might be "talking" but I can't hear them. For a voice-first app, that's pretty bad. If the whole point is hearing a historical figure talk to you and nothing comes out of the speakers, you'd think it's broken.

**Repro Steps**

1. Navigate directly to /session?scenario=mongol-empire-1206&mic=0
2. Check browser console
3. **Observe:** AudioContext warning. Audio does not play without prior user interaction on the page.

---

### ISSUE-006: Summary page shows wrong character — I called Jamukha but it says Constantine XI

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Category** | functional |
| **URL** | http://localhost:7278/summary |
| **Repro Video** | N/A |

**Description**

After hanging up my call with Jamukha (Mongol Empire, 1206), I got sent to the summary page. But it says "you called: Constantine XI" with facts about Constantinople 1453 and a fake duration of "12:34". My actual call was about 3 minutes with Jamukha talking about Temujin and the steppe. The summary has NOTHING to do with my call. It looks like placeholder/hardcoded data that never gets replaced with real session data. If this was a study tool and I'm trying to review what I learned, this is useless.

**Repro Steps**

1. Start a session with mongol-empire-1206 scenario
   ![Step 1](screenshots/06-session-mongol.png)

2. Have a conversation, then click "End call"
   ![Step 2](screenshots/11-before-hangup.png)

3. **Observe:** Summary shows Constantine XI data instead of Jamukha data
   ![Result](screenshots/15-summary-full-top.png)

---

### ISSUE-007: Custom topic "samurai" fails with unhelpful "incomplete preview data" error

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | functional |
| **URL** | http://localhost:7278/app |
| **Repro Video** | N/A |

**Description**

I typed "samurai" in the topic box, hit call, got a cool "summoning witnesses..." loading screen, then it just said "> call failed" and "incomplete preview data" with a retry button. "Incomplete preview data" means literally nothing to me. Did I spell something wrong? Is samurai not in the database? Did the internet break? The error is totally useless. I'd just close the app at this point. A 13-year-old does not retry — they leave.

**Repro Steps**

1. Type "samurai" in topic input on /app
   ![Step 1](screenshots/16-app-typed-topic.png)

2. Click [call] button
   ![Step 2](screenshots/17-custom-topic-result.png)

3. **Observe:** After loading, shows "call failed" with "incomplete preview data"
   ![Result](screenshots/18-preview-loaded.png)

---

### ISSUE-008: Everything is in tiny monospace font — impossible for fidgety reading

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | accessibility |
| **URL** | http://localhost:7278 (all pages) |
| **Repro Video** | N/A |

**Description**

Every single page uses small monospace text. The landing page, the app page, the session page, the summary page. ALL of it. Mono fonts are harder to read than regular fonts. When you have ADHD and you're already fighting to focus, tiny mono text is a guaranteed zone-out. The chat transcript during calls is especially bad — it's a continuous block of mono text that all blends together. Headers like "KEY FACTS" and "WHAT ACTUALLY HAPPENED" on the summary are readable, but everything under them is small gray mono.

**Repro Steps**

1. Navigate to any page
   ![Step 1](screenshots/01-landing.png)

2. **Observe:** All body text is small monospace font. Hard to scan, hard to read quickly.

---

### ISSUE-009: No visual feedback when sending text message during call

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | ux |
| **URL** | http://localhost:7278/session?scenario=mongol-empire-1206&mic=0 |
| **Repro Video** | N/A |

**Description**

When I type a message and press Enter during a call, there's zero feedback. The input clears but nothing appears in the transcript showing what I said. No "[YOU]" tag, no typing indicator, no "message sent" flash. I honestly wasn't sure if it worked until Jamukha responded to what I asked. For an ADHD kid, not seeing your own message is really disorienting — did it send? Should I type again? Did it break?

**Repro Steps**

1. During a session, type a message and press Enter
   ![Step 1](screenshots/08-typing-response.png)

2. **Observe:** Input clears, but no "[YOU]" entry appears in the transcript. No feedback at all.
   ![Result](screenshots/09-after-send.png)

---

