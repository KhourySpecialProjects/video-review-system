import * as Sentry from "@sentry/node"
import type { Log } from "@sentry/node"

export type PrivacyMode = "full" | "scrubbed"

export interface TelemetryConfig {
  enabled: boolean
  dsn: string
  environment: string
  privacyMode: PrivacyMode
  release: string
}

/**
 * Resolve backend telemetry config from process.env. Pure — takes the env so it
 * is testable. Privacy fails safe to "scrubbed"; empty DSN disables telemetry.
 * `versionString` is the app's full version (see lib/version.ts); the GlitchTip
 * release format `vmp@{fullVersion}` is authoritative — see Global Constraints
 * in docs/superpowers/specs/2026-07-18-version-release-numbering-design.md.
 */
export function resolveTelemetryConfig(
  env: NodeJS.ProcessEnv,
  versionString?: string,
): TelemetryConfig {
  const dsn = (env.SENTRY_DSN ?? "").trim()
  return {
    enabled: dsn.length > 0,
    dsn,
    // `||` (not `??`) so an empty/whitespace value also falls back — the compose
    // default is `${SENTRY_ENVIRONMENT:-}`, which passes "" when unset.
    environment: env.SENTRY_ENVIRONMENT?.trim() || "unknown",
    privacyMode: env.TELEMETRY_PRIVACY === "full" ? "full" : "scrubbed",
    release: `vmp@${versionString ?? "unknown"}`,
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
    release: config.release,
    sendDefaultPii: config.privacyMode === "full",
    tracesSampleRate: 0,
    enableLogs: true,
    integrations: [Sentry.pinoIntegration()],
    beforeSendLog: (log) => scrubLog(log, config.privacyMode),
    initialScope: { tags: { platform: "backend" } },
  })
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LONG_HEX_RE = /^[0-9a-f]{16,}$/i
const NUMERIC_RE = /^[0-9]+$/

/**
 * Replace id-like path segments (numeric, uuid, long hex) with ":id" and drop
 * the query string. Ported from the frontend scrubber (frontend/src/lib/
 * telemetry/config.ts) — a different package, so it cannot be imported. Non-URL
 * strings pass through unchanged.
 */
export function parametrizeUrl(raw: string): string {
  try {
    const hasProto = /^https?:\/\//i.test(raw)

    // If no protocol and doesn't look like a path, return unchanged.
    if (!hasProto && !raw.startsWith("/")) {
      return raw
    }

    const u = new URL(raw, hasProto ? undefined : "http://placeholder.invalid")
    const scrubbedPath = u.pathname
      .split("/")
      .map((seg) =>
        NUMERIC_RE.test(seg) || UUID_RE.test(seg) || LONG_HEX_RE.test(seg) ? ":id" : seg,
      )
      .join("/")
    return hasProto ? `${u.origin}${scrubbedPath}` : scrubbedPath
  } catch {
    return raw
  }
}

/**
 * Scrub a GlitchTip log before send. "full" is a no-op; "scrubbed" parametrizes
 * the message and every string-valued attribute through `parametrizeUrl`.
 * Never drops the log (never returns null) — scrubbing, not suppression.
 */
export function scrubLog(log: Log, mode: PrivacyMode): Log {
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
