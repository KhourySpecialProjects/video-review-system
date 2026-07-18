import { describe, it, expect } from "vitest"
import { resolveTelemetryConfig } from "../../lib/telemetry.js"

describe("resolveTelemetryConfig (backend)", () => {
  it("is disabled with no DSN", () => {
    expect(resolveTelemetryConfig({}).enabled).toBe(false)
  })

  it("is enabled and reads dsn + environment", () => {
    const c = resolveTelemetryConfig({
      SENTRY_DSN: "https://k@glitchtip.example/2",
      SENTRY_ENVIRONMENT: "next",
    })
    expect(c.enabled).toBe(true)
    expect(c.dsn).toBe("https://k@glitchtip.example/2")
    expect(c.environment).toBe("next")
  })

  it("defaults privacyMode to scrubbed unless exactly 'full'", () => {
    expect(resolveTelemetryConfig({}).privacyMode).toBe("scrubbed")
    expect(resolveTelemetryConfig({ TELEMETRY_PRIVACY: "full" }).privacyMode).toBe("full")
  })

  it("falls back environment to 'unknown' when unset or empty", () => {
    expect(resolveTelemetryConfig({}).environment).toBe("unknown")
    expect(resolveTelemetryConfig({ SENTRY_ENVIRONMENT: "" }).environment).toBe("unknown")
    expect(resolveTelemetryConfig({ SENTRY_ENVIRONMENT: "  " }).environment).toBe("unknown")
  })

  it("stays disabled for a whitespace-only DSN", () => {
    expect(resolveTelemetryConfig({ SENTRY_DSN: "   " }).enabled).toBe(false)
  })

  it("sets release from the provided version string", () => {
    const c = resolveTelemetryConfig(
      { SENTRY_DSN: "https://x@h/1" } as NodeJS.ProcessEnv,
      "0.1.0+next.a1b2c3d",
    )
    expect(c.release).toBe("vmp@0.1.0+next.a1b2c3d")
  })

  it("defaults release to vmp@unknown when no version string is given", () => {
    const c = resolveTelemetryConfig({ SENTRY_DSN: "https://x@h/1" } as NodeJS.ProcessEnv)
    expect(c.release).toBe("vmp@unknown")
  })
})
