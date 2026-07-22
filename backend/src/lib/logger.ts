import pino from "pino";

/**
 * Shared application logger powered by pino.
 *
 * @description Emits structured JSON lines whenever a `SENTRY_DSN` is set, so
 * the `Sentry.pinoIntegration` sees a clean `diagnostics_channel` and forwards
 * logs to GlitchTip. With no DSN (telemetry off, typical local) it uses
 * pino-pretty for colored, human-readable output. Import this wherever you need
 * to log outside of HTTP request context (startup, background jobs, error
 * handlers). For request-scoped logging, use `req.log` from pino-http.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(!process.env.SENTRY_DSN && {
    transport: {
      target: "pino-pretty",
    },
  }),
});
