import { describe, it, expect } from "vitest"
import { resolveTelemetryConfig, parametrizeUrl } from "./config"

describe("resolveTelemetryConfig", () => {
  it("is disabled when the DSN is empty", () => {
    const c = resolveTelemetryConfig({ VITE_GLITCHTIP_DSN: "", VITE_APP_ENV: "next-preview" })
    expect(c.enabled).toBe(false)
  })

  it("is enabled and carries dsn + environment when the DSN is set", () => {
    const c = resolveTelemetryConfig({
      VITE_GLITCHTIP_DSN: "https://abc@glitchtip.example/1",
      VITE_APP_ENV: "next-preview",
    })
    expect(c.enabled).toBe(true)
    expect(c.dsn).toBe("https://abc@glitchtip.example/1")
    expect(c.environment).toBe("next-preview")
  })

  it("defaults privacyMode to scrubbed when unset or unrecognized", () => {
    expect(resolveTelemetryConfig({}).privacyMode).toBe("scrubbed")
    expect(resolveTelemetryConfig({ VITE_TELEMETRY_PRIVACY: "nonsense" }).privacyMode).toBe("scrubbed")
  })

  it("honors privacyMode=full only for the exact string 'full'", () => {
    expect(resolveTelemetryConfig({ VITE_TELEMETRY_PRIVACY: "full" }).privacyMode).toBe("full")
  })

  it("falls back environment to 'local' when VITE_APP_ENV is unset or empty", () => {
    expect(resolveTelemetryConfig({}).environment).toBe("local")
    expect(resolveTelemetryConfig({ VITE_APP_ENV: "" }).environment).toBe("local")
    expect(resolveTelemetryConfig({ VITE_APP_ENV: "  " }).environment).toBe("local")
  })

  it("stays disabled for a whitespace-only DSN", () => {
    expect(resolveTelemetryConfig({ VITE_GLITCHTIP_DSN: "   " }).enabled).toBe(false)
  })

  it("sets release from the baked version env", () => {
    const c = resolveTelemetryConfig({
      VITE_GLITCHTIP_DSN: "https://x@h/1",
      VITE_APP_VERSION_BASE: "0.1.0",
      VITE_APP_BRANCH: "next",
      VITE_APP_COMMIT: "a1b2c3d4e5f6",
    })
    expect(c.release).toBe("vmp@0.1.0+next.a1b2c3d")
  })

  it("defaults release to vmp@0.0.0+local.local for an empty env", () => {
    expect(resolveTelemetryConfig({}).release).toBe("vmp@0.0.0+local.local")
  })
})

describe("parametrizeUrl", () => {
  it("replaces numeric id segments with :id", () => {
    expect(parametrizeUrl("/videos/12345/review")).toBe("/videos/:id/review")
  })
  it("replaces uuid segments with :id", () => {
    expect(parametrizeUrl("/videos/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed")).toBe("/videos/:id")
  })
  it("drops query strings", () => {
    expect(parametrizeUrl("/search?q=secret")).toBe("/search")
  })
  it("preserves absolute origins while scrubbing the path", () => {
    expect(parametrizeUrl("https://app.example/videos/42")).toBe("https://app.example/videos/:id")
  })
  it("returns the input unchanged when it cannot be parsed", () => {
    expect(parametrizeUrl("::::")).toBe("::::")
  })
})
