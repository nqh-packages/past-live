import * as Sentry from "@sentry/astro";

const dsn = "__SENTRY_DSN__";

if (dsn && dsn !== '__SENTRY_DSN__') {
  Sentry.init({
    dsn,
    sendDefaultPii: true,
    enableLogs: true,
  });
}
