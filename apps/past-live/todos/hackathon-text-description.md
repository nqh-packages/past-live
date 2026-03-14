# Hackathon Text Description

Submission requirement: summary of features, tech, data sources, findings.

## Draft (edit before submission)

### What is Past, Live?

A voice-first app that lets students call historical figures. Type a topic — or scan your textbook — and choose who to talk to. Constantine XI picks up the phone and tells you about the night the walls fell. You ask questions. You give advice. You hang up knowing what happened and why.

No quizzes. No flashcards. No wrong answers. Just a conversation with someone who was there.

### Features

- **Call anyone in history** — type a topic, get 3 people+moments to call. Or pick from a rotating roster of preset characters.
- **Real-time voice conversation** — Gemini Live API with native audio. The character speaks naturally, reacts to interruption, adapts to your questions.
- **Tool-calling intelligence** — the model controls the call: presents choices (`announce_choice`), introduces other characters (`switch_speaker`), and ends the session gracefully (`end_session`).
- **Auto voice selection** — Gemini Flash picks the right voice (from 30 options) for each character. An emperor sounds different from a NASA flight director.
- **Visual atmosphere** — Flash generates an OKLCH color palette per era. The entire UI transforms to match the historical period.
- **Character portraits** — Gemini 3.1 Image generates and caches neutral portraits per character. Same face every time you call them.
- **Call log** — after hanging up, see key facts, what actually happened in history, and the character's farewell message. Screenshot-friendly for study notes.
- **Multimodal input** — text, voice (Web Speech API), or camera (scan textbook → Flash vision → topic extraction).
- **Content safety** — blocked callers get "This line is disconnected" with redirects to witnesses and resistors. Emotional boundaries prevent parasocial attachment.

### Technologies

| Technology | Purpose |
|------------|---------|
| Gemini Live API (`gemini-2.5-flash-native-audio-preview`) | Real-time voice + function calling |
| Gemini Flash (`gemini-3-flash-preview`) | Topic intelligence, preview JSON, voice selection, post-call summary |
| Gemini 3.1 Image (`gemini-3.1-flash-image-preview`) | Character portraits, scene banners |
| Cloud Run (Hono/TS) | WebSocket relay, Gemini session management |
| Firestore | Student profiles, call history, portrait caching |
| Astro 5 + Svelte 5 | Frontend (Cloudflare Workers) |
| Clerk | Authentication (anonymous-first) |

### Data Sources

- Historical data embedded in system prompts (3 preset scenarios + open-topic generation via Flash)
- Student profiles from Firestore (personalization, returning visit recognition)
- Gemini-generated structured metadata (character name, setting, stakes, color palette, voice, decision points)

### Findings

- **Users get lost in long narratives** — persona council (6 personas, 14-25 age range) unanimously preferred 5-7 min focused calls over 14-min story arcs
- **"No wrong answers" is the killer copy** — one persona (exchange student, shame-avoidant culture) read it three times. Reduces anxiety across all segments
- **Function calling transforms session control** — `announce_choice` + `end_session` tools solve the two biggest problems (users don't know what to do, sessions don't end gracefully)
- **Camera is a trust-killer** — 3/6 personas blocked on camera during sessions. Camera now limited to input (textbook scanning) only
- **Character-driven tone > blanket humor** — an emperor under siege should be intense, an inventor should be playful. Flash auto-selects tone per character

### Category

Live Agents (real-time voice + function calling)
