import { useEffect, useRef, useState } from "react"
import { appVersion, fetchBackendVersion } from "@/lib/version"

const POLL_MS = 60_000

/**
 * Watches the backend's version relative to this build.
 * - `skew`: backend differs from the FE on first fetch (a half-deploy).
 * - `updateAvailable`: a later poll shows a different backend version than the
 *   one first observed (a new build shipped while this tab was open).
 */
export function useVersionMonitor(): { skew: boolean; updateAvailable: boolean } {
  const [skew, setSkew] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const firstSeen = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    async function check(isInitial: boolean) {
      const backend = await fetchBackendVersion()
      if (!active || !backend) return
      if (isInitial) {
        firstSeen.current = backend.version
        setSkew(backend.version !== appVersion.version)
      } else if (firstSeen.current && backend.version !== firstSeen.current) {
        setUpdateAvailable(true)
      }
    }
    void check(true)
    const id = setInterval(() => void check(false), POLL_MS)
    const onFocus = () => void check(false)
    window.addEventListener("focus", onFocus)
    return () => {
      active = false
      clearInterval(id)
      window.removeEventListener("focus", onFocus)
    }
  }, [])

  return { skew, updateAvailable }
}
