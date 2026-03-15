# Implement audio output queue with backpressure + jitter buffer

## Context
Investigation of 11 hackathon repos showed musai (Flutter app) built the most sophisticated audio output buffering: JitterBuffer with maxSize=10, bounded queue, native audio sink, and `clearVocalBuffer()` on new turn. This prevents audio dropout and queue overflow.

## Problem
When Gemini sends audio faster than browser can play it:
- Audio chunks queue unbounded in memory
- Playback lags (stale audio plays late)
- Browser memory grows
- If user interrupts, stale audio keeps playing (confusing)

## Current State
- ✅ AudioOutputQueue created in `server/audio-output-queue.ts` (commit: `aa3843b feat(past-live): add bounded audio output queue`)
- ✅ Maxsize enforced (drops oldest on overflow)
- ❌ Jitter buffer not implemented (browser playback timing)
- ❌ No `clearVocalBuffer()` on new turn
- ❌ No state machine for "modelSpeaking" / barge-in discard

## Solution (from musai)
1. Bounded JitterBuffer on client (maxSize=10 chunks)
2. Drop oldest chunk on overflow (backpressure)
3. On user interrupt (`interrupted` message):
   - Clear all queued audio
   - Discard incoming audio until turn_complete
4. On new model turn:
   - Clear jitter buffer (`clearVocalBuffer()`)
   - Reset playback cursor

## Implementation
```typescript
// src/lib/jitter-buffer.ts
class JitterBuffer {
  private buffer: AudioChunk[] = [];
  readonly maxSize = 10;

  enqueue(chunk: AudioChunk) {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift(); // Drop oldest
    }
    this.buffer.push(chunk);
  }

  clear() {
    this.buffer = [];
  }

  dequeue(): AudioChunk | undefined {
    return this.buffer.shift();
  }
}

// src/components/islands/SessionPreview.svelte
onMessage('interrupted', () => {
  jitterBuffer.clear();
  audioContext.stop();
});

onMessage('output_audio', (msg) => {
  if (discardingAudio) return; // Barge-in: drop audio
  jitterBuffer.enqueue(msg.audio);
  schedulePlayback();
});
```

## Acceptance Criteria
- [ ] JitterBuffer class implemented (max 10 chunks)
- [ ] Backpressure on overflow (drop oldest)
- [ ] On `interrupted` message: clear queue + stop playback
- [ ] On new turn: call `clearVocalBuffer()`
- [ ] Memory stable during 10+ minute calls
- [ ] No stale audio after barge-in

## Related Files
- `server/audio-output-queue.ts` — server-side queue
- `src/lib/audio-playback.ts` — client-side playback
- `src/components/islands/SessionPreview.svelte` — message handler

## Status
**In Progress.** Partially implemented server-side. Client-side buffering needed.
