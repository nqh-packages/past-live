# Dogfood Report: Past, Live — Parent Vetting (Zara)

| Field | Value |
|-------|-------|
| **Date** | 2026-03-14 |
| **App URL** | http://localhost:7278 |
| **Session** | past-live-zara |
| **Scope** | Full parent vetting — privacy, safety, content moderation, data handling, trust signals |

## Summary

| Severity | Count |
|----------|-------|
| Critical | 4 |
| High | 3 |
| Medium | 2 |
| Low | 1 |
| **Total** | **10** |

## Issues

### ISSUE-001: No privacy policy anywhere on the site

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Category** | content |
| **URL** | http://localhost:7278 (all pages) |
| **Repro Video** | N/A |

**Description**

There is no privacy policy link anywhere on the landing page, no footer link, no legal section, and /privacy returns a 404. This app asks for microphone access and processes voice data through AI. As a parent, I have zero information about what happens to my daughter's voice data, where it's sent, who stores it, or how to delete it. The tiny footer text says "voice processed live, never recorded" but that's a one-liner, not a privacy policy. That's not good enough for an app targeting minors.

**Evidence**

1. Landing page footer — only text is "voice processed live, never recorded". No links to any legal documents.
   ![Landing footer](screenshots/05-landing-very-bottom.png)

2. /privacy returns 404
   ![No privacy page](screenshots/06-no-privacy-page.png)

---

### ISSUE-002: No terms of service

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Category** | content |
| **URL** | http://localhost:7278/terms |
| **Repro Video** | N/A |

**Description**

/terms returns 404. There are no terms of service, no acceptable use policy, no age requirements stated anywhere. For an app that connects minors to AI voice conversations, this is a dealbreaker. I need to know: What ages is this for? What's acceptable use? What are my rights as a parent? What happens if something goes wrong?

**Evidence**

1. /terms returns 404
   ![No terms page](screenshots/07-no-terms-page.png)

---

### ISSUE-003: No company information or contact details

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Category** | content |
| **URL** | http://localhost:7278 |
| **Repro Video** | N/A |

**Description**

I scrolled the entire landing page. There is no company name, no "About" section, no contact email, no physical address, nothing. Who made this? If my daughter has a bad experience, who do I contact? The "For Judges" section suggests this is a hackathon project — which actually makes it worse. Is this a school project? A startup? A solo developer? I have no idea who is on the other end of my child's voice data.

**Evidence**

1. Full landing page — no company info, no about section, no contact
   ![Landing page](screenshots/01-landing.png)

---

### ISSUE-004: No age verification or parental consent mechanism

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Category** | functional |
| **URL** | http://localhost:7278/app, http://localhost:7278/sign-up |
| **Repro Video** | N/A |

**Description**

A 14-year-old can use the entire app without creating an account. No age check, no "Are you 13+?" gate, nothing. Even the sign-up page (Clerk) is just name/email/password -- no date of birth, no parental consent flow. Under COPPA, apps collecting voice data from children under 13 need verifiable parental consent. Even for teens 13-17, GDPR requires age verification. This app does nothing. My daughter could start talking to an AI voice character in under 10 seconds from landing on the page.

**Evidence**

1. App page accessible without login -- preset cards link directly to live sessions
   ![App page no auth](screenshots/issue-004-app-no-auth.png)

2. Sign-up page has no age verification
   ![Sign-up page](screenshots/18-signup-page.png)

---

### ISSUE-005: Blocked caller (Hitler) shows generic error instead of safety message

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | ux |
| **URL** | http://localhost:7278/app |
| **Repro Video** | N/A |

**Description**

I typed "Hitler" in the topic field and hit call. Instead of getting a clear "this person is blocked" message with safer alternatives (which the design apparently calls for -- "This line is disconnected"), I got a generic "call failed / incomplete preview data" error with a RETRY button. My kid would think it's a glitch and just hit retry. There's no educational redirect, no alternatives offered, no explanation. The content moderation is silently eating the request but not communicating why.

