# Past, Live — Agent Context (2026-03-15)

## Topic

Fix issues found by 5-judge hackathon panel evaluation. Trivial to medium fixes only — no architectural changes.

## What is Past, Live?

Voice-first educational app where students call historical figures via Gemini Live API. Hackathon submission for Gemini Live Agent Challenge (deadline March 16, 2026 @ 8pm EDT). Astro 5 + Svelte 5 frontend, Hono backend on Cloud Run.

## Governance Files (MUST READ)

| File | What it contains | Why agent needs it |
|------|-----------------|-------------------|
| `apps/past-live/CLAUDE.md` | All decisions, architecture, stack, gotchas | Single source of truth |
| `/Volumes/BIWIN/CODES/astro/CLAUDE.md` | Monorepo conventions, stack, patterns | Monorepo-wide rules |

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Astro 5 + Svelte 5 |
| Styling | Tailwind CSS v4 |
| Auth | Clerk (`@clerk/astro`) |
| Backend | Hono on Cloud Run (separate, not in scope) |
| State | Nano Stores (`nanostores`) |

## Key Files (task-relevant)

| File | Purpose | LOC |
|------|---------|-----|
| `src/pages/app.astro` | Home screen — topic input + 3 preset cards + SessionPreview overlay | 132 |
| `src/pages/session.astro` | In-call UI — chat, controls, timer | 159 |
| `src/components/SessionPreview.svelte` | Preview overlay: events, fetch, palette, enter session | 412 |
| `src/components/SessionPreviewBody.svelte` | Preview body: images, fields, edit, mic, actions | 263 |
| `src/layouts/BaseLayout.astro` | Shared HTML shell: fonts, analytics, auth | 63 |

## Design Conventions

- Terminal/dispatch aesthetic: `>` prefix, `[ brackets ]` for CTAs, monospace
- Error copy stays in phone metaphor: "SIGNAL LOST", "the past is not responding"
- Tailwind v4 with `@theme {}` tokens in `global.css`
- Svelte 5 runes: `$state()`, `$derived()`, `$effect()`, `$props()`
- `font-mono` for UI text, `font-serif italic` for headlines, `font-display` for accent

## What Just Happened

5 hackathon judges (Google DevRel, VC, EdTech Professor, Competitor, AI Safety) evaluated the app via browser automation. They found issues ranging from trivial to critical. The trivial/low-effort fixes are being delegated to parallel agents. Reports at `user-testing-output/judges-panel/per-persona/*/report.md`.
