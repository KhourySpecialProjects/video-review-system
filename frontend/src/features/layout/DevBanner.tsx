type BannerConfig = { text: string }

/**
 * @description Resolves which environment banner (if any) to show, from
 * build-time env. Local dev takes precedence over the Coolify dev-preview
 * flag; production (neither set) returns null.
 * @param env - Subset of import.meta.env
 */
export function resolveEnvBanner(env: {
  DEV?: boolean
  VITE_APP_ENV?: string
}): BannerConfig | null {
  if (env.DEV) return { text: "Local Development Preview" }
  if (env.VITE_APP_ENV === "dev-preview") {
    return {
      text: "Asclepion 1.0 - This is a Development Preview. Do NOT upload any PII or other sensitive information.",
    }
  }
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
      className="w-full bg-warning px-4 py-1.5 text-center text-xs font-medium text-black"
    >
      {banner.text}
    </div>
  )
}
