// KEEP IN SYNC with backend/src/lib/version.ts — see
// docs/superpowers/specs/2026-07-18-version-release-numbering-design.md

const COMMIT_URL_BASE =
  "https://github.com/KhourySpecialProjects/video-review-system/commit/"

export interface VersionInfo {
  version: string
  base: string
  branch: string
  commit: string
  shortCommit: string
  builtAt: string | null
}

/** Compose the full version string. Pure. Format is duplicated in the backend. */
export function composeVersion(base: string, branch?: string, commit?: string): string {
  const channel = (branch ?? "").trim() || "local"
  const trimmedCommit = (commit ?? "").trim()
  const short = trimmedCommit ? trimmedCommit.slice(0, 7) : "local"
  return `${base}+${channel}.${short}`
}

/** Build a VersionInfo from baked build-time env. Pure. */
export function resolveVersionInfo(env: {
  VITE_APP_VERSION_BASE?: string
  VITE_APP_BRANCH?: string
  VITE_APP_COMMIT?: string
  VITE_APP_BUILT_AT?: string
}): VersionInfo {
  const base = (env.VITE_APP_VERSION_BASE ?? "").trim() || "0.0.0"
  const branch = (env.VITE_APP_BRANCH ?? "").trim() || "local"
  const commit = (env.VITE_APP_COMMIT ?? "").trim()
  const shortCommit = commit ? commit.slice(0, 7) : "local"
  const builtAt = (env.VITE_APP_BUILT_AT ?? "").trim() || null
  return { version: composeVersion(base, branch, commit), base, branch, commit, shortCommit, builtAt }
}

export function commitUrl(commit: string): string {
  return `${COMMIT_URL_BASE}${commit}`
}

/** The running app's baked version. */
export const appVersion: VersionInfo = resolveVersionInfo(import.meta.env)

/** Fetch the backend's version. Returns null on any failure (never throws). */
export async function fetchBackendVersion(): Promise<VersionInfo | null> {
  try {
    const res = await fetch("/api/version")
    if (!res.ok) return null
    return (await res.json()) as VersionInfo
  } catch {
    return null
  }
}
