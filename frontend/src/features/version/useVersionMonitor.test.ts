import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"

// @testing-library/dom's `waitFor` only polls via fake-timer advancement when
// it detects Jest-style fake timers (a global `jest` with a mocked
// `setTimeout`/`advanceTimersByTime`). Vitest's fake timers satisfy the
// `setTimeout.clock` shape it checks for but don't expose a `jest` global, so
// without this shim `waitFor` falls back to a real `setInterval` that never
// fires and the test hangs until it times out. Scoped to this file only.
if (typeof (globalThis as { jest?: unknown }).jest === "undefined") {
  ;(globalThis as { jest?: unknown }).jest = vi
}

const fetchBackendVersion = vi.fn()
vi.mock("@/lib/version", () => ({
  appVersion: { version: "0.1.0+next.aaaaaaa" },
  fetchBackendVersion: () => fetchBackendVersion(),
}))

beforeEach(() => { vi.useFakeTimers(); fetchBackendVersion.mockReset() })
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
