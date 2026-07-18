# Version / release numbering

**Date:** 2026-07-18
**Tickets:** VMP-182 (deploy versioning), VMP-183 (FE display), VMP-184 (GlitchTip linkage)
**Status:** Approved design, pending implementation plan

## Goal

Give every build on `next`, `develop`, and `main` a clearly traceable, human-legible
version that moves forward on every merge, surface it in GlitchTip and the frontend, and
do it without a heavyweight CI pipeline.

## Constraints (verified against Coolify source, 2026-07-18)

Deployment is Coolify building Docker images directly from a branch on push — there is **no**
GitHub Actions today, and Coolify only builds/deploys, it does not commit.

- **`SOURCE_COMMIT`** (full SHA) and **`COOLIFY_BRANCH`** (branch name) are the git anchors
  Coolify exposes.
- `SOURCE_COMMIT` is injected at **runtime** for every container automatically. As a **build
  arg** it is only available if the app's **"Include Source Commit in Build"** toggle is on,
  and it must be referenced explicitly in each compose service's `build.args` via
  `${SOURCE_COMMIT}`.
- **Coolify deletes `.git` before building** and does a shallow clone. `git describe` /
  `git rev-list --count` inside the Docker build are **impossible** — the SHA is the only git
  anchor available at build time. (This rules out any build-time commit-count scheme.)
- `SOURCE_COMMIT` is unreliable in PR/preview builds (can resolve to literal `HEAD`); this
  design does not depend on PR builds.

Sources: Coolify `ApplicationDeploymentJob.php` (v4.x), Coolify env-vars docs, docker-compose
build/interpolation reference, Coolify issue #2126.

## Version scheme

**SemVer base + git build metadata**, single source of truth in a committed file.

- **`/VERSION`** at repo root — one line, e.g. `1.3.0`. Committed. Both apps read it. The
  commit *carries* the base version, so it is identical across channels for the same commit;
  only the suffix differs. (No root `package.json` exists; a plain file avoids creating one
  and keeps the two app `package.json`s uninvolved.)
- **Full release string** = `{VERSION}+{channel}.{shortSHA}`
  - `channel` = `COOLIFY_BRANCH` (`next` / `develop` / `main`), falling back to `local` in dev.
  - `shortSHA` = first 7 chars of `SOURCE_COMMIT`.
  - Example: `1.3.0+next.a1b2c3d`.

**What moves forward on every merge is the full release string**, via the `+sha` suffix (and
the build timestamp) — with zero automation, no CI, and no secrets. The SemVer base is a
human-curated milestone marker on top, not a per-merge counter.

## Bump policy (manual + GitHub Releases, no automation)

We deliberately reject an auto-incrementing patch. It was verified (Coolify v4.x source) that
Coolify cannot natively read a git tag or GitHub Release, exposes no tag variable, and its
webhook ignores `release` events — so any auto-bump or Releases-fed build would require custom
glue (a GitHub Action + a stored Coolify deploy token, or a build-time GitHub API `curl` with
drift + rate-limit + network-dependency downsides). None of that is worth a cosmetic sequential
integer when `+sha` already gives per-merge forward motion and full traceability.

**The model:**

- **`/VERSION` is the single source of truth the build reads.** It travels with the commit, so
  it is always correct for what's being built, needs no network or token, and survives Coolify
  stripping `.git`. Bumped **manually** on `next` when a change is worth a new number; it then
  rides promotions `next → develop → main` untouched (channel differentiation comes from the
  suffix, never from a different base — this also avoids a `VERSION` merge conflict at every
  promotion).
