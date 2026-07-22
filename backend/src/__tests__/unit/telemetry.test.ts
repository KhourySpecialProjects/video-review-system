import { describe, it, expect } from "vitest"
import type { Log } from "@sentry/node"
import { parametrizeUrl, resolveTelemetryConfig, scrubLog } from "../../lib/telemetry.js"

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

describe("parametrizeUrl", () => {
  it("replaces numeric path segments with :id", () => {
    // Input: a path whose last segment is a record id.
    // Expected: the numeric segment collapses to :id.
    expect(parametrizeUrl("/api/videos/12345")).toBe("/api/videos/:id")
  })

  it("replaces uuid path segments with :id", () => {
    // Input: a path with a uuid segment.
    // Expected: the uuid collapses to :id.
    expect(parametrizeUrl("/api/videos/f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(
      "/api/videos/:id",
    )
  })

  it("replaces long-hex path segments with :id", () => {
    // Input: a path with a 16+ char hex token.
    // Expected: the hex segment collapses to :id.
    expect(parametrizeUrl("/api/tokens/deadbeefdeadbeef")).toBe("/api/tokens/:id")
  })

  it("drops the query string", () => {
    // Input: a path with an id and a query carrying a secret.
    // Expected: id is parametrized and the query string is dropped entirely.
    expect(parametrizeUrl("/api/videos/1?token=secret")).toBe("/api/videos/:id")
  })

  it("preserves the origin for absolute urls", () => {
    // Input: an absolute url with an id segment.
    // Expected: origin is kept, the id segment collapses to :id.
    expect(parametrizeUrl("https://app.example.com/users/42")).toBe(
      "https://app.example.com/users/:id",
    )
  })

  it("passes non-url strings through unchanged", () => {
    // Input: a plain log message that is not a url or path.
    // Expected: returned verbatim.
    expect(parametrizeUrl("server listening")).toBe("server listening")
  })
})

describe("scrubLog", () => {
  it("returns the log unchanged in full mode", () => {
    // Input: a log with id-bearing message/attributes and full privacy.
    // Expected: the exact same object is returned — no scrubbing.
    const log: Log = {
      level: "info",
      message: "/api/videos/1",
      attributes: { url: "/api/videos/2" },
    }

    expect(scrubLog(log, "full")).toBe(log)
  })

  it("parametrizes the message in scrubbed mode", () => {
    // Input: a log whose message is an id-bearing path, scrubbed privacy.
    // Expected: the message is parametrized.
    const log: Log = { level: "info", message: "/api/videos/1" }

    expect(scrubLog(log, "scrubbed").message).toBe("/api/videos/:id")
  })

  it("parametrizes string attributes and preserves non-strings in scrubbed mode", () => {
    // Input: attributes mixing an id-bearing url string and a number.
    // Expected: the string is parametrized; the number is untouched.
    const log: Log = {
      level: "info",
      message: "request completed",
      attributes: { path: "/api/videos/9", count: 3 },
    }

    expect(scrubLog(log, "scrubbed").attributes).toEqual({
      path: "/api/videos/:id",
      count: 3,
    })
  })

  it("never returns null", () => {
    // Input: any log, either privacy mode.
    // Expected: scrubLog always yields a log, never suppresses it.
    const log: Log = { level: "warn", message: "/x/1" }

    expect(scrubLog(log, "scrubbed")).not.toBeNull()
    expect(scrubLog(log, "full")).not.toBeNull()
  })
})
