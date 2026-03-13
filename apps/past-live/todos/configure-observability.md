# Configure Sentry + PostHog

## Context
Sentry and PostHog scaffolded but need project-specific credentials.

## Sentry Setup

1. Create Sentry project at [sentry.io](https://sentry.io) (org: nqh)
2. Copy DSN from project settings
3. Replace `__SENTRY_DSN__` in both config files:
   - `sentry.client.config.js`
   - `sentry.server.config.js`
4. Add `SENTRY_AUTH_TOKEN` env var for source map uploads:
   - Local: `.env` file
   - CI: GitHub Actions secrets
5. Source maps auto-upload via `upload_source_maps: true` in wrangler.jsonc

### Files
- `sentry.client.config.js` — Client-side SDK init (app root)
- `sentry.server.config.js` — Server-side SDK init (app root)
- `astro.config.mjs` — Sentry integration (auto-instruments)

### Error Capture in Svelte Islands
```svelte
<script>
  import * as Sentry from '@sentry/astro';

  function riskyAction() {
    try { /* ... */ } catch (e) { Sentry.captureException(e); }
  }
</script>
```

## PostHog Setup

1. Create PostHog project (use EU cloud for GDPR: eu.posthog.com)
2. Copy API key (`phc_...`)
3. Add to `.env.production`:
```
PUBLIC_POSTHOG_KEY=phc_your_key
```
4. Add `<PostHog />` to your layout's `<head>`:
```astro
---
import PostHog from '@/components/posthog.astro';
---
<head>
  <PostHog />
</head>
```

### Custom Events from Svelte Islands
```javascript
// window.posthog is globally available
posthog.capture('cta_clicked', { location: 'hero' })
```

## Related Files
- sentry.client.config.js (app root)
- sentry.server.config.js (app root)
- src/components/posthog.astro (inline snippet, no npm package)
- astro.config.mjs (sentry integration)
- .env.production
- wrangler.jsonc (upload_source_maps)
