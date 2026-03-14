# Phase 2: Judge-Impressors

After the "call from the past" pivot ships. Makes the demo impressive, not just workable.

## Items

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | Firestore profiles | High | Personalization depth, GCP requirement |
| 2 | Post-call Gemini summary | Medium | Real learning verification (replace hardcoded facts) |
| 3 | Returning visit recognition | Low | Character references past calls. "Netflix up next" mechanic |
| 4 | Student profile persistence | Medium | Foundation for recognition + personalization |
| 5 | Call receipt share card | Medium | Viral loop — character's farewell message as Instagram story |
| 6 | Persistent avatar | Low | Auth anchor, progress tracking |
| 7 | Auth strategy (anonymous-first) | Medium | Frictionless onboarding |
| 8 | Structured logging + text-only test endpoint | Low | Claude can dogfood without audio |

## Item Details

### #1: Firestore Profiles

| Aspect | Detail |
|--------|--------|
| Why | GCP requirement. Personalization impresses judges |
| Schema | `StudentProfile` — see CLAUDE.md |
| Collection | Name collected conversationally during first call |
| Recognition | Clerk auth + Firestore. Cookie fallback for anonymous |
| Backend | Firestore Application Default Credentials on Cloud Run |

### #2: Post-Call Gemini Summary

| Aspect | Detail |
|--------|--------|
| Why | Current call log uses hardcoded facts. Real extraction from transcript = real learning |
| Current | `summary.ts` uses `SCENARIO_META` — same facts regardless of conversation |
| Target | Send transcript to `gemini-3-flash-preview` with structured output |
| Prompt | "Extract 3-5 key historical facts from this call. Compare the student's advice to what actually happened. Suggest 3 related people to call next. Write the character's farewell message (positive observation about the student)." |
| Output | `{ keyFacts: string[], outcomeComparison: string, characterMessage: string, suggestedCalls: { name: string, era: string, hook: string }[] }` |
| Save | Extract → Firestore student profile |

### #3: Returning Visit Recognition

| Aspect | Detail |
|--------|--------|
| Why | Diego: "If the first session is fire, I'll be back tomorrow" |
| Flow | Recognize via Clerk/cookie → fetch profile → character references past calls |
| Example | "Back again? Last time you let the harbor fall. Ready for a new call?" |
| Home screen | Show suggested calls based on call history |

### #4: Student Profile Persistence

| Aspect | Detail |
|--------|--------|
| Why | Foundation for recognition + personalization |
| Post-call save | Learning patterns, personality, call outcome, character's message |
| Source | Post-call Gemini extraction from transcript |
| Update | Merge new call into existing profile. Append to calls[] |

### #5: Call Receipt Share Card

| Aspect | Detail |
|--------|--------|
| Why | Viral loop. Memorable takeaway. Instagram-friendly |
| Format | Vertical card (9:16). Downloadable PNG. Download button OUTSIDE the card |
| Content | Character's farewell message + who you called + duration + one-line outcome |
| Example | `📞 You called: CONSTANTINE XI / "You asked the right questions, stranger." / Duration: 4:32 / The harbor fell.` |
| No face variation | No camera = no student photo. Character portrait + text only |

### #6: Persistent Avatar

| Aspect | Detail |
|--------|--------|
| Why | Auth anchor, visual identity |
| Location | Top-right corner of app |
| Behavior | Links to Clerk auth. Shows user avatar when signed in |

### #7: Auth Strategy (Anonymous-First)

| Aspect | Detail |
|--------|--------|
| Why | Frictionless. NEVER gate calls behind auth |
| Flow | Anonymous-first → sign-up-later |
| Anonymous | Full call experience, no sign-up |
| Signed in | Profile saved, calls tracked, returning visit recognition |
| Stack | Clerk → Firestore |

### #8: Structured Logging + Test Endpoint

| Aspect | Detail |
|--------|--------|
| Why | Claude can dogfood without audio. Need structured logs |
| Pino logging | DONE — added in Phase 1 fixes |
| Text-only endpoint | TODO — `POST /test-session` runs Live API in TEXT mode, returns JSON transcript |
| Structured output | TODO — post-call JSON: all messages with timestamps, tool calls, duration |

## Dependencies

```
#1 Firestore Profiles
  ↓ required by
#4 Student Profile Persistence
  ↓ required by
#3 Returning Visit Recognition
  ↓ also requires
#2 Post-Call Gemini Summary (provides data for #4)

#5 Call Receipt Share Card (requires #2 summary data)
#6 Persistent Avatar (requires #7 auth)
#7 Auth Strategy (requires #1 Firestore)
#8 Logging/Testing (independent — pino already done)
```

## Hackathon Submission Requirements

| Requirement | How We Address |
|-------------|----------------|
| Text description | Landing page + README |
| Public code repo URL | GitHub repo with spin-up instructions |
| Proof of GCP deployment | Screen recording of Cloud Run console |
| Architecture diagram | On landing page + README |
| Demo video (<4 min) | Record full flow: landing → pick person → calling screen → conversation → hang up → call log |
