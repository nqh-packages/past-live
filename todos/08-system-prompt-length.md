# System prompt refactoring: explicit length controls + chattiness profiles

## Context
Commit `b0a46c6 refactor(past-live): rewrite system prompt with skill-creator philosophy` and `59baa28 refactor(past-live): reorder system prompt per Google best practices` show ongoing prompt tuning. Investigation revealed vibeCat (most polished repo) uses runtime chattiness-based length control: dynamic prompt appends based on config ("quiet" = "exactly one sentence", "chatty" = "up to two sentences").

## Problem
System prompt too long (3000+ words) → characters monologue. Multiple rewrites required:
- Initial prompt: characters talked too much
- Rewrite: "Keep it conversational, 2-4 sentences"
- Still violated during long calls
- No runtime tuning option

## Current State
- ✅ Prompt reordered (Google best practices: persona → rules → guardrails)
- ✅ Explicit "1-2 sentences" instruction
- ⚠️ No chattiness profiles
- ⚠️ Memory context unbounded (adds bloat)
- ❌ No runtime tuning

## Solution (from vibeCat)
```typescript
// server/character-voice.ts
interface CharacterConfig {
  chattiness: 'quiet' | 'normal' | 'chatty';
}

function buildSystemPrompt(char: Character, config: CharacterConfig) {
  let prompt = `You are ${char.name}, ${char.era}.
Your personality: ${char.voice.tone}
...
[Core character voice — ~500 words]
...`;

  // Append chattiness control
  switch (config.chattiness) {
    case 'quiet':
      prompt += '\n\nIMPORTANT: Keep your spoken replies to exactly ONE short sentence.';
      break;
    case 'normal':
      prompt += '\n\nKeep your spoken replies to 1-2 short sentences.';
      break;
    case 'chatty':
      prompt += '\n\nYou may reply with up to 2-3 sentences. Be conversational.';
      break;
  }

  // Cap memory context
  const memoryContext = trimMemoryContext(char.history, 900); // 900 chars max
  prompt += `\n\nPast sessions with student:\n${memoryContext}`;

  return prompt;
}
```

## Acceptance Criteria
- [ ] Chattiness enum: quiet / normal / chatty
- [ ] Length control appended dynamically per chattiness
- [ ] Memory context capped at 900-1200 characters
- [ ] Memory trimming prioritizes recent sessions
- [ ] Quiet mode: exactly 1 sentence
- [ ] Normal mode: 1-2 sentences (current target)
- [ ] Chatty mode: up to 2-3 sentences
- [ ] Tested across all 3 scenarios

## Related Files
- `server/character-voice.ts` — system prompt assembly
- `server/gemini.ts` — Live session config
- `convex/scenarios.ts` — character data

## Status
**Post-hackathon enhancement.** Current prompt works but rigid. Profiles would help.
