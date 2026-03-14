# Demo Video (<4 min)

Hackathon submission requirement. Must show multimodal/agentic features in real-time (no mockups).

## Recording Flow

| Step | What to Show | Approx Time |
|------|-------------|-------------|
| 1 | Landing page → "Dial in" CTA | 10s |
| 2 | Home → voice input or camera scan of textbook | 15s |
| 3 | 3 people+moments appear → pick one | 10s |
| 4 | Preview card → calling screen → "connected" | 10s |
| 5 | Live voice conversation — character speaks, student asks questions | 90s |
| 6 | **Interruption moment** — speak while character talks, character stops + responds | 10s |
| 7 | **Choice cards** — character presents options via `announce_choice`, student taps one | 10s |
| 8 | Student hangs up → call log (key facts + what happened + character message) | 15s |
| 9 | **Returning visit** — reopen app, character recognizes student, references past call | 15s |
| **Total** | | **~3 min** |

**Scenario**: TBD — decide before recording.

## Must Demonstrate (hackathon requirements)

| Requirement | How to Show |
|-------------|-------------|
| Real-time voice | Chat log updates live as character speaks |
| Natural interruption (barge-in) | Speak while character talks → character stops → responds to new input |
| Tool calling | Choice cards appear mid-call (announce_choice). Call ends via end_session |
| Multimodal input | Camera scan OR voice topic on home screen |
| Gemini Live API is core | Voice IS the entire interaction |
| GCP backend | Mention "Cloud Run" verbally during pitch |
| Personalization | Returning visit shows character remembering past call |

## Pitch Points (weave into demo)

- What problem: "Static timelines don't stick. We let you call the people who lived it"
- Value: "Learning through conversation — backed by research on elaborative interrogation and emotional encoding"
- Tech: "Gemini Live API with affective dialog, function calling, Flash for topic intelligence, auto voice selection"
- Differentiator: "No wrong answers. The character reacts to YOU, not a script"

## Tips

- Use headphones (prevent echo → prevent self-interruption)
- Quiet room, good mic
- Rehearse once — know which questions to ask
- Show the choice card tap (proves tool calling)
- 4 minutes MAX
