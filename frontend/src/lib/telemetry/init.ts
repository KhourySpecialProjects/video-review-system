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
    sendDefaultPii: config.privacyMode === "full",
    tracesSampleRate: 0,
    initialScope: { tags: { platform: "frontend" } },
    beforeBreadcrumb:
      config.privacyMode === "scrubbed"
        ? (breadcrumb) => scrubBreadcrumb(breadcrumb)
        : undefined,
  })
}
