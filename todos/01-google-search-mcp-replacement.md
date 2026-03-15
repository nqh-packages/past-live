# Replace googleSearch with custom MCP tool

## Context
Hackathon investigation found that 228+ Gemini Live Agent submissions exist. Our direct competitors (Socratica, OpenTeacher, IceBreaker) use various patterns to handle external tools.

## Problem
`googleSearch` tool crashes Gemini Live sessions with tool calling + native audio (GitHub issue #843). We removed it. But cadre-ai (9★ hackathon submission) built a custom MCP DuckDuckGo server as a drop-in replacement that works reliably.

## Current State
- ✅ Tool removed in commit: `bd5f9ed fix(relay): kill googleSearch tool`
- ❌ No replacement built
- ❌ Characters lack access to real-time facts

## Solution (from cadre-ai)
Build MCP web search tool (`web_search_mcp/server.py` in their repo):
1. Wraps DuckDuckGo API (free, no auth)
2. Registered as MCP server running as subprocess
3. ADK orchestrator calls it synchronously
4. Returns 3-5 results in structured format
5. Characters can reference facts naturally

## Implementation
Not urgent for hackathon — characters can rely on historical knowledge. But post-submission, could build:
```
server/tools/mcp-web-search.ts
- Initialize MCP client
- Implement search() function
- Add to tool declarations for Live sessions
```

## Acceptance Criteria
- [ ] MCP web search tool implemented (or documented as future work)
- [ ] Tool safe to call during Live sessions (no crash on #843)
- [ ] Tested with 1 character scenario

## Related Files
- `server/gemini.ts` — tool declarations
- `server/relay.ts` — Gemini Live config
- GitHub issue #843 — tool calling + native audio fragility

## Status
**Deferred** — post-hackathon. Keep current character knowledge approach.
