import { appVersion, commitUrl } from "@/lib/version"

/**
 * Muted, compact version label: `v{base} · {shortCommit}`. The short SHA links
 * to the GitHub commit when known; in local builds (no commit) it renders as a
 * plain span. The `title` carries the full version, channel, and build time.
 *
 * Pass `link={false}` where a focusable anchor is unwanted — e.g. inside a
 * `role="menu"` dropdown, where a non-menuitem link is not keyboard-reachable
 * and breaks the menu ARIA pattern. There the SHA renders as plain text.
 */
export function AppVersion({ className, link = true }: { className?: string; link?: boolean }) {
  const { version, base, branch, commit, shortCommit, builtAt } = appVersion
  const title = `${version} · ${branch}${builtAt ? ` · built ${builtAt}` : ""}`
  const showLink = link && commit.length > 0
  return (
    <span className={`text-xs text-muted-foreground ${className ?? ""}`} title={title}>
      v{base}
      {" · "}
      {showLink ? (
        <a
          href={commitUrl(commit)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`commit ${shortCommit} on GitHub, opens in new tab`}
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
