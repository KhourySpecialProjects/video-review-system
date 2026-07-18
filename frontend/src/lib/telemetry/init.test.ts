import { describe, it, expect } from "vitest"
import { scrubBreadcrumb } from "./init"

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
