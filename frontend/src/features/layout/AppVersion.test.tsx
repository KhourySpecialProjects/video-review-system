// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"

afterEach(() => vi.resetModules())

async function renderWithVersion(info: Record<string, unknown>) {
  vi.doMock("@/lib/version", () => ({
    appVersion: info,
    commitUrl: (c: string) => `https://github.com/KhourySpecialProjects/video-review-system/commit/${c}`,
  }))
  const { AppVersion } = await import("./AppVersion")
  render(<AppVersion />)
}

describe("AppVersion", () => {
  it("shows base and short commit, linking the sha to the commit", async () => {
    await renderWithVersion({
      version: "0.1.0+next.a1b2c3d",
      base: "0.1.0",
      branch: "next",
      commit: "a1b2c3d4e5f6",
      shortCommit: "a1b2c3d",
      builtAt: null,
    })
    expect(screen.getByText(/v0\.1\.0/)).toBeInTheDocument()
    const link = screen.getByRole("link", { name: /a1b2c3d/ })
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/KhourySpecialProjects/video-review-system/commit/a1b2c3d4e5f6",
    )
  })
  it("renders a plain label with no link in local builds", async () => {
    await renderWithVersion({
      version: "0.0.0+local.local",
      base: "0.0.0",
      branch: "local",
      commit: "",
      shortCommit: "local",
      builtAt: null,
    })
    expect(screen.getByText(/v0\.0\.0/)).toBeInTheDocument()
    expect(screen.queryByRole("link")).toBeNull()
  })
})
