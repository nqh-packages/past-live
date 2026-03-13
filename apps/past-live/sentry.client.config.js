import * as Sentry from "@sentry/astro";

Sentry.init({
  dsn: "__SENTRY_DSN__",
  sendDefaultPii: true,
  enableLogs: true,
});
