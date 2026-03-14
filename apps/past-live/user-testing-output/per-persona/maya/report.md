# Dogfood Report: Past, Live

| Field | Value |
|-------|-------|
| **Date** | 2026-03-14 |
| **App URL** | http://localhost:7278 |
| **Session** | past-live-maya |
| **Scope** | Full app -- persona: Maya, 15yo drama kid, AP World History student |

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 3 |
| Medium | 3 |
| Low | 2 |
| **Total** | **9** |

## Issues

### ISSUE-001: Custom topic "call" instantly fails with "incomplete preview data"

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Category** | functional |
| **URL** | http://localhost:7278/app |
| **Repro Video** | N/A |

**Description**

Typed "cleopatra egypt" in the text box, hit the Call button, and immediately got a dialog that says "> call failed" and "incomplete preview data" with a retry button. The feature that's supposed to let me type ANY topic and call someone from that era just... doesn't work. This is literally the main selling point of the app and it's broken. On Character.AI I can just type "Cleopatra" and start talking. Here I get an error.

**Repro Steps**

1. Navigate to /app, type "cleopatra egypt" in the text box
   ![Step 1](screenshots/08-typed-topic.png)

2. Click the [ call ] button

3. **Observe:** Dialog appears with "> CALLING" header, then "> call failed" with "incomplete preview data" and a [ RETRY ] button
   ![Result](screenshots/09-after-call-click.png)

---

### ISSUE-002: Summary page shows stale/hardcoded data regardless of which character you called

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | functional |
| **URL** | http://localhost:7278/summary |
| **Repro Video** | N/A |

**Description**

I called Gene Kranz (Moon Landing), had a conversation, hung up -- and the summary page showed Constantine XI's data from my PREVIOUS call. Same key facts about Constantinople, same duration "12:34", same character message. It's like the summary page is stuck on whatever the first call was, or it's using hardcoded placeholder data. The duration "12:34" also looks super fake -- my actual calls were like 2 minutes max.

If I'm going to use this for studying, I need the summary to actually show what I JUST talked about. That's the whole point of the recap.

**Repro Steps**

1. Complete a call with Gene Kranz (Moon Landing 1969 scenario)
   ![Gene Kranz call](screenshots/26-moon-landing.png)

2. End the call by clicking the red hang up button

3. **Observe:** Summary page shows Constantine XI data, not Gene Kranz data. Duration says "12:34" which is not the real call duration
   ![Result](screenshots/27-moon-summary.png)

---

### ISSUE-003: Portrait placeholder "[ portrait ]" shown instead of actual character image

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | visual |
| **URL** | http://localhost:7278/session, http://localhost:7278/app |
| **Repro Video** | N/A |

**Description**

Every single screen that should have a character portrait -- the preview card, the call screen, everything -- just shows a tiny dark square with "[ portrait ]" in brackets. On Character.AI the characters have actual pictures that make them feel real. Here it's just a sad little placeholder box. It makes the whole thing feel unfinished. The preview card for Constantinople shows the character name and description but that empty portrait box next to it kills the vibe completely.

**Repro Steps**

1. Click on any scenario card (e.g., Constantinople 1453)
   ![Preview with placeholder portrait](screenshots/11-preset-click.png)

2. Or navigate to any session page
   ![Session with placeholder portrait](screenshots/13-session-active.png)

---

### ISSUE-004: "For Judges" section on landing page is completely empty

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | content |
| **URL** | http://localhost:7278/#for-judges |
| **Repro Video** | N/A |

**Description**

There's a "for judges" link on the landing page that scrolls down to... nothing. The section just has the label "> for judges" and then the footer. No content. Also the anchor link doesn't even scroll properly -- it seems to jump back to the top of the page instead of the section. I know this is for hackathon judges and not for me but it's weird to have a dead link on your landing page.

**Repro Steps**

1. On the landing page, click the "for judges" link
   ![Landing page with judges link](screenshots/02-landing-fresh.png)

2. **Observe:** Page scrolls but the "for judges" region has no content
   ![Empty judges section](screenshots/22-page-bottom.png)

---

### ISSUE-005: Retry button on failed call clears my typed topic -- makes me retype everything

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | ux |
| **URL** | http://localhost:7278/app |
| **Repro Video** | N/A |

**Description**

When the custom topic call fails and I click Retry, it closes the error dialog AND clears the text I typed. So now I have to type "cleopatra egypt" again from scratch. The Call button goes back to disabled. Like... if I'm retrying, shouldn't it keep what I typed and just try again? On Character.AI if something fails it at least remembers what you were doing.

**Repro Steps**

1. Type a custom topic and click Call -- it fails
   ![Call failed](screenshots/09-after-call-click.png)

2. Click [ RETRY ] or close the dialog

3. **Observe:** Text input is cleared, call button is disabled again
   ![Input cleared after retry](screenshots/10-after-retry.png)

---

### ISSUE-006: Text input placeholder says "type your orders..." which doesn't fit every scenario

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | content |
| **URL** | http://localhost:7278/session |
| **Repro Video** | N/A |

**Description**

The text input in the call screen says "type your orders..." as the placeholder. This makes sense for Constantinople where you're an emperor's advisor, but for Gene Kranz at Mission Control? I'm not "ordering" Gene Kranz around -- he's the flight director, I'd be asking him questions or making suggestions. It should say something more neutral like "type a message..." or change based on the scenario.

