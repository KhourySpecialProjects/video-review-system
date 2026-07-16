export type PrivacyMode = "full" | "scrubbed"

export interface TelemetryConfig {
  enabled: boolean
  dsn: string
  environment: string
  privacyMode: PrivacyMode
}

/**
 * Resolve telemetry config from build-time env. Pure — takes the env subset so
 * it is testable without import.meta. Privacy fails safe to "scrubbed"; an empty
 * DSN disables telemetry entirely.
 */
export function resolveTelemetryConfig(env: {
  VITE_GLITCHTIP_DSN?: string
  VITE_APP_ENV?: string
  VITE_TELEMETRY_PRIVACY?: string
}): TelemetryConfig {
  const dsn = env.VITE_GLITCHTIP_DSN ?? ""
  return {
    enabled: dsn.length > 0,
    dsn,
    environment: env.VITE_APP_ENV ?? "local",
    privacyMode: env.VITE_TELEMETRY_PRIVACY === "full" ? "full" : "scrubbed",
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LONG_HEX_RE = /^[0-9a-f]{16,}$/i
const NUMERIC_RE = /^[0-9]+$/

/**
 * Replace id-like path segments (numeric, uuid, long hex) with ":id" and drop
 * the query string, so scrubbed breadcrumbs don't carry record identifiers.
 */
export function parametrizeUrl(raw: string): string {
  try {
    const hasProto = /^https?:\/\//i.test(raw)

    // If no protocol and doesn't look like a path, return unchanged
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

/** Resolved once from build-time env for app use. */
export const telemetryConfig: TelemetryConfig = resolveTelemetryConfig(import.meta.env)
