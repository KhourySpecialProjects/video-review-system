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
})

describe("captureFeedback", () => {
  it("tags the event as feedback with its type and sends the message at info level", () => {
    captureFeedback({ type: "bug", message: "Upload spins forever", route: "/videos/1/review" })
    expect(setTag).toHaveBeenCalledWith("feedback", true)
    expect(setTag).toHaveBeenCalledWith("feedback.type", "bug")
    expect(setContext).toHaveBeenCalledWith("feedback", { route: "/videos/1/review" })
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
})
