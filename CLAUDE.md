# CLAUDE.md

Guidance for agents working in this repo.

## Feature workflow (MUST follow)

For any feature, behavior change, or non-trivial UI work, follow the standard
flow **in order** — do not skip straight to code:

1. **Brainstorm / clarify** — surface the design decisions and open questions
   with the requester **before** implementing. Do not make load-bearing product
   or design calls unilaterally; if the ticket delegates a decision, state the
   options and the recommendation and get sign-off.
2. **Written design + implementation plan** — capture the design as a spec in
   `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md` (see existing specs for
   the format: Problem, Goal, Existing State, Decisions, Design, Testing,
   Non-Goals) before writing code.
3. **Branch first, off the right base** — create the issue branch
   (`<vmp-nnn>-<linear-slug>`, matching Linear's `gitBranchName`) **before**
   implementing. Base it on the branch that actually contains the code the change
   depends on: recent feature work lives on `next` (which is well ahead of
   `develop`), so most feature branches base on `next`, not `develop`. Verify
   with `git diff --stat <base>...next` when unsure.
4. **Implement → verify → request review** — only then write code, verify it,
   and request review.

Reminder added after VMP-188, where these steps were skipped (code first, branch
and spec backfilled). Do not repeat that.

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
