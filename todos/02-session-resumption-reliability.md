# Session resumption crash fix + GoAway handling

## Context
Commit `cb5387b fix(past-live): sessionResumption crash + logging + image gen benchmark` documented the crash. Investigation of 11 hackathon repos showed reveria (most polished competitor) implemented robust session resumption with GoAway handling.

## Problem
Sessions crash with `sessionResumption` config. Issue was `transparent: true` field (doesn't exist in API, crashes connection). Also no handling for GoAway messages from Gemini server.

## Current State
- ✅ Crash fixed (config structure corrected)
- ⚠️ No GoAway message handling
- ⚠️ No reconnect retry logic with backoff
- ⚠️ Max 3 reconnects hardcoded, no exponential backoff

## Solution (from reveria)
1. Extract resumption handle from `response.session_resumption_update.new_handle`
2. Listen for `server.interrupted` (GoAway signal)
3. Implement exponential backoff on reconnect (1s, 2s, 4s)
4. Max 3 reconnect attempts
5. Track last resumption handle per session
6. Reset handle on fresh session (no resumption)

## Implementation
```typescript
// server/gemini.ts

// After ai.live.connect(), listen for GoAway
session.on('interrupted', async () => {
  if (reconnectAttempts < 3) {
    delay = Math.pow(2, reconnectAttempts) * 1000;
    await new Promise(r => setTimeout(r, delay));

    // Reconnect with stored resumption handle
    const newSession = await ai.live.connect({
      ...config,
      sessionResumption: { handle: lastResumptionHandle }
    });
  } else {
    // Force close, send to browser
    sendToClient({ type: 'ended', reason: 'server_goaway_max_retries' });
  }
});
```

## Acceptance Criteria
- [ ] GoAway message detection implemented
- [ ] Exponential backoff on reconnect (1s, 2s, 4s)
- [ ] Resumption handle extracted and stored
- [ ] Max 3 reconnect attempts enforced
- [ ] Tested with forced network interruption
- [ ] Browser receives clear error if all retries fail

## Related Files
- `server/gemini.ts` — session connection logic
- `server/relay.ts` — WebSocket message routing
- Commit `cb5387b` — previous session resumption work

## Status
**Post-hackathon improvement.** Current fix (removed `transparent`) works for demos.
