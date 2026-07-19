# CLAUDE.md

Guidance for agents working in this repo.

## Agent skills

### Issue tracker

Issues and PRDs live in **Linear** (`next-consulting` workspace, **VMP** team), accessed via the Linear MCP tools — not GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`); label string equals role name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Versioning

The deployed version is `{/VERSION}+{channel}.{shortSHA}`. The `+sha` suffix advances on every
merge automatically; the `/VERSION` base is **bumped by hand** and rides promotions untouched.

**Reminder — when merging/promoting to `next`, `develop`, or `main`:** consider whether this is
worth a base bump. If so, bump `/VERSION` (on `next`; it flows downstream) and, at real
milestones, cut a matching GitHub Release `vX.Y.Z` for the notes. Forgetting is safe — builds
still differ by `+sha`; the base just lags. Full design: `docs/superpowers/specs/2026-07-18-version-release-numbering-design.md`.
