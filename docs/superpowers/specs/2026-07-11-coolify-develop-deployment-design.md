# Coolify develop deployment — design

**Date:** 2026-07-11
**Status:** Approved design, pending implementation plan
**Author:** Mark Fontenot (with Claude)

## Purpose

Add the ability to deploy the Angelman Syndrome Video Management Portal to a
self-hosted **Coolify** server as an **alternative** deployment target, aimed at
**development testing** of the `develop` branch. The existing AWS deployment
(ECR/ECS backend, S3 + CloudFront frontend, RDS/Secrets Manager/SES) stays the
production path and is **never modified**.

Goals, from the request:
1. Docker Compose / Dockerfiles that support a Coolify deployment.
2. Confirm no hardcoded paths/URLs are baked into application code.
3. A `.env.coolify`-style env template.
4. Auto-redeploy on every merge into `develop`.
5. Run the frontend as a container (AWS uses CloudFront; Coolify needs a container).
6. Any other work needed for a develop deployment.

## Guiding principle

**Every artifact is new and additive.** The AWS path — `scripts/deploy-*.sh`,
`backend/Dockerfile`, and the S3/CloudFront frontend flow — is untouched. Coolify
gets its own compose file, its own backend image, and its own env template.

## Findings from the code audit (goal #2)

The application is already well-parameterized for an alternative deployment:

- **Frontend calls relative API paths.** `frontend/src/lib/api.ts` uses
  `/api/domain/*` with no build-time API base URL. Nothing needs baking at build
  time.
- **nginx already proxies same-origin.** `frontend/nginx.conf` proxies `/api/` →
  `http://backend:8080` (the compose service name), so the SPA and API share an
  origin and Better Auth cookies work with no cross-subdomain config.
- **Every backend URL/origin reads from env**, with `localhost` only as a dev
  fallback: `ALLOWED_ORIGIN`, `FRONTEND_URL`, `S3_ENDPOINT`, `SES_ENDPOINT`,
  `DATABASE_URL`, `PORT`, etc.
- **No hardcoded AWS URLs in application code.** The only AWS specifics live in
  `scripts/deploy-*.sh` (bucket name, CloudFront distribution id), which the
  Coolify path does not use.

Conclusion: this is a **deployment-topology** task, not a code-surgery task. The
existing `LOCAL=true` no-AWS code path is reused directly, so the application
needs **near-zero code changes** (two tiny, backwards-compatible additions,
noted below).

## Architecture

One Coolify **Docker Compose** resource with four services:

```
Browser ──TLS──▶ Traefik ─┬─▶ frontend (nginx)  →  dev.<domain>        [public, Basic-Auth gated]
 (Coolify's      (Coolify   │      └─ proxies /api/ → backend:8080
  built-in        edge)     ├─▶ minio (S3 API)   →  s3.dev.<domain>    [public, NOT Basic-Auth gated]
  proxy)                    │
                            └─▶ backend  :8080   [internal only]
                                  └─▶ postgres    [internal, named volume]
```

- **frontend** — reuses `frontend/Dockerfile` + `frontend/nginx.conf` as-is
  (SPA + `/api/` proxy already target `backend:8080`). Publicly exposed via
  Coolify's magic FQDN and gated with edge HTTP Basic Auth.
- **backend** — new `backend/Dockerfile.coolify` (dev deps kept + a migrate/seed
  entrypoint). Internal only; reached same-origin through nginx, so Better Auth
  cookies work.
- **postgres** — `postgres:16-alpine` with a named volume (persistent across
  redeploys).
- **minio** — S3-compatible object store, publicly exposed at `s3.dev.<domain>`,
  named volume. The bucket is created by a one-shot `mc` init service; browser
  CORS is configured via `MINIO_API_CORS_ALLOW_ORIGIN` on the MinIO service (not
  by the init script).

### Data flow

- **App traffic:** Browser → Traefik (TLS) → nginx (frontend). nginx serves the
  SPA and proxies `/api/*` to `backend:8080` — same origin, so auth cookies are
  first-party.
- **Object storage:** Browser → Traefik (TLS) → MinIO at `s3.dev.<domain>`. The
  browser uploads multipart parts via presigned **PUT** URLs and streams via
  presigned **GET** URLs, hitting MinIO **directly**. This is the one hard
  constraint: the store must be reachable by the browser at the exact host the
  URL is signed for.

