import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"

// @testing-library/dom's `waitFor` only polls via fake-timer advancement when
// it detects Jest-style fake timers (a global `jest` with a mocked
// `setTimeout`/`advanceTimersByTime`). Vitest's fake timers satisfy the
// `setTimeout.clock` shape it checks for but don't expose a `jest` global, so
// without this shim `waitFor` falls back to a real `setInterval` that never
// fires and the test hangs until it times out. The `afterAll` teardown makes
// the "scoped to this file" claim real rather than relying on Vitest's default
// file isolation (so it stays safe even if `isolate: false` is set later).
const installedJestShim = typeof (globalThis as { jest?: unknown }).jest === "undefined"
if (installedJestShim) {
  ;(globalThis as { jest?: unknown }).jest = vi
}
afterAll(() => {
  if (installedJestShim) delete (globalThis as { jest?: unknown }).jest
})

const { mockAppVersion, fetchBackendVersion } = vi.hoisted(() => ({
  mockAppVersion: { version: "0.1.0+next.aaaaaaa", shortCommit: "aaaaaaa" },
  fetchBackendVersion: vi.fn(),
}))
vi.mock("@/lib/version", () => ({
  appVersion: mockAppVersion,
  fetchBackendVersion: () => fetchBackendVersion(),
}))

beforeEach(() => {
  vi.useFakeTimers()
  fetchBackendVersion.mockReset()
  // Restore the default "commit is known" build between tests.
  mockAppVersion.version = "0.1.0+next.aaaaaaa"
  mockAppVersion.shortCommit = "aaaaaaa"
})
afterEach(() => vi.useRealTimers())

async function load() {
  const { useVersionMonitor } = await import("./useVersionMonitor")
  return useVersionMonitor
}

describe("useVersionMonitor", () => {
  it("flags skew when backend version differs from the frontend on mount", async () => {
    fetchBackendVersion.mockResolvedValue({ version: "0.1.0+next.bbbbbbb" })
    const useVersionMonitor = await load()
    const { result } = renderHook(() => useVersionMonitor())
    await waitFor(() => expect(result.current.skew).toBe(true))
  })

  it("does not flag skew when versions match", async () => {
    fetchBackendVersion.mockResolvedValue({ version: "0.1.0+next.aaaaaaa" })
    const useVersionMonitor = await load()
    const { result } = renderHook(() => useVersionMonitor())
    await waitFor(() => expect(result.current.skew).toBe(false))
  })

  it("stays quiet about skew when this build has no baked commit (SHA toggle off)", async () => {
    mockAppVersion.version = "0.1.0+next.local"
    mockAppVersion.shortCommit = "local"
    fetchBackendVersion.mockResolvedValue({ version: "0.1.0+next.bbbbbbb" })
    const useVersionMonitor = await load()
    const { result } = renderHook(() => useVersionMonitor())
    // Give the initial fetch a tick to resolve, then assert it did NOT flag.
    await vi.advanceTimersByTimeAsync(0)
    expect(result.current.skew).toBe(false)
  })

  it("never sets skew/updateAvailable when the backend version is unreachable", async () => {
    fetchBackendVersion.mockResolvedValue(null)
    const useVersionMonitor = await load()
    const { result } = renderHook(() => useVersionMonitor())
    await vi.advanceTimersByTimeAsync(60_000)
    expect(result.current.skew).toBe(false)
    expect(result.current.updateAvailable).toBe(false)
  })

  it("initializes on the first successful fetch even if the initial fetch failed", async () => {
    // Backend unreachable on mount, then recovers with a version that differs
    // from this build. The monitor must still establish its baseline + skew on
    // that first successful poll rather than staying dead for the tab's life.
    fetchBackendVersion
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ version: "0.1.0+next.bbbbbbb" })
    const useVersionMonitor = await load()
    const { result } = renderHook(() => useVersionMonitor())
    await vi.advanceTimersByTimeAsync(0)
    expect(result.current.skew).toBe(false) // initial fetch failed: no baseline yet
    await vi.advanceTimersByTimeAsync(60_000) // poll recovers -> initialize + evaluate
    await waitFor(() => expect(result.current.skew).toBe(true))
  })

  it("flags updateAvailable when a later poll returns a new backend version", async () => {
    fetchBackendVersion
      .mockResolvedValueOnce({ version: "0.1.0+next.aaaaaaa" })
      .mockResolvedValueOnce({ version: "0.2.0+next.ccccccc" })
    const useVersionMonitor = await load()
    const { result } = renderHook(() => useVersionMonitor())
    await waitFor(() => expect(result.current.skew).toBe(false))
    await vi.advanceTimersByTimeAsync(60_000)
    await waitFor(() => expect(result.current.updateAvailable).toBe(true))
  })
})
