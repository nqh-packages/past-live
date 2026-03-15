# Past, Live — Public Repo Extraction (2026-03-14)

## Topic

Extract `apps/past-live/` from a private Astro monorepo into a standalone public GitHub repo with full git history, for Gemini Live Agent Challenge hackathon submission.

## What is Past, Live?

"Call the past" — students call historical figures via Gemini Live API real-time voice. Built for the Gemini Live Agent Challenge hackathon (deadline: March 16, 2026 @ 8:00pm EDT). The app lives at `apps/past-live/` in a private monorepo and must be extracted to a public repo without exposing other apps.

## Governance Files (MUST READ)

| File | What it contains | Why agent needs it |
|------|-----------------|-------------------|
| `apps/past-live/CLAUDE.md` | All decisions, architecture, stack, gotchas | Single source of truth for project |
| `~/.claude/CLAUDE.md` | Universal rules, code style, testing, security | Monorepo-wide governance |

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Astro 5 + Svelte 5 |
| Backend | Hono (TS) on Cloud Run (`apps/past-live/server/`) |
| AI Voice | Gemini Live API |
| AI Image | Gemini 3.1 Flash Image |
| Profile DB | Firestore |
| Auth | Clerk |
| Frontend Host | Cloudflare Workers |

## Current Monorepo Structure

```
/Volumes/BIWIN/CODES/astro/          ← private monorepo root
├── pnpm-workspace.yaml               ← catalog: versions for ALL apps
├── package.json                       ← root workspace
├── apps/
│   ├── past-live/                     ← THIS APP (extract this)
│   │   ├── package.json               ← uses catalog: references
│   │   ├── server/                    ← backend (own package.json, NOT in workspace)
│   │   │   ├── package.json           ← hardcoded versions (no catalog)
│   │   │   └── src/
│   │   ├── src/                       ← frontend
│   │   ├── design/                    ← design docs
│   │   ├── todos/                     ← hackathon todo files
│   │   └── ...
│   ├── andean-camel/                  ← OTHER APP (do NOT extract)
│   ├── kokura/                        ← OTHER APP (do NOT extract)
│   └── ...
├── packages/                          ← shared packages (NOT imported by past-live)
└── ...
```

## Key Facts

1. `apps/past-live/` does NOT import any shared packages (`@brandr/*`, `@tablespot/*`, `@nqh/*`)
2. `apps/past-live/package.json` uses `catalog:` version references that resolve from root `pnpm-workspace.yaml`
3. `apps/past-live/server/` has its own `package.json` with hardcoded versions (not in pnpm workspace)
4. There are 27 commits touching `apps/past-live/` with clean, genuine development history
5. The `scripts/kill-port.sh` is referenced in `predev` script — either include it or remove the predev script

## Catalog Versions to Resolve

These `catalog:` references in `apps/past-live/package.json` must be replaced with actual semver from root `pnpm-workspace.yaml`:

| Package | Catalog Version |
|---------|----------------|
| `@astrojs/cloudflare` | `^12.6.12` |
| `@astrojs/sitemap` | `^3.7.0` |
| `@astrojs/svelte` | `^7.0.9` |
| `@clerk/astro` | `^2.16.14` |
| `@sentry/astro` | `^10.38.0` |
| `@tailwindcss/vite` | `^4.1.11` |
| `astro` | `^5.16.14` |
| `astro-seo` | `^1.1.0` |
| `nanostores` | `^1.1.0` |
| `svelte` | `^5.48.0` |
| `tailwindcss` | `^4.1.11` |
| `web-haptics` | `^0.0.6` |
| `@astrojs/check` | `^0.9.6` |
| `@axe-core/playwright` | `^4.11.1` |
| `@playwright/test` | `^1.57.0` |
| `@sveltejs/vite-plugin-svelte` | `^6.2.4` |
| `@testing-library/svelte` | `^5.3.1` |
| `jsdom` | `^27.4.0` |
| `typescript` | `^5.8.3` |
| `vite` | `^7.3.1` |
| `vitest` | `^4.0.18` |

## Target Public Repo Structure

```
past-live/                             ← new public repo root
├── README.md                          ← spin-up instructions for judges
├── package.json                       ← workspace root (single app)
├── pnpm-workspace.yaml                ← packages: ['apps/past-live']
├── pnpm-lock.yaml                     ← generated fresh
├── .gitignore
├── apps/
│   └── past-live/
│       ├── package.json               ← catalog: replaced with real versions
│       ├── server/                    ← backend unchanged
│       ├── src/                       ← frontend unchanged
│       ├── design/                    ← design docs
│       ├── public/                    ← static assets
│       ├── astro.config.mjs
│       ├── tsconfig.json
│       ├── wrangler.jsonc
│       └── ...
└── (NO packages/, NO other apps/)
```

## Extraction Method

Use `git filter-repo` to preserve real commit history:

```bash
# 1. Clone the monorepo to a temp location
git clone /Volumes/BIWIN/CODES/astro /tmp/past-live-extract

# 2. Filter to only past-live paths
cd /tmp/past-live-extract
git filter-repo --path apps/past-live/ --path pnpm-workspace.yaml --path .gitignore

# 3. Clean up: rewrite pnpm-workspace.yaml to only list apps/past-live
# 4. Resolve catalog: references in apps/past-live/package.json
# 5. Create root package.json (minimal workspace root)
# 6. Remove predev script (references monorepo script)
# 7. Add README.md with spin-up instructions
# 8. Commit cleanup changes
# 9. Ready for: git remote add origin <public-repo-url> && git push
```

## README Content Requirements (from hackathon rules)

The README must include:
- What the project does (1-2 paragraphs)
- Architecture overview (can reference diagram image)
- Spin-up instructions: step-by-step guide to run locally
- Environment variables needed (with `.env.example`)
- How to deploy to Cloud Run
- Tech stack list
- Demo video link (placeholder for now)

## Spin-Up Instructions Should Cover

### Frontend
```bash
pnpm install
# Set up .env with Clerk keys
pnpm dev --filter past-live
```

### Backend
```bash
cd apps/past-live/server
pnpm install
# Set up .env with GEMINI_API_KEY
pnpm dev
```

### Cloud Run Deploy
```bash
cd apps/past-live/server
gcloud run deploy past-live-backend --source . --region us-central1
```

## Files to EXCLUDE from public repo

| Pattern | Why |
|---------|-----|
| `apps/past-live/docs/sub-agents-works/` | Internal delegation docs |
| `apps/past-live/user-testing-output/` | Internal persona testing |
| `apps/past-live/.claude/` | Claude Code rules (monorepo-specific) |
| Any `.env`, `.dev.vars` | Secrets |
| `node_modules/` | Dependencies |

## What NOT to Do

- Do NOT squash commits — judges want to see genuine development process
- Do NOT include any other apps or packages from the monorepo
- Do NOT leave `catalog:` references in package.json (pnpm install will fail)
- Do NOT include monorepo-specific scripts (kill-port.sh, create-astro-app.sh)
- Do NOT include `.claude/` rules directories (monorepo-specific)
- Do NOT push yet — just prepare the repo at `/tmp/past-live-extract`, user will provide GitHub URL
