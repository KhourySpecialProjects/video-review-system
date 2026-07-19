import { cn } from "@/lib/utils"
import { appVersion } from "@/lib/version"

type BannerConfig = { text: string; className: string }

/**
 * Banner per `VITE_APP_ENV` value. The `bg-*` classes are written as literals
 * here so Tailwind's source scanner emits them — it cannot see classes that
 * only exist as a runtime lookup result. Each environment gets a clearly
 * distinct theme color: amber (`bg-warning`) for dev, blue (`bg-info`) for next.
 */
const ENV_BANNERS: Record<string, BannerConfig> = {
  "dev-preview": {
    text: "This is a Development Preview. Do NOT upload any PII or other sensitive information.",
    className: "bg-warning text-black",
  },
  "next-preview": {
    text: "NEXT (staging). Unstable build. Do NOT upload any PII or other sensitive information.",
    className: "bg-info text-black",
  },
}

/**
 * @description Resolves which environment banner (if any) to show, from
 * build-time env. Local dev takes precedence over the Coolify preview flags;
 * production (neither set) and unknown flag values return null. Local uses a
 * deep red (`bg-red-800`) with white text — unmistakable against the muted
 * amber/blue of the deployed previews, and a stronger "you're on local" cue.
 * @param env - Subset of import.meta.env
 */
export function resolveEnvBanner(env: {
  DEV?: boolean
  VITE_APP_ENV?: string
}): BannerConfig | null {
  if (env.DEV) {
    return { text: "Local Development", className: "bg-red-800 text-white" }
  }
  const flag = env.VITE_APP_ENV
  if (flag && flag in ENV_BANNERS) return ENV_BANNERS[flag]
  return null
}

/** Compact version stamp for the banner: `v{base}`, plus the short SHA when known. */
function versionLabel(): string {
  const { base, shortCommit } = appVersion
  return shortCommit === "local" ? `v${base}` : `v${base} · ${shortCommit}`
}

/**
 * @description Full-width strip above the header identifying non-production
 * environments and the running build's version. Renders nothing in production.
 */
export function DevBanner() {
  const banner = resolveEnvBanner(import.meta.env)
  if (!banner) return null
  return (
    <div
      role="status"
      // `relative z-50` keeps the strip above viewport-anchored `fixed` page
      // chrome (e.g. the review page's shadcn sidebar, z-10) so it always spans
      // the full width — matching the navbar's own z-50.
      className={cn(
        // Text color is per-banner (banner.className) so local can go white on
        // deep red while the lighter amber/blue previews keep black text.
        "relative z-50 w-full px-4 py-1.5 text-center text-xs font-medium",
        banner.className,
      )}
    >
      {banner.text} <span className="opacity-80">·</span> {versionLabel()}
    </div>
  )
}
