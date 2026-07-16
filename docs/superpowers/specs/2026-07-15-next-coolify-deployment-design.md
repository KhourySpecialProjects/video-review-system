# `next` Coolify deployment — design

**Date:** 2026-07-15
**Ticket:** [VMP-173](https://linear.app/next-consulting/issue/VMP-173)
**Status:** Approved design, pending implementation plan
**Author:** Mark Fontenot (with Claude)

## Purpose

Stand up a second long-lived Coolify deployment, **`next`**, so iteration can
happen on a running environment **without redeploying `dev.asclepion.cs4535.cloud`**
while clients are user-testing against it.

Today `dev` auto-deploys on every merge to `develop`, so anything merged is
immediately in front of the clients and there is nowhere to look at it first.
`next` is that place. It is also where the follow-on observability work
(GlitchTip) gets installed and debugged before it touches `dev`.

## Guiding principle

**`dev` and its `develop` auto-deploy are not modified.** `next` is a second
Coolify resource reusing the existing `docker-compose.coolify.yml` machinery from
[VMP-161](https://linear.app/next-consulting/issue/VMP-161) with its own env,
its own volumes, and its own domains. Nothing is shared between the two
environments at runtime.

## Branch topology: `next` as a deploy pointer

A long-lived branch named **`next`** is created off `develop`. The Coolify
resource watches it and redeploys on push, via the same GitHub App webhook that
already auto-deploys `develop`.

`next` is **not a branch you work on**. It is a mutable pointer you force-push at:

```bash
git push -f origin HEAD:next                       # deploy what I'm working on
git push -f origin vmp-174-some-feature:next       # deploy a specific branch
git push -f origin develop:next                    # reset to develop
```

Coolify is configured **once** and never touched again — the branch field stays
`next` forever, and the deploy target is selected entirely from git. This is the
same pattern as `git push heroku my-branch:main`.

### Rules for the `next` branch

1. **Never merge `next` into anything.** Its history is a series of force-pushes
   from unrelated branches. It is a deploy target, not a source of truth.
2. Never open a PR against it; never branch off it.
3. `git push -f origin develop:next` is the reset button — safe at any time,
   because there is no state on the branch to lose.

This gives **one preview at a time**, which is sufficient for solo iteration and
is what VMP-173 calls for. Per-PR previews remain out of scope.

> **Naming note:** the feature branch for this work is
> `vmp-173-next-coolify-deployment`. It is *about* the long-lived `next` pointer
> branch but is unrelated to it. Only the pointer is permanent.

## Architecture

No new architecture. A second Coolify **Docker Compose** resource, same repo,
same `docker-compose.coolify.yml`, branch `next`:

```text
Browser ──TLS──▶ Traefik ─┬─▶ frontend (nginx)  →  next.asclepion.cs4535.cloud
                          ├─▶ minio (S3 API)    →  s3.next.asclepion.cs4535.cloud
                          └─▶ backend  :8080    [internal]
                                └─▶ postgres     [internal, own volume]
```

Own Postgres volume, own MinIO volume, own bucket, own seeded data. `next` can be
wrecked and rebuilt freely with zero risk to `dev`.

### Domains

- `next.asclepion.cs4535.cloud` — app (frontend/nginx, proxies `/api/` → backend)
- `s3.next.asclepion.cs4535.cloud` — MinIO S3 API

Two DNS records, under the author's control; Coolify auto-provisions TLS. The
MinIO subdomain is **not optional**: the browser hits the object store directly
at the exact host the presigned URL was signed for, so `S3_ENDPOINT` and
`MINIO_SERVER_URL` must both be the real public `next` host or upload and
playback break.

## One shared compose file

`next` reuses `docker-compose.coolify.yml` rather than getting its own copy.

The file is **versioned per branch**: `dev` runs `develop`'s copy, `next` runs
whatever copy sits on the `next` pointer. Temporary divergence is therefore
already free — add a service on a feature branch, force-push to `next`, and it
exists only there until merged. Git is the divergence mechanism; a second file
is not needed to get one.

Identical topology is also the point. `next` is only useful as a preview of what
`dev` is about to become; permanently divergent topology would make it a
different system that merely runs similar code. One file makes that drift
structurally impossible.

**Escape hatch, if ever needed:** a service permanently wanted in one environment
but not the other is handled with compose `profiles:` or a small
`docker-compose.next.yml` override. Neither is built now.

**GlitchTip does not land in this file.** It is one shared instance across all
environments, deployed as its own Coolify resource at its own domain. The app
compose gains only a DSN env var. That is the follow-on spec, not this one.

## Single-secret DB config (folded-in prerequisite)

VMP-173 requires this before running a second environment off the same compose.

Today `POSTGRES_USER`, `POSTGRES_DB`, and three DSNs (`DATABASE_URL`,
`LOCAL_DATABASE_URL`, `DIRECT_DATABASE_URL`) must all be set by hand and kept
consistent, with the password embedded in each DSN. This footgun already bit the
first `dev` deploy: a generated `POSTGRES_DB` created a hex-named database and
the backend failed repeatedly with `database "angelman" does not exist`.

Standing up `next` means setting that block a second time — exactly when a
five-variable hand-copied DB config bites again. Fewer knobs per environment is
what makes one shared compose file safe.

**Change:** bake the user and database names in as literals and construct the
DSNs inline from the single remaining secret, `POSTGRES_PASSWORD`. A YAML anchor
keeps the three DSNs from drifting:

```yaml
x-database-url: &database-url postgres://angelman:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}@postgres:5432/angelman

services:
  backend:
    environment:
      DATABASE_URL: *database-url
      LOCAL_DATABASE_URL: *database-url
      DIRECT_DATABASE_URL: *database-url

  postgres:
    environment:
      POSTGRES_USER: angelman
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
      POSTGRES_DB: angelman
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "angelman"]
```

`POSTGRES_USER`, `POSTGRES_DB`, and the three DSN lines are removed from
`.env.coolify.example`. `POSTGRES_PASSWORD` keeps its `openssl rand -hex 32`
(URL-safe) requirement, since it is still interpolated into a DSN.

**This is the one change that touches `dev`** — see Risks.

## Environment banner

`docker-compose.coolify.yml` hardcodes `VITE_APP_ENV: dev-preview` as a build
arg, and `DevBanner.tsx` matches it with a literal `=== "dev-preview"`. Without a
change, `dev` and `next` are pixel-identical — and both will be open in browser
tabs at the same time.

**Compose:**

```yaml
    build:
      args:
        VITE_APP_ENV: ${VITE_APP_ENV:-dev-preview}
```

The default preserves today's `dev` behavior exactly. In Coolify the variable
must be marked a **build variable**, not a runtime one — Vite bakes it in at
build time.

**`DevBanner.tsx`:** replace the single `if` with a lookup keyed by
`VITE_APP_ENV`, where each entry carries its own text and background class.
`DEV` (local) keeps precedence; an unknown or empty value still returns `null`.

| `VITE_APP_ENV` | Background | Text |
|---|---|---|
| `dev-preview` | `bg-warning` (unchanged) | `Asclepion 0.1 - This is a Development Preview. Do NOT upload any PII or other sensitive information.` |
| `next-preview` | `bg-info` | `Asclepion 0.1 - NEXT (staging). Unstable build. Do NOT upload any PII or other sensitive information.` |

`--color-info` already exists in `frontend/src/index.css` and is visually
distinct from `--color-warning` in both light and dark themes. The banner keeps
`text-black`, matching the existing component.

The three render-based `DevBanner` cases in `DevBanner.test.tsx` stay green. The
two `resolveEnvBanner` `toEqual` assertions must be **updated** — adding a
`className` to the returned config changes the object shape they compare
against. New cases cover the `next-preview` text, its background class, `DEV`
precedence over `next-preview`, and an unknown flag value returning `null`.

## Configuration — the `next` env set

Every value differs from `dev`. Secrets are **newly generated**, not copied, so a
leak in one environment does not reach the other.

| Variable | Value |
|---|---|
| `LOCAL` | `true` |
| `NODE_ENV` | `development` |
| `PORT` | `8080` |
| `VITE_APP_ENV` | `next-preview` *(build variable)* |
| `POSTGRES_PASSWORD` | freshly generated (`openssl rand -hex 32`) |
| `ALLOWED_ORIGIN` / `FRONTEND_URL` / `BETTER_AUTH_URL` | `https://next.asclepion.cs4535.cloud` |
| `BETTER_AUTH_SECRET` / `ADMIN_SECRET` / `INTERNAL_SECRET_HEADER` / `SEED_PASSWORD` | freshly generated |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | freshly generated |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | = the MinIO creds |
| `AWS_REGION` | `us-east-1` |
| `S3_ENDPOINT` | `https://s3.next.asclepion.cs4535.cloud` |
| `S3_BUCKET_NAME` | `angelman-videos-next` |
| `SES_FROM_EMAIL` | **unset** → log-only email |

A new `.env.coolify.next.example` documents the `next` deltas and points at
`.env.coolify.example` for the shared explanation, rather than duplicating it.

## Risks

1. **The DB hardening redeploys `dev`.** Merging to `develop` redeploys the
   client-facing environment with the new compose. If `dev`'s Postgres volume was
   created with a user or database name that is not literally `angelman`, the
   backend comes up pointing at a nonexistent database and clients see a dead
   app.
   **Gate — CLEARED 2026-07-15:** the author confirmed in the Coolify UI that the
   `dev` resource's `POSTGRES_USER` and `POSTGRES_DB` are both currently
   `angelman`, so the literals match the existing volume and the change is a
   no-op for `dev`. (`next` proves the change on a fresh volume, but a fresh
   volume cannot detect this mismatch — only inspecting `dev` could, which is why
   this was checked before implementation rather than at merge time.)
2. **Secure cookies behind Traefik → nginx → backend.** Same risk VMP-161 flagged;
   re-verify login end-to-end on the new host.
3. **MinIO presign host.** `S3_ENDPOINT` and `MINIO_SERVER_URL` must both be the
   public `next` host or SigV4 host validation fails. Verified by an actual
   upload + playback, not by inspection.
4. **`VITE_APP_ENV` set as a runtime variable in Coolify** would silently do
   nothing — the banner would read `dev-preview` on `next`. Verified visually.

## Testing

- **Local dry run:** `docker compose --env-file .env.coolify -f docker-compose.coolify.yml up`
  on the dev machine, with `VITE_APP_ENV=next-preview` in that env file —
  validates the anchor-built DSNs, the literal
  `POSTGRES_USER`/`POSTGRES_DB`, seed-if-empty, and the banner before anything
  reaches Coolify.
- **Frontend unit tests:** `DevBanner` cases above.
- **Post-deploy smoke test on `next`:** log in as the seeded admin using the
  `next` `SEED_PASSWORD`, confirm the blue NEXT banner, upload a video, play it
  back (exercises the presigned round-trip against the new MinIO host), and
  confirm an invite link appears in the backend logs.
- **Pointer workflow:** `git push -f origin <some-branch>:next` and confirm
  Coolify redeploys without any UI interaction.
- **`dev` regression:** after merging to `develop`, confirm `dev` still boots,
  still shows the amber `dev-preview` banner, and its data survived.

## Out of scope

- Any change to `dev`, its `develop` auto-deploy, or `main`.
- **Self-healing entrypoint** (VMP-173's optional "create the DB on boot if
  missing" variant). The single-secret change removes the cause; this papers over
  the symptom and adds a `pg` step to every environment's boot path forever.
- **better-auth `cookieCache`** (VMP-166). An auth performance fix unrelated to
  multi-environment deployment; folding it in would give this spec two unrelated
  reasons to change.
- **Per-PR preview deployments** — a larger effort, framed in VMP-173.
- **GlitchTip / observability** — the follow-on spec, to be built and proven on
  `next` first.

## Files

**Changed:**

- `docker-compose.coolify.yml` — DSN anchor, literal `POSTGRES_USER`/`POSTGRES_DB`,
  parameterized `VITE_APP_ENV`.
- `.env.coolify.example` — drop `POSTGRES_USER`, `POSTGRES_DB`, and the three DSNs.
- `frontend/src/features/layout/DevBanner.tsx` — env→banner lookup.
- `frontend/src/features/layout/DevBanner.test.tsx` — `next-preview` cases.
- `README.md` — `next` deployment + deploy-pointer workflow.

**New:**

- `.env.coolify.next.example` — the `next` env deltas.

**Operator steps (not code):**

- Two DNS records: `next.` and `s3.next.`
- `git push origin develop:next` to create the pointer branch.
- Clone the Coolify resource, set branch `next`, set the env above.
