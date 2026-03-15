// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import sentry from '@sentry/astro';
import clerk from '@clerk/astro';

// loadEnv from the app directory so Clerk picks up PUBLIC_CLERK_PUBLISHABLE_KEY
// before Vite's own env loading kicks in — required in monorepo setups
const __dirname = dirname(fileURLToPath(import.meta.url));
const env = loadEnv(process.env.NODE_ENV ?? 'development', __dirname, '');

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  integrations: [
    svelte(),
    sitemap(),
    clerk({
      publishableKey: env.PUBLIC_CLERK_PUBLISHABLE_KEY,
      signInUrl: '/sign-in',
      signUpUrl: '/sign-up',
    }),
    sentry({
      project: 'javascript-astro',
      org: 'nqh',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
