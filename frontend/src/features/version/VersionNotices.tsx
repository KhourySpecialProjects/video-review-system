import { useVersionMonitor } from "./useVersionMonitor"

/**
 * Renders subtle notices driven by useVersionMonitor: a reload nudge when a new
 * build has shipped, and a muted skew badge when FE/BE versions disagree.
 * Both are non-blocking and dismissible via reload.
 */
export function VersionNotices() {
  const { skew, updateAvailable } = useVersionMonitor()
  if (!skew && !updateAvailable) return null
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      {updateAvailable ? (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full border bg-background px-4 py-2 text-sm shadow-md hover:bg-muted"
        >
          A new version is available — refresh
        </button>
      ) : (
        <span
          role="status"
          className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground shadow-sm"
        >
          Frontend / backend version mismatch
        </span>
      )}
    </div>
  )
}
