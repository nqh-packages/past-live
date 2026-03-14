# Phase 2: Judge-Impressors

After Phase 1 (feedback fixes) ships. Makes the demo impressive, not just workable.

## Items

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | Firestore profiles | High | Personalization depth, GCP requirement |
| 2 | Post-session Gemini summary | Medium | Real learning verification |
| 3 | Camera demo moment | Medium | Vision capability proof for judges |
| 4 | Returning visit warm-up | Low | Continuity, "Netflix up next" mechanic |
| 5 | Student profile persistence | Medium | Foundation for warm-ups + personalization |
| 6 | Social sharing card | Medium | Viral loop, memorable takeaway |
| 7 | Persistent avatar | Low | Auth anchor, progress tracking |
| 8 | Auth strategy (anonymous-first) | Medium | Frictionless onboarding |
| 9 | LLM dogfooding support | Low | Claude can dogfood without audio |

## Item Details

### #1: Firestore Profiles

| Aspect | Detail |
|--------|--------|
| Why | GCP requirement satisfied. Personalization depth impresses judges |
| Schema | `StudentProfile` — see CLAUDE.md for full TypeScript interface |
| Collection | Name + age collected conversationally by character (NOT a form) |
| Recognition | Cookie/localStorage for returning visits |
| Backend | Firestore Application Default Credentials on Cloud Run |
| Fields | name, age, learningPatterns, personality, sessions[], nextWarmUp, suggestedScenarios |

### #2: Post-Session Gemini Summary

| Aspect | Detail |
|--------|--------|
| Why | Current summary is deterministic (hardcoded facts). Real extraction = real learning verification |
| Current | `summary.ts` uses `SCENARIO_META` — same 5 facts regardless of conversation |
| Target | Send transcript to `gemini-3-flash-preview` with structured output |
| Prompt | "Extract 3-5 key historical facts discussed, compare student decisions to actual history, suggest 3 related topics" |
| Output schema | `{ keyFacts: string[], outcomeComparison: string, suggestedTopics: string[] }` |
| Save | Extract → Firestore student profile |
| Files | `summary.ts` (replace deterministic), new backend endpoint, `SummaryView.svelte` |

### #3: Camera Demo Moment

| Aspect | Detail |
|--------|--------|
| Why | Shows vision capability. Live API supports sparse video input |
| Prerequisite | Video checkbox must be checked in session preview (camera = ON for session). If unchecked, this moment is skipped entirely |
| When | At climax (Step 5 twist). Agent offers: "Want to try something?" |
| Accept flow | 3-sec camera burst via Gemini Live `sendRealtimeInput({ video })`. Agent reacts to expression |
| Skip flow | Agent uses affective dialog: "You sound nervous, advisor! Constantinople needs confidence!" |
| UI | Clear **Skip** button. Never guilt-trip. "Fair enough — I'll imagine your brave face. It's magnificent." |
| Privacy | No photo stored. Frames streamed and discarded. `MEDIA_RESOLUTION_LOW` (258 tokens/frame) |
| Demo video | Show this working ONCE. Proves vision capability |
| Token budget | 3 sec × 1fps × 258 tokens = 774 tokens total |
| Files | `SessionManager.svelte` (camera toggle), `gemini.ts` (video frames already supported) |

### #4: Returning Visit Warm-Up

| Aspect | Detail |
|--------|--------|
| Why | Continuity. Diego: "If the first session is fire, I'll be back tomorrow" |
| Flow | Recognize via cookie → fetch profile from Firestore → agent opens with previous session context |
| Example | "Diego! Last time the harbor fell. Ready to try something new?" |
| Warm-up Q | Agent-generated from previous session's `agentInsight` field |
| Files | Home page (recognition check), system prompt (inject profile context) |

### #5: Student Profile Persistence

| Aspect | Detail |
|--------|--------|
| Why | Foundation for warm-ups + future personalization |
| Post-session save | Learning patterns, personality traits, effective probes, session outcome |
| Source | Post-session Gemini call extracts structured data from transcript |
| Update pattern | Merge new session data into existing profile. Append to sessions[] |
| Files | Backend Firestore client, post-session extraction endpoint |

### #6: Social Sharing Card

| Aspect | Detail |
|--------|--------|
| Why | Viral loop. Memorable takeaway from session. Instagram-friendly |
| Format | Funny summary card. Downloadable image (PNG). Download button OUTSIDE the card |
| Content | Humorous roast-style summary. Example: "If you were Khan, the Mongolian Empire would have been gone 100 years earlier" |
| Face variation | If user photo available (camera was on), generate face variation in character outfit (head wearing character's clothes) using Gemini image model |
| No photo | If no user photo, use character avatar + text only |
| Files | New `SocialCard.svelte`, new backend endpoint for card generation |

### #7: Persistent Avatar

| Aspect | Detail |
|--------|--------|
| Why | Auth anchor, visual identity, progress tracking |
| Location | Top-right corner of app |
| Behavior | Links to Clerk auth. Shows avatar when signed in |
| Storage | Saves progress to Firestore |
| Files | Layout component, Clerk integration |

### #8: Auth Strategy (Anonymous-First)

| Aspect | Detail |
|--------|--------|
| Why | Frictionless onboarding. DO NOT force registration |
| Flow | Anonymous-first → sign-up-later. Welcome signups, save profiles, but NEVER gate content behind auth |
| Stack | Clerk → Firestore |
| Anonymous | Full session experience without any sign-up |
| Signed in | Profile saved, progress tracked, returning visit warm-ups |
| Files | Clerk config, Firestore profile creation |

### #9: LLM Dogfooding Support

| Aspect | Detail |
|--------|--------|
| Why | Claude can dogfood the app without audio capability. Need structured logs for analysis |
| Options | (A) Verbose event logs in console/file (all WS messages, state transitions). (B) Text-only test endpoint (bypasses audio, pure text Live API session). (C) Structured test output (JSON session transcript for automated analysis) |
| Recommended | All three. (A) always-on in dev, (B) for automated testing, (C) for post-session analysis |
| Files | Logger utility, test endpoint in server, structured output formatter |

## Dependencies

```
#1 Firestore Profiles
  ↓ required by
#5 Student Profile Persistence
  ↓ required by
#4 Returning Visit Warm-Up
  ↓ also requires
#2 Post-Session Gemini Summary (provides data for #5)

#3 Camera Demo Moment (independent — requires video checkbox ON)
#6 Social Sharing Card (requires #2 summary data, optionally camera photo)
#7 Persistent Avatar (requires #8 auth)
#8 Auth Strategy (requires #1 Firestore)
#9 LLM Dogfooding (independent)
```

## Hackathon Submission Requirements (must address)

| Requirement | How We Address |
|-------------|----------------|
| Text description | Landing page + README |
| Public code repo URL | GitHub repo with spin-up instructions |
| Proof of GCP deployment | Screen recording of Cloud Run console OR link to deployment code |
| Architecture diagram | On landing page + README |
| Demo video (<4 min) | Record full flow: landing → input → preview → countdown → session → summary |
