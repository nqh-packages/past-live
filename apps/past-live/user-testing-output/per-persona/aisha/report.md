# Dogfood Report: Past, Live

| Field | Value |
|-------|-------|
| **Date** | 2026-03-14 |
| **App URL** | http://localhost:7278 |
| **Session** | past-live-aisha |
| **Scope** | Full app — evaluated as a 14yo debate student looking for serious study tools |

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 3 |
| Medium | 3 |
| Low | 2 |
| **Total** | **9** |

## Issues

### ISSUE-001: Custom topic "call" immediately fails with "incomplete preview data"

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Category** | functional |
| **URL** | http://localhost:7278/app |
| **Repro Video** | N/A |

**Description**

Typed "ethics of dropping the atomic bomb" into the topic input, clicked the now-enabled [ call ] button. A "CALLING" dialog appeared but immediately displayed "> call failed" with the message "incomplete preview data" and a [ RETRY ] button. No JS console errors were logged. The core feature — calling with a custom topic — does not work.

**Repro Steps**

1. Navigate to /app, type a topic in the input field
   ![Step 1](screenshots/08-topic-filled.png)

2. Click [ call ] button — dialog shows "> call failed / incomplete preview data"
   ![Result](screenshots/issue-001-call-failed.png)

---

### ISSUE-002: Portrait image is a placeholder "[ portrait ]" text on both preview and session page

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | visual |
| **URL** | http://localhost:7278/session?scenario=constantinople-1453 |
| **Repro Video** | N/A |

**Description**

On both the preview card and the in-call session page, the character portrait is literally the text "[ portrait ]" inside a small dark box. No actual image is generated or displayed. For an app that promises an immersive "call the past" experience, showing a text placeholder instead of the character portrait kills the immersion.

**Repro Steps**

1. Click a preset scenario card or navigate to /session — portrait area shows "[ portrait ]" text
   ![Result](screenshots/12-session-annotated.png)

---

### ISSUE-003: Summary page shows wrong call duration ("12:34" for a ~1 minute call)

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | functional |
| **URL** | http://localhost:7278/summary |
| **Repro Video** | N/A |

**Description**

After a session that lasted approximately 1 minute (the in-call timer read ~01:05 when I hung up), the summary page reports "duration: 12:34". This is clearly fabricated or hardcoded data. If I'm tracking my study sessions — and I track everything — this destroys my trust in the app's accuracy. The key facts and "what actually happened" content might be hardcoded too.

**Repro Steps**

1. Complete a short ~1 minute session with Constantine XI
   ![Step 1](screenshots/13-after-text-response.png)

2. Hang up — summary shows "duration: 12:34" instead of actual duration
   ![Result](screenshots/issue-002-duration.png)

---

### ISSUE-004: No privacy policy, terms of service, or data handling information anywhere

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | ux |
| **URL** | http://localhost:7278/privacy |
| **Repro Video** | N/A |

**Description**

There is no privacy policy page (/privacy returns a generic Astro 404). No terms of service (/terms also 404). The footer says "voice processed live, never recorded" but there is zero information about what data is collected, stored, or shared. The app uses Clerk for auth (collecting email/OAuth data) and processes voice through Google's servers. My parents check my phone apps — they would never let me use something with no privacy policy, especially one that wants microphone access and sign-in.

**Repro Steps**

1. Navigate to /privacy — shows default Astro 404 page
   ![Result](screenshots/issue-003-no-privacy-page.png)

---

### ISSUE-005: Student messages not visible in chat transcript

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | functional |
| **URL** | http://localhost:7278/session?scenario=constantinople-1453 |
| **Repro Video** | N/A |

**Description**

When I typed a text response during the session ("What about the Venetian fleet? Can they reinforce the chain?"), my message does not appear as a labeled "[YOU]" entry in the transcript. The entire chat log reads as one continuous monologue from Constantine XI. The character clearly responded to my question (mentioning the Venetian fleet), but there's no visual record of what I said. This makes the transcript useless for review or study purposes.

**Repro Steps**

1. During active session, type a response and press Enter
2. Character responds to the question, but the transcript shows only [CONSTANTINE XI] entries — no [YOU] marker
   ![Result](screenshots/13-after-text-response.png)

---

### ISSUE-006: Preset scenario cards skip preview and go directly to live session with mic=1

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | ux |
| **URL** | http://localhost:7278/app |
| **Repro Video** | N/A |

**Description**

The three preset scenario cards (Constantine XI, Gene Kranz, Jamukha) link directly to `/session?scenario=...&mic=1`. This skips the preview card entirely and goes straight to a live voice session that auto-requests microphone permission. There is no chance to read who you're calling, what the stakes are, or decide if you want mic on or off before being thrown into a call. The custom topic path shows a preview card, but the preset path doesn't.

**Repro Steps**

1. Inspect the scenario card links — they point to /session?scenario=...&mic=1
   ![Result](screenshots/05-app-annotated.png)

---

### ISSUE-007: 404 page shows default Astro framework branding instead of app design

| Field | Value |
|-------|-------|
| **Severity** | low |
| **Category** | visual |
| **URL** | http://localhost:7278/nonexistent-page |
| **Repro Video** | N/A |

**Description**

Any invalid URL shows the default Astro "404: Not found" page with the Astro rocket logo. It completely breaks the dark moody "Past, Live" aesthetic and looks like a broken developer tool, not a polished app.

**Repro Steps**

1. Navigate to any invalid URL like /privacy or /nonexistent-page
   ![Result](screenshots/26-404-page.png)

---

### ISSUE-008: "For judges" section on landing page is empty

| Field | Value |
|-------|-------|
| **Severity** | low |
| **Category** | content |
| **URL** | http://localhost:7278/#for-judges |
| **Repro Video** | N/A |

**Description**

The landing page has a "for judges" anchor link that scrolls to a section containing only the label "> for judges" with no actual content. The section header exists but the body is empty. If this is a hackathon submission, the judges section should explain the tech stack, the concept, or at minimum link to something useful.

**Repro Steps**

1. Click "for judges" link on landing page — scrolls to empty section
   ![Result](screenshots/21-for-judges.png)

---

### ISSUE-009: No session history, export, or progress tracking features

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | ux |
| **URL** | http://localhost:7278/summary |
| **Repro Video** | N/A |

**Description**

After completing a call, there is no way to see past sessions, export the transcript or key facts, or track what topics I've covered. The summary page shows a "create account" CTA suggesting saved calls are coming, but even with that, there's no indication of what would actually be saved. For serious study, I need to reference my conversations later. I can't copy-paste the key facts into my debate notes. There's no export button, no share link, no download transcript option. The "share card" mentioned in the design docs doesn't exist yet.

**Repro Steps**

1. After a call, the summary shows key facts but no way to save, export, or review later
   ![Result](screenshots/17-summary-bottom.png)

---

