import * as Sentry from "@sentry/react"
import { parametrizeUrl, telemetryConfig, type TelemetryConfig } from "./config"

/**
 * Scrub id-like values out of a breadcrumb's URL fields. Applied only in
 * scrubbed mode via beforeBreadcrumb.
 */
export function scrubBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb {
  const data = breadcrumb.data
  if (!data) return breadcrumb
  if (typeof data.url === "string") data.url = parametrizeUrl(data.url)
  if (typeof data.from === "string") data.from = parametrizeUrl(data.from)
  if (typeof data.to === "string") data.to = parametrizeUrl(data.to)
  return breadcrumb
}

/**
 * Scrub a GlitchTip log before send. "full" is a no-op; "scrubbed" parametrizes
 * the message and every string-valued attribute via parametrizeUrl. Symmetric
 * with the backend scrubber (backend/src/lib/telemetry.ts).
 */
export function scrubLog(log: Sentry.Log, mode: TelemetryConfig["privacyMode"]): Sentry.Log {
  if (mode === "full") return log
  const attributes = log.attributes
    ? Object.fromEntries(
        Object.entries(log.attributes).map(([key, value]) => [
          key,
          typeof value === "string" ? parametrizeUrl(value) : value,
        ]),
      )
    : log.attributes
  return { ...log, message: parametrizeUrl(log.message), attributes }
}

/**
 * Initialize Sentry/GlitchTip for the browser. No-op when the DSN is empty, so
 * local dev runs clean. Tracing and replay are intentionally off — errors and
 * breadcrumbs only. In scrubbed mode, breadcrumb URLs are parametrized and PII
 * is not attached; in full mode both are sent as-is.
 */
export function initTelemetry(config: TelemetryConfig = telemetryConfig): void {
  if (!config.enabled) return
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    sendDefaultPii: config.privacyMode === "full",
    tracesSampleRate: 0,
    enableLogs: true,
    integrations: [Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] })],
    initialScope: { tags: { platform: "frontend" } },
    beforeSendLog: (log) => scrubLog(log, config.privacyMode),
    beforeBreadcrumb:
      config.privacyMode === "scrubbed"
        ? (breadcrumb) => scrubBreadcrumb(breadcrumb)
        : undefined,
  })
}
