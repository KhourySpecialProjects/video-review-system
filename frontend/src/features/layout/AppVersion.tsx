import { appVersion, commitUrl } from "@/lib/version"

/**
 * Muted, compact version label: `v{base} · {shortCommit}`. The short SHA links
 * to the GitHub commit when known; in local builds (no commit) it renders as a
 * plain span. The `title` carries the full version, channel, and build time.
 */
export function AppVersion({ className }: { className?: string }) {
  const { version, base, branch, commit, shortCommit, builtAt } = appVersion
  const title = `${version} · ${branch}${builtAt ? ` · built ${builtAt}` : ""}`
  const hasCommit = commit.length > 0
  return (
    <span className={`text-xs text-muted-foreground ${className ?? ""}`} title={title}>
      v{base}
      {" · "}
      {hasCommit ? (
        <a
          href={commitUrl(commit)}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          {shortCommit}
        </a>
      ) : (
        <span>{shortCommit}</span>
      )}
    </span>
  )
}
