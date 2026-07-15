import { cn } from "@/lib/utils"

type BannerConfig = { text: string; className: string }

/**
 * Banner per `VITE_APP_ENV` value. The `bg-*` classes are written as literals
 * here so Tailwind's source scanner emits them — it cannot see classes that
 * only exist as a runtime lookup result.
 */
const ENV_BANNERS: Record<string, BannerConfig> = {
  "dev-preview": {
    text: "Asclepion 0.1 - This is a Development Preview. Do NOT upload any PII or other sensitive information.",
    className: "bg-warning",
  },
  "next-preview": {
    text: "Asclepion 0.1 - NEXT (staging). Unstable build. Do NOT upload any PII or other sensitive information.",
    className: "bg-info",
  },
}

/**
 * @description Resolves which environment banner (if any) to show, from
 * build-time env. Local dev takes precedence over the Coolify preview flags;
 * production (neither set) and unknown flag values return null.
 * @param env - Subset of import.meta.env
 */
export function resolveEnvBanner(env: {
  DEV?: boolean
  VITE_APP_ENV?: string
}): BannerConfig | null {
  if (env.DEV) {
    return { text: "Local Development Preview", className: "bg-warning" }
  }
  const flag = env.VITE_APP_ENV
  if (flag && flag in ENV_BANNERS) return ENV_BANNERS[flag]
  return null
}

/**
 * @description Full-width strip above the header identifying non-production
 * environments. Renders nothing in production.
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
        "relative z-50 w-full px-4 py-1.5 text-center text-xs font-medium text-black",
        banner.className,
      )}
    >
      {banner.text}
    </div>
  )
}
