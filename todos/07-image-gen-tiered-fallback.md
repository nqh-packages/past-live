# Implement tiered image generation fallback + circuit breaker

## Context
Commit `39d7048 fix(past-live): add responseModalities to all image generation calls` fixed part of the issue. But reveria (polished competitor) implemented sophisticated tiered fallback: Imagen 3 (best) → reduced → Gemini native interleaved, with circuit breaker + rate limiter for free-tier throttling.

## Problem
Free tier image gen takes 12-15 seconds (user experiences dead air). Paid tier takes 2-3s ($0.25/session). No fallback when quota exhausted.

## Current State
- ✅ Using Imagen 3.1 for character portraits
- ✅ Using Gemini 3.1 for scene images
- ⚠️ No fallback on quota/rate limit
- ❌ No circuit breaker
- ❌ All calls wait synchronously

## Solution (from reveria)
```typescript
// server/image-generation.ts
class ImageGenerator {
  private circuitBreakerTripped = false;
  private circuitBreakerUntil = 0;
  private readonly CIRCUIT_BREAKER_COOLDOWN = 60000; // 60s

  async generatePortrait(charName: string) {
    // Tier 1: Try Imagen 3 full
    try {
      if (!this.isCircuitBreakerTripped()) {
        return await generateWithImagenFull(charName);
      }
    } catch (e) {
      if (e.code === 429) { // Rate limited
        this.tripCircuitBreaker();
        // Fall through to Tier 2
      }
    }

    // Tier 2: Imagen 3 reduced quality
    try {
      return await generateWithImagenReduced(charName);
    } catch (e) {
      // Fall through to Tier 3
    }

    // Tier 3: Gemini native interleaved
    return {
      source: 'gemini_native',
      placeholder: true, // Show placeholder until Live API generates
    };
  }

  private tripCircuitBreaker() {
    this.circuitBreakerTripped = true;
    this.circuitBreakerUntil = Date.now() + this.CIRCUIT_BREAKER_COOLDOWN;
  }

  private isCircuitBreakerTripped() {
    if (this.circuitBreakerTripped && Date.now() > this.circuitBreakerUntil) {
      this.circuitBreakerTripped = false;
    }
    return this.circuitBreakerTripped;
  }
}
```

## Acceptance Criteria
- [ ] Tiered fallback: Imagen full → reduced → Gemini native
- [ ] Circuit breaker: trip on 429, cooldown 60s
- [ ] Rate limiter: per-user semaphore (max 1 concurrent image gen)
- [ ] Exponential backoff on 429 errors
- [ ] Free-tier calls cap at 2-3 images/session
- [ ] Fallback to Gemini native doesn't block Live session
- [ ] Character portrait always loads (even if reduced/native)

## Related Files
- `server/image-generation.ts` — image gen logic
- `server/relay.ts` — tool call handling
- `server/gemini.ts` — Gemini Live image tool

## Status
**Post-hackathon improvement.** Current single-tier approach works but slow on free tier.
