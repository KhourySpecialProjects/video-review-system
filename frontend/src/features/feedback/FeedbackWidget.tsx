import { useState } from "react"
import { useLocation } from "react-router"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { telemetryConfig } from "@/lib/telemetry/config"
import { captureFeedback, type FeedbackType } from "./captureFeedback"
import { captureScreenshot } from "./screenshot"

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: "bug", label: "🐛 Bug" },
  { value: "confusing", label: "🤔 Confusing" },
  { value: "idea", label: "💡 Idea" },
]

/**
 * Right-edge feedback tab + slide-in panel, mounted once at the app root so it
 * appears on every page. Sends a context-rich message event to GlitchTip. The
 * screenshot control is shown only in "full" privacy mode. Renders nothing when
 * telemetry is disabled (no DSN).
 */
export function FeedbackWidget() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>("bug")
  const [message, setMessage] = useState("")
  const [attachShot, setAttachShot] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!telemetryConfig.enabled) return null
  const allowScreenshot = telemetryConfig.privacyMode === "full"

  async function handleSend() {
    if (!message.trim() || submitting) return
    setSubmitting(true)
    try {
      const screenshot = attachShot && allowScreenshot ? await captureScreenshot() : null
      captureFeedback({ type, message: message.trim(), route: location.pathname, screenshot })
      toast.success("Thanks — your feedback was sent.")
      setMessage("")
      setAttachShot(false)
      setOpen(false)
    } catch {
      toast.error("Could not send feedback. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Send feedback"
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/2 z-50 -translate-y-1/2 rounded-l-md bg-info px-1.5 py-3 text-xs font-medium tracking-wide text-black [writing-mode:vertical-rl] rotate-180"
        >
          FEEDBACK
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Send feedback"
          className="fixed right-4 top-1/2 z-50 w-80 -translate-y-1/2 rounded-lg border border-white/15 bg-bg-dark shadow-2xl"
        >
          <div className="flex items-center justify-between rounded-t-lg bg-info px-3 py-2 text-sm font-semibold text-black">
            <span>Send feedback</span>
            <button type="button" aria-label="Close feedback" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-3 p-3">
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs",
                    type === t.value ? "border-info bg-info/25" : "border-white/20",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <textarea
              aria-label="Feedback message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what happened…"
              className="h-24 w-full rounded-md border border-white/15 bg-white/5 p-2 text-sm"
            />

            {allowScreenshot && (
              <label className="flex items-center gap-2 text-xs opacity-80">
                <input
                  type="checkbox"
                  checked={attachShot}
                  onChange={(e) => setAttachShot(e.target.checked)}
                />
                Attach screenshot
              </label>
            )}

            <div className="rounded-md border border-dashed border-white/20 bg-white/5 px-2 py-1.5 text-[11px] leading-relaxed opacity-70">
              Auto-attached: page {location.pathname}, your role, recent actions.
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={submitting}
              className="rounded-md bg-info py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}
