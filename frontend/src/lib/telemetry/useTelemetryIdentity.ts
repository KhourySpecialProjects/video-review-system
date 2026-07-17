import { useEffect } from "react"
import * as Sentry from "@sentry/react"
import { useAuth } from "@/context/auth-context"
import { telemetryConfig } from "./config"

/**
 * Keep the Sentry user scope in sync with the logged-in user. In full mode we
 * send id + email + name + role; in scrubbed mode only id + role (pseudonymous).
 * Clears the user on logout. No-op when telemetry is disabled.
 */
export function useTelemetryIdentity(): void {
  const { user } = useAuth()
  useEffect(() => {
    if (!telemetryConfig.enabled) return
    if (!user) {
      Sentry.setUser(null)
      return
    }
    Sentry.setUser(
      telemetryConfig.privacyMode === "full"
        ? { id: user.id, email: user.email, username: user.name, role: user.role }
        : { id: user.id, role: user.role },
    )
  }, [user])
}