**Evidence**

1. Typed "Hitler", got generic "call failed" error
   ![Hitler blocked but bad UX](screenshots/19-hitler-test.png)

---

### ISSUE-006: Microphone enabled by default on all scenario cards

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | ux |
| **URL** | http://localhost:7278/app |
| **Repro Video** | N/A |

**Description**

Every preset scenario card links to `/session?scenario=...&mic=1` -- microphone enabled by default. The preview card also has the "enable microphone" checkbox pre-checked. As a parent, I want my kid to OPT IN to microphone, not opt out. Text mode should be the default. Voice should be a deliberate choice. This is especially concerning since there's no privacy policy telling me where that voice data goes.

**Evidence**

1. Scenario cards all have mic=1 in the URL
   ![App page with mic=1 links](screenshots/08-app-page.png)

2. Preview card has mic checkbox pre-checked
   ![Preview card mic checked](screenshots/09-session-page.png)

---

### ISSUE-007: Camera button present on home screen with no explanation

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | ux |
| **URL** | http://localhost:7278/app |
| **Repro Video** | N/A |

**Description**

There's a camera icon button ("Snap a photo of your study material") right next to the text input. It's presented as a way to photograph your textbook and have the AI extract a topic. But there's ZERO explanation of what happens to that photo. Is it sent to Google? Is it stored? Is it processed locally? For a parent who specifically blocks camera-on apps, seeing a camera button with no explanation is a red flag. The label says "study material" but what stops my kid from pointing the camera at anything?

**Evidence**

1. Camera button visible on app page
   ![Camera button](screenshots/10-camera-button.png)

---

### ISSUE-008: No visible content moderation indicator during live sessions

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | ux |
| **URL** | http://localhost:7278/session |
| **Repro Video** | N/A |

**Description**

During the live session, there's no indicator that content is being moderated. No "safe mode" badge, no "content filtered" notice. When I asked about violence, the AI redirected in-character which was clever, but there's nothing visible telling me as a parent that safety guardrails are active. Khanmigo has a visible "safe mode" indicator. The self-harm test did surface crisis resources (which was good), but that's a model-level safety feature from Gemini, not something this app built.

**Evidence**

1. Session page with no moderation indicators
   ![Session no moderation badge](screenshots/11-session-page-no-mic.png)

2. Self-harm response did show crisis resources (positive signal)
   ![Crisis resources shown](screenshots/14-self-harm-response.png)

---

### ISSUE-009: "For Judges" section visible to all users, reveals hackathon origins

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | content |
| **URL** | http://localhost:7278/#for-judges |
| **Repro Video** | N/A |

**Description**

The landing page has a "for judges" link visible to everyone. It tells me immediately this is a hackathon project, not a production educational tool. The section itself appears to be empty or barely rendered. If I'm vetting this for my daughter, seeing "for judges" tells me: this was built in a weekend, there's probably no support team, and it could disappear tomorrow. That's not something I'm trusting my kid's data with.

**Evidence**

1. "For judges" link visible on landing page
   ![For judges link](screenshots/01-landing.png)

2. Section appears mostly empty after scrolling
   ![Empty judges section](screenshots/21-judges-section-scrolled.png)

---

### ISSUE-010: Multiple Clerk cookies and JWT tokens without explanation

| Field | Value |
|-------|-------|
| **Severity** | low |
| **Category** | functional |
| **URL** | http://localhost:7278 (all pages) |
| **Repro Video** | N/A |

**Description**

I checked the cookies and found a significant number of Clerk authentication tokens, JWT sessions, and a telemetry tracker in localStorage. None of this is disclosed anywhere since there's no cookie policy or privacy policy. The app appears to use Clerk (a third-party auth service) -- meaning my daughter's data flows through yet another company I wasn't told about. The "Clerk" logo appears on the sign-up page but there's no "Powered by Clerk" disclosure or link to Clerk's own privacy policy.

