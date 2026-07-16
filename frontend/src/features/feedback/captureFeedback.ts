import * as Sentry from "@sentry/react"

export type FeedbackType = "bug" | "confusing" | "idea"

export interface FeedbackInput {
  type: FeedbackType
  message: string
  route: string
  screenshot?: Uint8Array | null
}

/**
 * Send proactive tester feedback to GlitchTip as an info-level message event.
 * The Sentry SDK auto-attaches the live breadcrumb trail + user scope; we add
 * feedback tags (for triage), the route context, and an optional screenshot.
 */
export function captureFeedback(input: FeedbackInput): void {
  Sentry.withScope((scope) => {
    scope.setTag("feedback", true)
    scope.setTag("feedback.type", input.type)
    scope.setContext("feedback", { route: input.route })
    if (input.screenshot) {
      scope.addAttachment({
        filename: "screenshot.png",
        data: input.screenshot,
        contentType: "image/png",
      })
    }
    Sentry.captureMessage(input.message, "info")
  })
}
