import { describe, it, expect, vi, beforeEach } from "vitest"

const scopeMocks = {
  setTag: vi.fn(),
  setContext: vi.fn(),
  addAttachment: vi.fn(),
}

vi.mock("@sentry/react", () => ({
  withScope: (cb: (scope: unknown) => void) => cb(scopeMocks),
  captureMessage: vi.fn(),
}))

const telemetryConfigMock = vi.hoisted<{ privacyMode: "full" | "scrubbed" }>(() => ({
  privacyMode: "scrubbed",
}))

vi.mock("@/lib/telemetry/config", async () => {
  const actual = await vi.importActual<typeof import("@/lib/telemetry/config")>(
    "@/lib/telemetry/config",
  )
  return {
    ...actual,
    telemetryConfig: telemetryConfigMock,
  }
})

import { captureFeedback } from "./captureFeedback"
import * as Sentry from "@sentry/react"

const captureMessage = vi.mocked(Sentry.captureMessage)
const setTag = scopeMocks.setTag
const setContext = scopeMocks.setContext
const addAttachment = scopeMocks.addAttachment

beforeEach(() => {
  setTag.mockClear()
  setContext.mockClear()
  addAttachment.mockClear()
  captureMessage.mockClear()
  telemetryConfigMock.privacyMode = "scrubbed"
})

describe("captureFeedback", () => {
  it("tags the event as feedback with its type and sends the message at info level", () => {
    captureFeedback({ type: "bug", message: "Upload spins forever", route: "/videos/7/review" })
    expect(setTag).toHaveBeenCalledWith("feedback", true)
    expect(setTag).toHaveBeenCalledWith("feedback.type", "bug")
    expect(captureMessage).toHaveBeenCalledWith("Upload spins forever", "info")
  })

  it("attaches the screenshot when present", () => {
    const png = new Uint8Array([1, 2, 3])
    captureFeedback({ type: "idea", message: "Nice to have", route: "/", screenshot: png })
    expect(addAttachment).toHaveBeenCalledWith({
      filename: "screenshot.png",
      data: png,
      contentType: "image/png",
    })
  })

  it("does not attach when there is no screenshot", () => {
    captureFeedback({ type: "confusing", message: "What is this?", route: "/" })
    expect(addAttachment).not.toHaveBeenCalled()
  })

  it("parametrizes the route context in scrubbed mode", () => {
    telemetryConfigMock.privacyMode = "scrubbed"
    captureFeedback({ type: "bug", message: "Upload spins forever", route: "/videos/7/review" })
    expect(setContext).toHaveBeenCalledWith("feedback", { route: "/videos/:id/review" })
  })

  it("keeps the raw route context in full mode", () => {
    telemetryConfigMock.privacyMode = "full"
    captureFeedback({ type: "bug", message: "Upload spins forever", route: "/videos/7/review" })
    expect(setContext).toHaveBeenCalledWith("feedback", { route: "/videos/7/review" })
  })
})