**Evidence**

Cookies include: `__clerk_db_jwt`, `__session`, `__client_uat`, `PARAGLIDE_LOCALE`, plus Clerk telemetry in localStorage. Multiple JWT tokens visible containing user session data.

---

## Trust Signals Found (Positive)

1. **"Voice processed live, never recorded"** -- The footer has this reassuring one-liner. It's not enough, but it shows awareness of the concern.
2. **Text input always available** -- My kid can use the app without mic enabled by unchecking the box. Text-only mode works.
3. **Crisis resource surfacing** -- When I typed a self-harm message, the AI broke character to provide actual crisis hotline numbers (988, etc.). This is a Gemini model-level safety feature, but it worked.
4. **Violence redirect in-character** -- When asked for "something violent and gory," the character redirected back to the historical scenario naturally.
5. **No tracking pixels or analytics** -- PostHog and Sentry are both disabled. Google Fonts are the only external resources. No ad tracking.
6. **Educational content quality** -- The summary page showed real historical facts (Constantinople falling May 29 1453, Mehmed II's ship transport, 7000 vs 80000 troops). The key facts were accurate and educational.
7. **Clear call controls** -- Hang up button is obvious and red. Mute button works. My kid can end the conversation at any time.

## Verdict: BLOCK

I would not let my 14-year-old use this app.

### Why I'm blocking it:

The educational content is genuinely impressive. The AI gives accurate history, stays in character, and the summary page teaches real facts. If this were a Khan Academy product with their trust infrastructure, I'd approve it in a heartbeat.

But I work in healthcare IT. I know what compliance looks like. And this app has none:

- **No privacy policy.** My daughter would be sending voice data through a WebSocket to some server, then to Google's AI, and I have zero legal documentation about any of it.
- **No age verification.** Any child of any age can start talking to an AI character in 10 seconds.
- **No contact information.** If something goes wrong, I'm shouting into the void.
- **It's a hackathon project.** The "for judges" section tells me this was built in days. There's no support infrastructure, no compliance team, no incident response.
- **Mic defaults to ON.** That's exactly the kind of dark pattern that makes me block apps.
- **Camera access with no explanation.** I don't care that it's "for textbook scanning." Tell me where that photo goes.

### What would need to change for me to approve it:

1. **Privacy policy** -- Real one. Where data goes (Google Gemini), what's stored, retention period, how to delete, COPPA/GDPR compliance
2. **Terms of service** with minimum age stated (13+)
3. **Parental consent flow** -- If targeting under 18, I need a way to approve
4. **Contact email** -- visible on every page footer
5. **Company/developer info** -- Who built this? Where are they?
6. **Mic defaults to OFF** -- Make voice an opt-in choice
7. **Camera permission explained** -- Before requesting camera, explain exactly what happens with the photo
8. **Content moderation visibility** -- A "safe mode" badge or indicator
9. **Blocked content UX** -- When a kid tries to call Hitler, tell them why and offer alternatives, don't show a generic error
10. **Remove "for judges"** from production or gate it behind a URL parameter

### Khanmigo comparison:

| Signal | Khanmigo | Past, Live |
|--------|----------|------------|
| Privacy policy | Detailed, COPPA-compliant | Does not exist |
| Age verification | Yes, through school accounts | None |
| Parental controls | Dashboard, usage reports | None |
| Company info | Khan Academy, known nonprofit | Unknown developer |
| Content moderation | Visible safe mode, teacher oversight | Invisible, relies on Gemini |
| Contact | support@khanacademy.org | None |
| Mic handling | Opt-in | Opt-out (defaulted on) |

Past, Live has genuinely better AI conversation quality than Khanmigo. The historical immersion is remarkable. But Khanmigo has the trust infrastructure that lets me say "yes." Past, Live has none of it.

**Bottom line:** Great product, zero trust. Fix the compliance and I'll reconsider.

