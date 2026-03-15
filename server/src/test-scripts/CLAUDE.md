# Test Scripts

Hardcoded story scripts for testing prompt patterns with Gemini Live. No tool calls — voice only.

## How It Works

| Step | Detail |
|------|--------|
| 1 | Create a `.ts` file here exporting `TEST_SYSTEM_PROMPT`, `TEST_CHARACTER_NAME`, `TEST_VOICE` |
| 2 | Change the import in `relay.ts:10` to point to your file |
| 3 | Server auto-reloads (tsx watch) |
| 4 | Open `localhost:8787/test-script` and call |
| 5 | Check logs: `tail -f ../logs/server.log \| jq` |

## Swapping Scripts

```typescript
// relay.ts line 10 — change this import to test different scripts
import { TEST_SYSTEM_PROMPT, TEST_CHARACTER_NAME, TEST_VOICE } from './test-scripts/cleopatra.js';
```

Any `scenarioId` starting with `test-story-script-` bypasses `buildSystemPrompt()`, disables all tool calls, and uses the hardcoded prompt.

## Available Scripts

| File | Character | Status |
|------|-----------|--------|
| `bolivar.ts` | Simón Bolívar | V4 — turn pacing fixed, hints not lines |
| `cleopatra.ts` | Cleopatra VII | V2 — turn ramp-up, beat navigation |

## What Makes a Good Test Script

Based on patterns from 9 dream conversation transcripts (`docs/sessions/dream-convos/`):

| Pattern | Detail |
|---------|--------|
| Hook | First line under 10 words. Statement, never question. |
| Myth-bust | Challenge what they "know." The truth must be MORE interesting. |
| Anchors | Connect every fact to universal experience (group projects, sports, family). |
| Derivable choice | 2-3 options, no wrong answer, each teaches something different. |
| Arc | Each response builds on the previous. Never drop a thread. |
| Energy matching | Bounce the student's energy back bigger. Never absorb. |
| Humor | NOT jokes. The gap between how insane the situation was and how casually you describe it. |
| Personality | Each character has a DISTINCT voice — specific humor style, specific verbal habits. |
| Close | Specific observation about the student (not praise), then goodbye with callback. |

## Log Format

```bash
# Accumulated utterances (not per-word chunks)
tail -f ../logs/server.log | jq 'select(.event | test("output_utterance|input_utterance|reanchor"))'
```
