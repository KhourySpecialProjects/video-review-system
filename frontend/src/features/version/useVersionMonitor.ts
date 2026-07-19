import { useEffect, useRef, useState } from "react"
import { appVersion, fetchBackendVersion } from "@/lib/version"

const POLL_MS = 60_000

/**
 * Watches the backend's version relative to this build.
 * - `skew`: backend differs from the FE on first fetch (a half-deploy). Only
 *   asserted when this build knows its own commit — if the frontend shipped
 *   without a baked SHA (e.g. the Coolify "Include Source Commit in Build"
 *   toggle is off), we can't meaningfully compare, so we stay quiet rather than
 *   show a permanent false mismatch.
 * - `updateAvailable`: a later poll shows a different backend version than the
 *   one first observed (a new build shipped while this tab was open).
 */
export function useVersionMonitor(): { skew: boolean; updateAvailable: boolean } {
  const [skew, setSkew] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const firstSeen = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    // Initialize on the first SUCCESSFUL fetch, not the first call — if the
    // initial fetch fails (backend restarting during a deploy), `firstSeen`
    // stays null and a later poll must still be able to establish the baseline.
    async function check() {
      const backend = await fetchBackendVersion()
      if (!active || !backend) return
      if (!firstSeen.current) {
        firstSeen.current = backend.version
        const feKnowsCommit = appVersion.shortCommit !== "local"
        setSkew(feKnowsCommit && backend.version !== appVersion.version)
      } else if (backend.version !== firstSeen.current) {
        setUpdateAvailable(true)
      }
    }
    void check()
    const id = setInterval(() => void check(), POLL_MS)
    const onFocus = () => void check()
    window.addEventListener("focus", onFocus)
    return () => {
      active = false
      clearInterval(id)
      window.removeEventListener("focus", onFocus)
    }
  }, [])

  return { skew, updateAvailable }
}
