import * as Sentry from "@sentry/node"

export type PrivacyMode = "full" | "scrubbed"

export interface TelemetryConfig {
  enabled: boolean
  dsn: string
  environment: string
  privacyMode: PrivacyMode
}

/**
 * Resolve backend telemetry config from process.env. Pure — takes the env so it
 * is testable. Privacy fails safe to "scrubbed"; empty DSN disables telemetry.
 */
export function resolveTelemetryConfig(env: NodeJS.ProcessEnv): TelemetryConfig {
  const dsn = (env.SENTRY_DSN ?? "").trim()
  return {
    enabled: dsn.length > 0,
    dsn,
    // `||` (not `??`) so an empty/whitespace value also falls back — the compose
    // default is `${SENTRY_ENVIRONMENT:-}`, which passes "" when unset.
    environment: env.SENTRY_ENVIRONMENT?.trim() || "unknown",
    privacyMode: env.TELEMETRY_PRIVACY === "full" ? "full" : "scrubbed",
  }
}

/**
 * Initialize Sentry/GlitchTip for the backend. No-op when the DSN is empty.
 * Tracing is off — error capture only. sendDefaultPii follows the privacy mode.
 */
export function initTelemetry(config: TelemetryConfig = resolveTelemetryConfig(process.env)): void {
  if (!config.enabled) return
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    sendDefaultPii: config.privacyMode === "full",
    tracesSampleRate: 0,
    initialScope: { tags: { platform: "backend" } },
  })
}
