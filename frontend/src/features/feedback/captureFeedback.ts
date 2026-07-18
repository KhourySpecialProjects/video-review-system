import * as Sentry from "@sentry/react"
import { telemetryConfig, parametrizeUrl } from "@/lib/telemetry/config"

export type FeedbackType = "bug" | "confusing" | "idea"

export interface FeedbackInput {
  type: FeedbackType
  message: string
  route: string
}

/**
 * Send proactive tester feedback to GlitchTip as an info-level message event.
 * The Sentry SDK auto-attaches the live breadcrumb trail + user scope; we add
 * feedback tags (for triage) and the route context. The route is parametrized
 * in scrubbed mode, matching the breadcrumb scrubbing.
 */
export function captureFeedback(input: FeedbackInput): void {
  Sentry.withScope((scope) => {
    scope.setTag("feedback", true)
    scope.setTag("feedback.type", input.type)
    const route =
      telemetryConfig.privacyMode === "scrubbed" ? parametrizeUrl(input.route) : input.route
    scope.setContext("feedback", { route })
    Sentry.captureMessage(input.message, "info")
  })
}
