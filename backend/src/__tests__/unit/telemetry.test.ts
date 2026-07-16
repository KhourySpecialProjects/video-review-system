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

  it("falls back environment to 'unknown'", () => {
    expect(resolveTelemetryConfig({}).environment).toBe("unknown")
  })
})