- **GitHub Releases are the human milestone layer, decoupled from the build.** At a milestone,
  bump `VERSION` to `1.4.0` **and** cut a GitHub Release tagged `v1.4.0` (free auto-generated
  notes, visible in the repo's Releases panel). They agree because both happen at the same
  moment. The build never polls the Releases API — the Release is a changelog/announcement, not
  a build input.

**No GitHub Action, no Coolify deploy token, no webhook, no auto-deploy changes.** `next`,
`develop`, and `main` keep their existing Coolify auto-deploy exactly as-is.

## Backend wiring (runtime — no build arg needed)

`SOURCE_COMMIT` and `COOLIFY_BRANCH` are auto-injected at runtime; `VERSION` is `COPY`d into
the image at build.

- New `backend/src/lib/version.ts` — pure assembler returning
  `{ version, base, commit, branch, builtAt }` from `VERSION` + env. `builtAt` is baked at
  build (e.g. an `ARG BUILD_TIME` or written to a file during build).
- **`GET /api/version`** → `{ version, commit, branch, builtAt }`. Unauthenticated, cheap ops
  check (`curl`), and the source the frontend reads for the skew check (§ Extras).

## Frontend wiring (build-time) & display — VMP-183

Vite bakes env at build, so the FE needs build args.

- `frontend/Dockerfile`: add `ARG SOURCE_COMMIT`, `ARG COOLIFY_BRANCH`, `COPY VERSION`, and
  compose `VITE_APP_VERSION={base}+{branch}.{shortsha}` before `vite build`.
- `docker-compose.coolify.yml`: add to the `frontend` service `build.args`:
  `SOURCE_COMMIT: ${SOURCE_COMMIT}` and `COOLIFY_BRANCH: ${COOLIFY_BRANCH}`. Requires the
  Coolify "Include Source Commit in Build" toggle on the frontend resource.
- Add `VITE_APP_VERSION` to `frontend/src/vite-env.d.ts`.
- `useAppVersion()` hook reads `import.meta.env.VITE_APP_VERSION` (fallback `local`), parsed into
  `{ version, base, commit, branch }`.
- `<AppVersion />` component — compact `v1.3.0 · a1b2c3d`, SHA links to the GitHub commit;
  hover/expand shows channel + build time.
- **Two placements:**
  - **Profile dropdown** (logged-in) — muted footer line.
  - **Public pages** — same string, muted, in the login/public footer.
- `console.info` the full version on app boot for quick inspection.

## GlitchTip linkage — VMP-184

Set `release` in **both** `Sentry.init` calls; keep `environment` orthogonal.

- `release: "vmp@{version}"` (e.g. `vmp@1.3.0+next.a1b2c3d`).
- `environment` stays the channel (`next` / `develop` / `main` / `local`) — unchanged.
- Add a `release` field to both `TelemetryConfig` resolvers:
  - FE `frontend/src/lib/telemetry/config.ts` — from `VITE_APP_VERSION`.
  - BE `backend/src/lib/telemetry.ts` — from the `version.ts` assembler.
  Both are pure functions with existing tests — extend those tests for the new field.

**Payoff:** GlitchTip groups errors by release (regression detection the moment a bad build
ships) and every event is traceable to an exact commit + channel.

## Extras (in scope)

- **FE↔BE skew check.** FE fetches `/api/version` on load; if the backend's version differs
  from the FE's baked version, log it and show a subtle badge. Catches half-deployed states
  (FE new / BE old). Reuses `<AppVersion />` styling.
- **Reload nudge.** Poll `/api/version` (low frequency / on window focus); when the deployed
  version changes from the one the tab loaded with, show a dismissible "Refresh for updates"
  toast.
- **Sourcemap upload to GlitchTip, keyed by release — Phase 2.** Makes minified FE stack traces
  readable. Adds a build/upload step; deferred to its own follow-up but recorded here so it
  isn't lost.

## Testing

- Version-string assembler (FE + BE): pure functions, unit-tested for base + suffix composition
  and the `local` fallbacks.
- Telemetry resolvers: extend existing tests to assert the `release` field.
- `/api/version`: route test for shape and values.
- `<AppVersion />`: render test for both placements + the commit link.
- GitHub Action: dry-run / manual verification of bump math, the bot-author guard, and the
  `[skip-deploy]` guard.

## Phasing → tickets

1. **VMP-182** — `/VERSION` (seeded with the current base), backend `version.ts` +
   `/api/version`, FE Dockerfile + compose build args, the "Include Source Commit in Build"
   Coolify toggle, and a short CONTRIBUTING/README note on the manual bump + GitHub Release
   milestone step.
2. **VMP-184** — `release` in both telemetry resolvers + `Sentry.init`, tests.
3. **VMP-183** — `useAppVersion()`, `<AppVersion />`, profile-dropdown + public-footer
   placement, skew check, reload nudge.
4. **Follow-up ticket** — sourcemap upload to GlitchTip (Phase 2).

## Risks / open items

- **"Include Source Commit in Build" toggle** must be enabled on the frontend Coolify resource,
  or `VITE_APP_VERSION`'s SHA will be empty at build. Backend is unaffected (`SOURCE_COMMIT` is
  a runtime env there). This is the only Coolify operator step.
- **Manual discipline:** the base number only advances if someone bumps `/VERSION` (and,
  ideally, cuts the matching GitHub Release). If forgotten, builds still differ correctly by
  `+sha` — the base just lags reality, which is cosmetic.
- **Build-time network for the FE build** is not needed under this model (no API `curl`); the
  FE build reads `VERSION` from the copied working tree and `SOURCE_COMMIT`/`COOLIFY_BRANCH`
  from build args.
