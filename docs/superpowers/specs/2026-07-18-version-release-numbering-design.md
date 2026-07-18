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

The SHA suffix guarantees a distinct, traceable release on every single merge, with zero
automation. The SemVer base is the human-readable counter on top (see bump policy).

## Bump policy & automation

**Auto-bump the patch on every merge into `next` only.** Promotions `next → develop → main`
are plain PR merges that carry `VERSION` forward untouched. This is forced by the forward-only
branch model: if each channel bumped its own `VERSION`, that file would conflict on every
promotion. Channel differentiation comes from the suffix, never from a different base number.

**Mechanism — one small GitHub Action** (the repo's first CI file), triggered only on push to
`next`:

1. Read `VERSION`, increment patch, write it back.
2. Commit as `chore(release): vX.Y.Z [skip-deploy]` and push to `next`.
3. Call Coolify's **deploy webhook** for the resulting commit.

**Guards (must-have):**
- Skip the whole job if the pushing author is the release bot (prevents an infinite
  bump→push→bump loop).
- Skip if the head commit message already contains `[skip-deploy]`.

**Deploy handling — Coolify webhook (chosen):** turn **off** Coolify auto-deploy on the `next`
resource. Only the Action's webhook call deploys `next`, so there is exactly **one** deploy per
merge and it runs on the correctly-numbered bump commit. Requires a Coolify deploy token stored
as a GitHub Actions secret. `develop` and `main` keep their existing Coolify auto-deploy — they
are not bumped and need no Action.

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

1. **VMP-182** — `/VERSION`, backend `version.ts` + `/api/version`, FE Dockerfile + compose
   build args, the bump Action + Coolify webhook wiring, Coolify toggles.
2. **VMP-184** — `release` in both telemetry resolvers + `Sentry.init`, tests.
3. **VMP-183** — `useAppVersion()`, `<AppVersion />`, profile-dropdown + public-footer
   placement, skew check, reload nudge.
4. **Follow-up ticket** — sourcemap upload to GlitchTip (Phase 2).

## Risks / open items

- **Coolify deploy token** must exist and be stored as a GitHub secret before the webhook path
  works; until then, fall back to leaving `next` auto-deploy on (double-build per merge).
- **"Include Source Commit in Build" toggle** must be enabled on the frontend Coolify resource,
  or `VITE_APP_VERSION`'s SHA will be empty at build. Backend is unaffected (runtime env).
- The release-bot commit author used by the guard must be a stable, recognizable identity.