## Object store: MinIO (goal #5's sibling — video must work)

The develop deployment must support **full upload + playback**. Because the
browser talks directly to the object store, the store must be browser-reachable.
MinIO is chosen because it reuses the existing `LOCAL=true` S3 code path verbatim:

- `LOCAL=true` already turns on path-style addressing, static credentials, and a
  custom `S3_ENDPOINT` — exactly MinIO's shape (the same single-endpoint pattern
  LocalStack uses locally at `localhost:4566`).
- The backend's S3 client is pointed at the **public** MinIO URL for both signing
  **and** its own server-side calls (CreateMultipartUpload, Complete, the seed's
  `putObject`). Presigned signatures are tied to the endpoint host, so a single
  public endpoint keeps browser-issued URLs valid.
- MinIO is configured with `MINIO_SERVER_URL=https://s3.dev.<domain>` so SigV4
  host validation matches when Traefik terminates TLS and forwards to MinIO.
- The bucket stays **private**: all access is via presigned URLs (signed with the
  backend's static creds) or server-side calls. No anonymous/public bucket policy.

## Configuration strategy — reuse `LOCAL=true`, no config-mode code

`.env.coolify.example` documents every variable; real secrets are set in the
Coolify UI (never committed).

| Variable | Value | Effect |
|---|---|---|
| `LOCAL` | `true` | path-style S3/MinIO, static creds, Postgres SSL off |
| `NODE_ENV` | `development` | allows the seed to run; makes `ses.ts` **log** invite/reset links |
| `SES_FROM_EMAIL` | *unset* | `sendEmail()` returns early → **log-only email**, zero code change |
| `S3_ENDPOINT` | `https://s3.dev.<domain>` | presign + server-side S3 ops |
| `S3_BUCKET_NAME` | e.g. `angelman-videos-develop` | bucket |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | MinIO root creds | S3 auth |
| `AWS_REGION` | `us-east-1` | SigV4 region |
| `DATABASE_URL` / `DIRECT_DATABASE_URL` | compose `postgres` DSN | DB |
| `ALLOWED_ORIGIN` = `FRONTEND_URL` = `BETTER_AUTH_URL` | `https://dev.<domain>` | CORS, trusted origins, invite links, auth base |
| `BETTER_AUTH_SECRET` / `ADMIN_SECRET` / `INTERNAL_SECRET_HEADER` | Coolify-set secrets | — |
| `SEED_PASSWORD` | Coolify-set secret | seeded users' password (see Security) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Coolify-set | Postgres container |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | Coolify-set (= the AWS_* creds above) | MinIO auth |
| `MINIO_SERVER_URL` | `https://s3.dev.<domain>` | SigV4 host validation behind Traefik |
| `MINIO_API_CORS_ALLOW_ORIGIN` | `https://dev.<domain>` | restrict browser CORS origin |

**Security note on `LOCAL=true`:** the flag only swaps *which infrastructure* the
app talks to. It does **not** weaken the app's own defenses — auth, CORS,
`disableSignUp`, and every permission check stay fully active. Disabling Postgres
TLS is a non-issue because Postgres is an internal container on a private Docker
network. Log-only email falls out of existing behavior: with `SES_FROM_EMAIL`
unset, `sendEmail()` returns before touching SES, and `NODE_ENV≠production`
already logs the activation URL.

## Backend image + migrate/seed entrypoint (goal #6)

`backend/Dockerfile.coolify` — same multi-stage build as the AWS Dockerfile, but
the runtime stage **keeps dev dependencies** (`tsx`, the Prisma CLI) and copies
`prisma/`, so migrations and the seed can run. A new entrypoint,
`scripts/coolify-backend-entrypoint.sh`, runs on every boot:

1. `npx prisma migrate deploy` — applies migrations (the `20260424000000_initial`
   migration exists).
2. **Seed-if-empty** — count users; if zero, run `npx prisma db seed`. Under
   `LOCAL=true` the seed also uploads the sample video to each video's `s3Key` in
   MinIO, so seeded videos actually play.
3. `node dist/index.js` — start the server.

This yields **seed-once, persist-across-deploys**: the first boot seeds a fresh
DB; later boots skip seeding, preserving accumulated data and uploaded videos.
The emptiness guard is what makes it safe to leave the (destructive-idempotent)
seed in the boot path.

## Frontend: one small header addition

Client-side video transcoding in the upload path (WebCodecs/WebGPU, which need
`SharedArrayBuffer`) requires the same headers the Vite dev server sets:
`Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: credentialless`. These are added to
`frontend/nginx.conf`. That file is used **only** by the container image — the AWS
frontend serves from S3/CloudFront — so the change is safe for AWS and also
benefits the local `docker-compose.yml` frontend. `credentialless` (matching the
dev server) is permissive enough that cross-origin MinIO media still loads.

## Auto-deploy on merge to `develop` (goal #4)

The **Coolify GitHub App** watches the `develop` branch and redeploys natively
(build logs + rollback in the Coolify UI).

**External dependency:** the repo lives in the `KhourySpecialProjects` org, so
installing the GitHub App requires an **org-owner approval**. Until that approval
lands, Coolify's manual **Deploy** button works — so standing up the deployment
is **not** blocked on the approval; only the automation is.

## Security / access gating

The develop URL is internet-reachable and seeded with admin accounts, so two
layers of protection are applied (defense in depth):

1. **Edge HTTP Basic Auth** on the app host `dev.<domain>` (configured in
   Coolify/Traefik). Applied **only** to the app host — **not** to
   `s3.dev.<domain>`, because presigned upload/stream URLs must stay reachable
   (MinIO remains protected by its private bucket + URL signatures).
2. **Seed password override** — the seed reads `SEED_PASSWORD` (falling back to
   `password123` for local dev), so the seeded SYSADMIN is not a publicly-known
   credential. This is a one-line, backwards-compatible change to
   `backend/prisma/seed.ts`.

## Application code changes (the only ones)

Both are small and backwards-compatible; neither affects the AWS path:

1. `backend/prisma/seed.ts` — read the seed password from `SEED_PASSWORD`
   (default `password123`).
2. `frontend/nginx.conf` — add the COOP/COEP response headers.

Everything else is pure infrastructure/config (new files).

## New files (all additive)

- `docker-compose.coolify.yml` — the 4-service Coolify resource.
- `backend/Dockerfile.coolify` — dev-deps runtime + entrypoint.
- `scripts/coolify-backend-entrypoint.sh` — migrate + seed-if-empty + start.
- `scripts/minio-init.sh` — `mc` bootstrap: create bucket (CORS is set via
  `MINIO_API_CORS_ALLOW_ORIGIN` in compose, not here).
- `.env.coolify.example` — documented env template.
- README section: "Deploying to Coolify (develop)".

## Risks to verify during implementation

1. **Secure cookies behind Traefik → nginx → backend.** Set
   `BETTER_AUTH_URL=https://…`; likely need Express `trust proxy` and
   propagation of `X-Forwarded-Proto` through nginx so Better Auth issues correct
   cookies/redirects. Verify login end-to-end.
2. **COOP/COEP vs MinIO media.** Confirm both upload transcoding *and* playback
   work with the headers enabled (cross-origin media under `credentialless`).
3. **MinIO CORS/ETag.** Multipart PUT must return the `ETag` header to the
   browser (MinIO exposes it; origin restricted via `MINIO_API_CORS_ALLOW_ORIGIN`).
4. **Org-owner approval** for the Coolify GitHub App (automation only; manual
   deploy is unaffected).

## Testing

- **Local dry run:** `docker compose -f docker-compose.coolify.yml up` on the dev
  machine first — validates the compose, the entrypoint, seed-if-empty, and a
  full MinIO presigned round-trip before anything reaches the Coolify server.
- **Post-deploy smoke test:** log in as the seeded admin (using `SEED_PASSWORD`),
  browse the reviews list, upload a video, play it back, and confirm an invite
  link appears in the backend logs (log-only email).

## Out of scope

- Per-PR preview deployments (a separate, larger effort — see the parked
  feasibility notes).
- Any change to the AWS production deployment.
- Real email delivery (SES) on Coolify.
