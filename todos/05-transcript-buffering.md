# Implement robust transcript assembly with fragment buffering

## Context
Commit `a2cd57b fix(past-live): era-appropriate images + slower transcript assembly` documented transcript issues. Investigation showed reveria (polished competitor) accumulates transcript fragments in lists, joins at `turn_complete`. cadre-ai uses 2.5-second flush delay before triggering actions.

## Problem
Transcripts arrive as fragments via `input_transcription` and `output_transcription` messages. Joining them naively:
- Duplicates text (overlapping fragments)
- Shows incomplete/wrong quotes to user
- Breaks post-call summary generation
- Timeline events misaligned with actual speech

## Current State
- ⚠️ Transcripts assembled with delays (`transcript_delay_fix`)
- ⚠️ Simple string concatenation (no deduplication)
- ❌ No fragment buffering per turn
- ❌ No join point clarity

## Solution (from reveria)
```typescript
// Per-session state
let inputTranscriptParts: string[] = [];
let outputTranscriptParts: string[] = [];

// On each input_transcription message
function onInputTranscription(text: string) {
  inputTranscriptParts.push(text);
  // Display partial: join([...inputTranscriptParts]).trim()
}

// On turn_complete or end_session
function flushTranscript() {
  const fullInput = inputTranscriptParts.join(' ').trim();
  const fullOutput = outputTranscriptParts.join(' ').trim();

  // Deduplicate if overlap exists
  if (fullOutput.endsWith(lastWord) && fullInput.startsWith(lastWord)) {
    fullOutput = fullOutput.slice(0, -lastWord.length);
  }

  // Use for call log
  saveTranscript({ input: fullInput, output: fullOutput });

  // Reset for next turn
  inputTranscriptParts = [];
  outputTranscriptParts = [];
}
```

## Acceptance Criteria
- [ ] Per-turn transcript buffering (arrays, not string concat)
- [ ] Deduplication on turn boundaries
- [ ] Flush triggered at `turn_complete` or `end_session`
- [ ] Post-call summary uses deduplicated transcript
- [ ] Timeline events aligned with transcript boundaries
- [ ] No duplicate quotes in call log

## Related Files
- `server/relay.ts` — message forwarding
- `src/lib/call-log.ts` — post-call summary
- `src/components/islands/SessionPreview.svelte` — transcript display

## Status
**In Progress.** Basic assembly works. Deduplication + buffering needed.
