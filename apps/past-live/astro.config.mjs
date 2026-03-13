// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import sentry from '@sentry/astro';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  integrations: [
    svelte(),
    sitemap(),
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
