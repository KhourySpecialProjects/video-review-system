import { describe, it, expect, vi, afterEach } from "vitest"
import { composeVersion, resolveVersionInfo, commitUrl, fetchBackendVersion } from "./version"

describe("composeVersion", () => {
  it("composes base + channel + short sha (canonical example)", () => {
    expect(composeVersion("0.1.0", "next", "a1b2c3d4e5f6")).toBe("0.1.0+next.a1b2c3d")
  })
  it("falls back to local when branch/commit are empty", () => {
    expect(composeVersion("0.1.0", "", "")).toBe("0.1.0+local.local")
  })
})

describe("resolveVersionInfo", () => {
  it("reads baked VITE_APP_* env into a VersionInfo", () => {
    const info = resolveVersionInfo({
      VITE_APP_VERSION_BASE: "0.1.0",
      VITE_APP_BRANCH: "develop",
      VITE_APP_COMMIT: "abcdef1234567890",
      VITE_APP_BUILT_AT: "2026-07-18T00:00:00Z",
    })
    expect(info).toEqual({
      version: "0.1.0+develop.abcdef1",
      base: "0.1.0",
      branch: "develop",
      commit: "abcdef1234567890",
      shortCommit: "abcdef1",
      builtAt: "2026-07-18T00:00:00Z",
    })
  })
  it("defaults everything for an empty env", () => {
    const info = resolveVersionInfo({})
    expect(info.version).toBe("0.0.0+local.local")
    expect(info.builtAt).toBeNull()
  })
})

describe("commitUrl", () => {
  it("builds a GitHub commit URL", () => {
    expect(commitUrl("abcdef1234567890")).toBe(
      "https://github.com/KhourySpecialProjects/video-review-system/commit/abcdef1234567890",
    )
  })
})

describe("fetchBackendVersion", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("returns the parsed VersionInfo on a 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: "0.1.0+next.abc1234" }) }),
    )
    expect(await fetchBackendVersion()).toEqual({ version: "0.1.0+next.abc1234" })
  })

  it("returns null on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    expect(await fetchBackendVersion()).toBeNull()
  })

  it("returns null (never throws) when the request rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")))
    expect(await fetchBackendVersion()).toBeNull()
  })
})
