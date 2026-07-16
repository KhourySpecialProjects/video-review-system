import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

const captureFeedback = vi.fn()
vi.mock("./captureFeedback", () => ({ captureFeedback: (...a: unknown[]) => captureFeedback(...a) }))
vi.mock("./screenshot", () => ({ captureScreenshot: vi.fn(async () => null) }))
vi.mock("react-router", () => ({ useLocation: () => ({ pathname: "/videos/7/review" }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// Force telemetry "enabled + full" so the screenshot control renders.
vi.mock("@/lib/telemetry/config", () => ({
  telemetryConfig: { enabled: true, dsn: "x", environment: "test", privacyMode: "full" },
}))

import { FeedbackWidget } from "./FeedbackWidget"

beforeEach(() => captureFeedback.mockClear())

describe("FeedbackWidget", () => {
  it("is collapsed by default and opens the panel when the tab is clicked", () => {
    render(<FeedbackWidget />)
    expect(screen.queryByRole("dialog")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: /feedback/i }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("blocks submit until a message is entered", () => {
    render(<FeedbackWidget />)
    fireEvent.click(screen.getByRole("button", { name: /feedback/i }))
    fireEvent.click(screen.getByRole("button", { name: /send/i }))
    expect(captureFeedback).not.toHaveBeenCalled()
  })

  it("submits the message with the selected type and current route", async () => {
    render(<FeedbackWidget />)
    fireEvent.click(screen.getByRole("button", { name: /feedback/i }))
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Button is confusing" } })
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }))
    await waitFor(() => expect(captureFeedback).toHaveBeenCalledTimes(1))
    expect(captureFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Button is confusing", type: "bug", route: "/videos/7/review" }),
    )
  })
})
