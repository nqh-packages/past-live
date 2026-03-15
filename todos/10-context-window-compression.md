# Context window compression tuning for long sessions

## Context
Commit `68f5f9d feat(past-live): Zod schemas, WS retry, chunk logging, truncation detection` added basic compression. Investigation revealed vibeCat uses aggressive compression with tuning profiles: trigger 12K / target 6K tokens for tight memory, memory-light profile for resource-constrained settings.

## Problem
After 5-10 minute calls:
- Conversation history bloats context window
- Gemini's response time degrades
- Compression doesn't trigger early enough
- No tuning for different scenarios

## Current State
- ✅ Context compression enabled in Live config
- ✅ Default sliding window configured
- ⚠️ Trigger/target tokens not tuned
- ❌ No compression profiles
- ❌ Memory context unbounded (see #08)

## Solution (from vibeCat)
```typescript
// server/compression-profiles.ts
interface CompressionProfile {
  triggerTokens: number;
  targetTokens: number;
  maxMemoryChars: number;
  name: string;
}

const profiles: Record<string, CompressionProfile> = {
  'baseline': {
    triggerTokens: 12000,
    targetTokens: 6000,
    maxMemoryChars: 1200,
    name: 'balanced',
  },
  'memory_light': {
    triggerTokens: 10000,
    targetTokens: 5000,
    maxMemoryChars: 900,
    name: 'low-resource',
  },
  'vad_relaxed': {
    triggerTokens: 14000,
    targetTokens: 7000,
    maxMemoryChars: 1500,
    name: 'longer-context',
  },
};

// server/gemini.ts
const profile = profiles['baseline']; // Select at runtime
const liveConfig = {
  contextWindowCompression: {
    slidingWindow: {
      triggerTokens: profile.triggerTokens,
      targetTokens: profile.targetTokens,
    }
  }
};
```

## Acceptance Criteria
- [ ] Compression profiles: baseline, memory_light, vad_relaxed
- [ ] Trigger tokens tuned (12K baseline, 10K light)
- [ ] Target tokens tuned (6K baseline, 5K light)
- [ ] Profile selectable at runtime (config or env var)
- [ ] Memory context cap enforced (see #08)
- [ ] Tested with 10+ minute calls
- [ ] No context loss or response quality degradation
- [ ] Monitor token usage per profile

## Related Files
- `server/gemini.ts` — Live session config
- `server/character-voice.ts` — system prompt + memory injection
- `.env.production` — profile selection env var

## Status
**Post-hackathon tuning.** Works with defaults but not optimized.
