// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"

afterEach(() => vi.resetModules())

async function renderWithVersion(info: Record<string, unknown>, props: { link?: boolean } = {}) {
  vi.doMock("@/lib/version", () => ({
    appVersion: info,
    commitUrl: (c: string) => `https://github.com/KhourySpecialProjects/video-review-system/commit/${c}`,
  }))
  const { AppVersion } = await import("./AppVersion")
  render(<AppVersion {...props} />)
}

const withCommit = {
  version: "0.1.0+next.a1b2c3d",
  base: "0.1.0",
  branch: "next",
  commit: "a1b2c3d4e5f6",
  shortCommit: "a1b2c3d",
  builtAt: null,
}

describe("AppVersion", () => {
  it("shows base and short commit, linking the sha to the commit with safe rel + a11y label", async () => {
    await renderWithVersion(withCommit)
    expect(screen.getByText(/v0\.1\.0/)).toBeInTheDocument()
    const link = screen.getByRole("link", { name: /commit a1b2c3d on GitHub/i })
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/KhourySpecialProjects/video-review-system/commit/a1b2c3d4e5f6",
    )
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
    expect(link).toHaveAttribute("target", "_blank")
  })
  it("renders the sha as plain text (no link) when link=false, e.g. inside a menu", async () => {
    await renderWithVersion(withCommit, { link: false })
    expect(screen.getByText(/v0\.1\.0/)).toBeInTheDocument()
    expect(screen.getByText("a1b2c3d")).toBeInTheDocument()
    expect(screen.queryByRole("link")).toBeNull()
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
