import { describe, it, expect, vi } from "vitest"
import * as Sentry from "@sentry/react"
import { scrubBreadcrumb, initTelemetry, scrubLog } from "./init"
import type { TelemetryConfig } from "./config"

vi.mock("@sentry/react", async (importActual) => {
  const actual = await importActual<typeof Sentry>()
  return { ...actual, init: vi.fn() }
})

const enabledConfig: TelemetryConfig = {
  enabled: true,
  dsn: "https://public@localhost:8000/1",
  environment: "local",
  privacyMode: "full",
  release: "vmp@0.0.0",
}

describe("scrubBreadcrumb", () => {
  it("parametrizes the url on a navigation breadcrumb", () => {
    const out = scrubBreadcrumb({
      category: "navigation",
      data: { from: "/videos/12", to: "/videos/34/review" },
    })
    expect(out.data).toEqual({ from: "/videos/:id", to: "/videos/:id/review" })
  })

  it("parametrizes a generic data.url (fetch/xhr)", () => {
    const out = scrubBreadcrumb({ category: "fetch", data: { url: "/api/videos/99?token=x" } })
    expect(out.data?.url).toBe("/api/videos/:id")
  })

  it("leaves breadcrumbs without urls untouched", () => {
    const out = scrubBreadcrumb({ category: "ui.click", message: "button" })
    expect(out.message).toBe("button")
  })
})

describe("initTelemetry", () => {
  it("enables logs and installs a beforeSendLog hook", () => {
    initTelemetry(enabledConfig)
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enableLogs: true,
        beforeSendLog: expect.any(Function),
      }),
    )
  })
})

describe("scrubLog", () => {
  it("parametrizes message and string attributes in scrubbed mode", () => {
    const out = scrubLog(
      {
        level: "info",
        message: "/api/videos/1",
        attributes: { path: "/api/videos/2", count: 3 },
      },
      "scrubbed",
    )
    expect(out.message).toBe("/api/videos/:id")
    expect(out.attributes).toEqual({ path: "/api/videos/:id", count: 3 })
  })

  it("passes the log through unchanged in full mode", () => {
    const log: Sentry.Log = { level: "info", message: "/api/videos/1" }
    expect(scrubLog(log, "full")).toBe(log)
  })
})