**Repro Steps**

1. Navigate to any session page, look at the text input at the bottom
   ![Orders placeholder on Moon Landing call](screenshots/26-moon-landing.png)

---

### ISSUE-007: Speak and camera buttons on /app give zero feedback when clicked

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | ux |
| **URL** | http://localhost:7278/app |
| **Repro Video** | N/A |

**Description**

On the /app page there are two icon buttons next to the text input -- a microphone (speak topic) and a camera (snap photo). I clicked both and literally nothing happened. No error, no loading spinner, no dialog, no browser permission prompt, nothing. They just... do nothing. Maybe they need microphone/camera permissions that the automated browser can't grant, but there should at least be some indication that something was attempted. On a real phone I'd just think the app is broken.

**Repro Steps**

1. On /app, click the microphone button
   ![No response from speak button](screenshots/19-speak-button.png)

2. Click the camera button
   ![No response from camera button](screenshots/20-camera-button.png)

3. **Observe:** No visible change, no error, no permission dialog feedback

---

### ISSUE-008: 404 page uses default Astro branding instead of Past, Live branding

| Field | Value |
|-------|-------|
| **Severity** | low |
| **Category** | visual |
| **URL** | http://localhost:7278/nonexistent |
| **Repro Video** | N/A |

**Description**

If you go to a URL that doesn't exist, you get the default Astro 404 page with the Astro rocket logo and everything. It breaks the whole dark moody vibe of the app. Should at least say something on-brand like "This line is disconnected" or "No one answered."

**Repro Steps**

1. Navigate to any nonexistent URL
   ![Default Astro 404](screenshots/25-404.png)

---

### ISSUE-009: Only 3 scenario cards -- no variety, all niche

| Field | Value |
|-------|-------|
| **Severity** | low |
| **Category** | content |
| **URL** | http://localhost:7278/app |
| **Repro Video** | N/A |

**Description**

There are exactly 3 preset characters: Constantine XI, Gene Kranz, and Jamukha. Two out of three are pretty niche for AP World History. I'd want Cleopatra, MLK, Napoleon, Marie Antoinette, Genghis Khan himself (not his rival lol), someone from ancient China... people I actually need to study. Constantine XI is cool but he's not in most AP study guides. And since custom topics are broken (ISSUE-001), these 3 are literally all I can do.

**Repro Steps**

1. Navigate to /app and scroll down to see all available cards
   ![Only 3 cards available](screenshots/23-cards-closeup.png)

---

## Maya's Full Reaction

### First Impression

OK so the name "Past, Live" is actually kind of fire. And the landing page tagline "The past is speaking. Are you?" goes hard. I was genuinely excited for about 10 seconds. The dark aesthetic with the red accent gives off like... mysterious phone hotline vibes? Which I think is the point. But then I actually tried to USE it and things fell apart fast.

### What I'd Actually Do

I'd click the big CTA button, go to /app, type "cleopatra" because that's what I'm studying this week, get the error, click retry, lose my text, sigh, then click the Constantinople card because it's there and I'm curious. The call itself is actually really cool -- Constantine XI talks like a real person under pressure and responds to what I say. I'd play with that for a few minutes. Then I'd hang up, see the summary, get confused that it shows wrong data, and probably close the tab and go back to Character.AI.

### What Confuses Me

- Why does the summary show the wrong person? Did my call not save?
- What's the difference between the preset cards and typing my own topic? The presets work, typing doesn't
- The "[ portrait ]" boxes -- is the app not done? Am I testing a beta?
- "type your orders..." -- am I supposed to be commanding them? I thought I was just talking
- The speak and camera buttons do nothing, so what are they for?

### What I Wish Was There

- WAY more characters. Like at least 20. Characters from every AP World History unit
- Actual character portraits so it feels like I'm calling a real person, not a text box
- A way to see my past calls and review the facts I learned (the summary page would be great for this if it worked)
- The custom topic feature actually working -- that would make this 10x better than Character.AI because Character.AI doesn't give me study facts after
- Some way to share on TikTok or Instagram. The "call receipt" idea is cool but there's no share button
- A search or browse page with tons of historical figures organized by era/region

### Would I Come Back?

Honestly? The CONCEPT is better than Character.AI for studying. The fact that it gives you real historical facts, tells you what actually happened, and has that phone call vibe is genuinely cool. The conversation with Constantine XI was legitimately engaging -- way better than the flat responses I get on Character.AI. But right now with custom topics broken, only 3 characters, no portraits, and a broken summary page... I'd use it maybe once to show my friends because it's a cool idea, but I wouldn't study with it regularly. Fix the custom topics and the summary page and add more characters and I'd literally use this every night before AP World.

### Rating vs Character.AI

**Concept**: Past, Live wins. The "phone call" metaphor is way cooler than just texting a chatbot. And getting actual historical facts after is something Character.AI doesn't do at all.

**Current execution**: Character.AI wins. It has thousands of characters, always works, has actual profile pictures, and remembers your conversations. Past, Live has 3 characters, broken features, and placeholder images.

**Potential**: Past, Live could be my go-to study app if it was finished. The educational angle (key facts + what actually happened + character's message) is exactly what I need for AP World. Character.AI is fun but I'm not actually learning anything from it.
