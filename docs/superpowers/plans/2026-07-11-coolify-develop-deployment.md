# Coolify Develop Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the Angelman Syndrome Video Management Portal to a self-hosted Coolify server as an additive, develop-branch dev-testing target with working video upload/playback, without touching the AWS production path.

**Architecture:** One Coolify Docker Compose resource runs four services — a containerized nginx frontend (public, Basic-Auth gated), an internal Express backend that migrates + seeds-on-first-boot, a persistent Postgres, and a MinIO object store (public at `s3.dev.<domain>`). The app reuses its existing `LOCAL=true` no-AWS code path, so MinIO drops in as an S3 replacement with near-zero code changes; the browser uploads/streams directly to MinIO via presigned URLs.

**Tech Stack:** Docker Compose, Node 22 (backend) / Node 20 (frontend) Alpine images, nginx, PostgreSQL 16, MinIO + `mc`, Prisma 7 + `tsx` seed, Better Auth, Coolify (Traefik edge + GitHub App auto-deploy).

## Global Constraints

- **Additive only.** Do NOT modify `backend/Dockerfile`, `scripts/deploy-*.sh`, or the S3/CloudFront frontend flow. New files carry the `.coolify` suffix or are Coolify-specific.
- **No new config mode.** Reuse the existing `LOCAL=true` code path; drive everything through environment variables. The only application code changes are the three tiny ones in Task 2.
- **Exact base images:** backend `node:22-alpine`, frontend `node:20-alpine` / `nginx:alpine` (match existing Dockerfiles).
- **Backend listens on `PORT`** (set to `8080`); nginx proxies `/api/` → `http://backend:8080` (unchanged).
- **Object store is private.** All access is via presigned URLs or server-side calls — never a public bucket policy.
- **Email is log-only.** `SES_FROM_EMAIL` is left unset and `NODE_ENV=development`, so `sendEmail()` returns early and activation links are logged. Do not add an SMTP/SES integration.
- **Env var names are fixed** (consumed by existing code): `LOCAL`, `NODE_ENV`, `PORT`, `DATABASE_URL`, `LOCAL_DATABASE_URL`, `DIRECT_DATABASE_URL`, `ALLOWED_ORIGIN`, `FRONTEND_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `ADMIN_SECRET`, `INTERNAL_SECRET_HEADER`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_BUCKET_NAME`, `SEED_PASSWORD`.

---

## File Structure

**New files (all additive):**
- `.env.coolify.example` — documented env template for the Coolify deployment.
- `backend/Dockerfile.coolify` — backend image that keeps dev deps for migrate/seed on boot.
- `scripts/coolify-backend-entrypoint.sh` — migrate + seed-if-empty + start.
- `scripts/minio-init.sh` — one-shot `mc` bucket bootstrap.
- `docker-compose.coolify.yml` — the four-service Coolify resource.
- `docs/superpowers/plans/` + README section — runbook.

**Modified files (three tiny app changes + gitignore + README):**
- `backend/src/index.ts` — `app.set("trust proxy", true)` (correct client IP/proto behind Traefik).
- `backend/prisma/seed.ts` — read `SEED_PASSWORD` (default `password123`).
- `frontend/nginx.conf` — add COOP/COEP headers for client-side transcoding.
- `.gitignore` — un-ignore `.env.coolify.example`.
- `README.md` — "Deploying to Coolify (develop)" section.

---

## Task 1: Environment template + gitignore

**Files:**
- Create: `.env.coolify.example`
- Modify: `.gitignore` (currently ignores every `.env.*`, which would hide the new example)

**Interfaces:**
- Produces: the canonical list of env vars every other task references. Names must match the Global Constraints list exactly.

- [ ] **Step 1: Create `.env.coolify.example`**

```bash
# ============================================================================
# Coolify develop deployment — environment template.
#
# This is an ADDITIVE, dev-testing deployment. It reuses the app's LOCAL=true
# no-AWS code path with a containerized MinIO object store instead of S3.
# Copy this file to .env.coolify for a LOCAL dry run, or paste these values
# into the Coolify UI (Environment Variables) for the real deployment.
#
# Replace every <...> placeholder. Generate secrets with: openssl rand -base64 32
# ============================================================================

# ── Deployment domain (set in Coolify; used to build the values below) ──────
# App:   dev.<domain>          (frontend, public, Basic-Auth gated)
# MinIO: s3.dev.<domain>       (object store S3 API, public, NOT gated)

# ── Core mode ───────────────────────────────────────────────────────────────
LOCAL=true                     # path-style S3/MinIO + static creds + Postgres SSL off
NODE_ENV=development           # allows the seed to run; enables log-only email
PORT=8080                      # backend port; nginx proxies /api/ -> backend:8080

# ── Postgres (containerized, persistent volume) ─────────────────────────────
POSTGRES_USER=angelman
POSTGRES_PASSWORD=<generate>
POSTGRES_DB=angelman
# Both point at the compose "postgres" service. prisma.ts uses DATABASE_URL;
# prisma.config.ts uses LOCAL_DATABASE_URL (LOCAL=true branch).
DATABASE_URL=postgres://angelman:<generate>@postgres:5432/angelman
LOCAL_DATABASE_URL=postgres://angelman:<generate>@postgres:5432/angelman
DIRECT_DATABASE_URL=postgres://angelman:<generate>@postgres:5432/angelman

# ── App origin / auth (single public app host, same-origin via nginx) ───────
ALLOWED_ORIGIN=https://dev.<domain>
FRONTEND_URL=https://dev.<domain>
BETTER_AUTH_URL=https://dev.<domain>
BETTER_AUTH_SECRET=<generate>
ADMIN_SECRET=<generate>
INTERNAL_SECRET_HEADER=<generate>

# ── Seed ────────────────────────────────────────────────────────────────────
# Overrides the seeded users' password so the public admin login is not a
# known credential. Falls back to "password123" only for local dev.
SEED_PASSWORD=<generate>

# ── MinIO object store ──────────────────────────────────────────────────────
MINIO_ROOT_USER=<generate>
MINIO_ROOT_PASSWORD=<generate>
# The backend's S3 client uses these MinIO creds (LOCAL=true static creds).
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=${MINIO_ROOT_USER}
AWS_SECRET_ACCESS_KEY=${MINIO_ROOT_PASSWORD}
# PUBLIC MinIO endpoint — the browser signs/uploads/streams against this exact
# host, and the backend signs + makes server-side calls against it too.
S3_ENDPOINT=https://s3.dev.<domain>
S3_BUCKET_NAME=angelman-videos-develop

# ── Email ───────────────────────────────────────────────────────────────────
# SES_FROM_EMAIL is intentionally OMITTED -> sendEmail() no-ops (log-only email).
# Do not set it.
```

- [ ] **Step 2: Un-ignore the example in `.gitignore`**

Add these two lines at the end of `.gitignore` (the existing `.env.*` rules would otherwise ignore the new file):

```gitignore
# Coolify env template is safe to commit (placeholders only)
!.env.coolify.example
```

- [ ] **Step 3: Verify the file is now trackable**

Run: `git check-ignore -v .env.coolify.example || echo "NOT IGNORED (good)"`
Expected: prints `NOT IGNORED (good)` (the negation wins).

- [ ] **Step 4: Commit**

```bash
git add .env.coolify.example .gitignore
git commit -m "Add Coolify env template and un-ignore it"
```

---

## Task 2: Application code changes (proxy trust, seed password, transcoding headers)

**Files:**
- Modify: `backend/src/index.ts` (add `trust proxy` in `createApp`)
- Modify: `backend/prisma/seed.ts:28` (env-driven password)
- Modify: `frontend/nginx.conf` (COOP/COEP headers)

**Interfaces:**
- Consumes: `SEED_PASSWORD` env (Task 1).
- Produces: a proxy-aware backend and cross-origin-isolated frontend that the compose stack (Task 5) relies on.

- [ ] **Step 1: Add `trust proxy` to the Express app**

In `backend/src/index.ts`, inside `createApp()`, add the `trust proxy` line as the first statement after `const app = express();` (before `app.use(requestLogger)`):

```typescript
export function createApp() {
  const app = express();

  // Behind Coolify's Traefik reverse proxy: trust X-Forwarded-* so req.ip and
  // req.protocol reflect the original HTTPS client (correct logging + auth).
  app.set("trust proxy", true);

  // middleware
  app.use(requestLogger);
```

- [ ] **Step 2: Make the seed password configurable**

In `backend/prisma/seed.ts`, replace line 28:

```typescript
const PASSWORD = "password123";
```

with:

```typescript
// Overridable so a publicly-reachable deploy isn't seeded with a known
// credential. Defaults to the local-dev password.
const PASSWORD = process.env.SEED_PASSWORD || "password123";
```

- [ ] **Step 3: Add COOP/COEP headers to nginx**

In `frontend/nginx.conf`, add the two `add_header` lines inside the `server { ... }` block, immediately after `index index.html;`:

```nginx
    index index.html;

    # Client-side video transcoding (WebCodecs/WebGPU) needs SharedArrayBuffer,
    # which requires cross-origin isolation. Mirrors the Vite dev server headers
    # (frontend/vite.config.ts). Only affects the container-served frontend; the
    # AWS path serves from CloudFront and is unaffected.
    add_header Cross-Origin-Opener-Policy same-origin always;
    add_header Cross-Origin-Embedder-Policy credentialless always;
```

- [ ] **Step 4: Verify the backend still type-checks**

Run: `cd backend && npm run build`
Expected: `tsc` exits 0, no errors. (Confirms the `index.ts` and `seed.ts` edits compile.)

- [ ] **Step 5: Verify the seed change and nginx syntax by inspection**

Run: `cd /home/mark/Work/CS4535/video-review-system && grep -n "SEED_PASSWORD" backend/prisma/seed.ts && grep -n "Cross-Origin" frontend/nginx.conf && grep -n "trust proxy" backend/src/index.ts`
Expected: one match in each file (the lines added above).

- [ ] **Step 6: Commit**

```bash
git add backend/src/index.ts backend/prisma/seed.ts frontend/nginx.conf
git commit -m "Make app Coolify/proxy-ready: trust proxy, SEED_PASSWORD, COOP/COEP"
```

---

## Task 3: Backend Coolify image + entrypoint

**Files:**
- Create: `scripts/coolify-backend-entrypoint.sh`
- Create: `backend/Dockerfile.coolify`

**Interfaces:**
- Consumes: the env vars from Task 1 (at container runtime); the `SEED_PASSWORD` change from Task 2.
- Produces: a runnable backend image whose entrypoint runs `prisma migrate deploy`, seeds only when the `user` table is empty, then `node dist/index.js`. Compose (Task 5) builds this via `dockerfile: backend/Dockerfile.coolify`.

- [ ] **Step 1: Write the entrypoint script**

Create `scripts/coolify-backend-entrypoint.sh`:

```sh
#!/bin/sh
# Entrypoint for the Coolify backend image (backend/Dockerfile.coolify).
# Runs DB migrations on every boot, seeds ONLY when the database is empty (so
# redeploys preserve data and uploaded videos), then starts the server.
set -eu

echo "[entrypoint] prisma migrate deploy"
npx prisma migrate deploy

echo "[entrypoint] checking whether the database is empty"
# Count rows in the Better Auth "user" table (prisma model User -> @@map user).
# Exit 1 => empty (seed needed); 0 => already seeded; 2 => error.
set +e
node -e "import('./dist/lib/prisma.js').then(async (m) => { const n = await m.default.user.count(); process.exit(n > 0 ? 0 : 1); }).catch((e) => { console.error(e); process.exit(2); });"
STATUS=$?
set -e

if [ "$STATUS" -eq 1 ]; then
  echo "[entrypoint] database empty — running seed"
  npx prisma db seed
elif [ "$STATUS" -eq 0 ]; then
  echo "[entrypoint] database already seeded — skipping"
else
  echo "[entrypoint] seed-check failed (status $STATUS)"
  exit "$STATUS"
fi

echo "[entrypoint] starting server"
exec node dist/index.js
```

- [ ] **Step 2: Write `backend/Dockerfile.coolify`**

Create `backend/Dockerfile.coolify`:

```dockerfile
# Backend image for the Coolify DEVELOP deployment ONLY.
#
# Differs from backend/Dockerfile (the AWS/prod image) in that the runtime
# stage KEEPS dev dependencies (prisma CLI + tsx) and carries the TS source +
# prisma config, so the entrypoint can run migrations and the tsx seed on boot.
# Do NOT use this image for production.
FROM node:22-alpine AS builder

WORKDIR /repo/backend

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/prisma ./prisma
COPY backend/src ./src
COPY shared ../shared

RUN npx prisma generate
RUN npm run build

# ── Runtime ─────────────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Keep ALL deps (prisma CLI + tsx) so migrate/seed run at boot.
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci

# Compiled server + generated Prisma client (for `node dist/index.js`).
COPY --from=builder /repo/backend/dist/backend/src ./dist
COPY --from=builder /repo/backend/src/generated/prisma ./dist/generated/prisma

# Prisma schema/migrations + config + TS source, needed by:
#   - `prisma migrate deploy` (schema + prisma.config.ts)
#   - `prisma db seed` -> `tsx prisma/seed.ts` (seed.ts + its src/lib/*.ts value
#     imports + the generated client under src/generated/prisma)
COPY --from=builder /repo/backend/prisma ./prisma
COPY backend/prisma.config.ts ./prisma.config.ts
COPY backend/tsconfig.json ./tsconfig.json
COPY --from=builder /repo/backend/src ./src

COPY scripts/coolify-backend-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
```

- [ ] **Step 3: Build the image (developer runs Docker locally)**

Run from the repo root: `docker build -f backend/Dockerfile.coolify -t vmp-backend-coolify:test .`
Expected: build completes successfully, ending with a tagged image (`docker images | grep vmp-backend-coolify` shows it). The `npm run build` layer must succeed (it did in Task 2 Step 4).

- [ ] **Step 4: Smoke-test the entrypoint wiring without a DB (fast fail check)**

Run: `docker run --rm -e LOCAL=true -e NODE_ENV=development -e LOCAL_DATABASE_URL=postgres://x:x@127.0.0.1:5/none -e DATABASE_URL=postgres://x:x@127.0.0.1:5/none vmp-backend-coolify:test 2>&1 | head -5`
Expected: output begins with `[entrypoint] prisma migrate deploy` (proving the entrypoint runs and finds the prisma CLI) before it errors out on the unreachable DB. Full DB-backed run is exercised in Task 5.

- [ ] **Step 5: Commit**

```bash
git add scripts/coolify-backend-entrypoint.sh backend/Dockerfile.coolify
git commit -m "Add Coolify backend image + migrate/seed-if-empty entrypoint"
```

---

## Task 4: MinIO bucket bootstrap script

**Files:**
- Create: `scripts/minio-init.sh`

**Interfaces:**
- Consumes: `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `S3_BUCKET_NAME`, and (internal) `MINIO_INTERNAL_ENDPOINT`.
- Produces: an existing private bucket named `$S3_BUCKET_NAME`. (CORS is handled by the MinIO server's `MINIO_API_CORS_ALLOW_ORIGIN` env in Task 5, not here.) Runs as the `minio-init` one-shot service that `backend` waits on.

- [ ] **Step 1: Write `scripts/minio-init.sh`**

Create `scripts/minio-init.sh`:

```sh
#!/bin/sh
# One-shot MinIO bootstrap for the Coolify deploy. Runs in a minio/mc container
# after MinIO starts. Waits for MinIO to accept connections, then creates the
# (private) bucket. Idempotent — safe on every deploy. CORS/ETag are handled by
# the MinIO server via MINIO_API_CORS_ALLOW_ORIGIN (see docker-compose.coolify.yml);
# the bucket stays private because all access is via presigned URLs.
set -eu

ENDPOINT="${MINIO_INTERNAL_ENDPOINT:-http://minio:9000}"
BUCKET="${S3_BUCKET_NAME:-angelman-videos-develop}"

echo "[minio-init] waiting for MinIO at ${ENDPOINT}"
i=0
until mc alias set target "${ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "[minio-init] MinIO did not become ready in time"
    exit 1
  fi
  sleep 2
done

echo "[minio-init] creating bucket (if absent): ${BUCKET}"
mc mb --ignore-existing "target/${BUCKET}"

echo "[minio-init] done"
```

- [ ] **Step 2: Verify shell syntax**

Run: `sh -n scripts/minio-init.sh && echo "syntax ok"`
Expected: prints `syntax ok`. (Functional behavior is verified in Task 5.)

- [ ] **Step 3: Commit**

```bash
git add scripts/minio-init.sh
git commit -m "Add MinIO bucket bootstrap script for Coolify"
```

---

## Task 5: Compose file + local end-to-end dry run

**Files:**
- Create: `docker-compose.coolify.yml`

**Interfaces:**
- Consumes: `backend/Dockerfile.coolify` (Task 3), `scripts/minio-init.sh` (Task 4), the env template (Task 1), and reuses `frontend/Dockerfile` + `frontend/nginx.conf` (Task 2) unchanged.
- Produces: the deployable four-service stack. This is the integration checkpoint before the live Coolify deploy (Task 7).

- [ ] **Step 1: Write `docker-compose.coolify.yml`**

Create `docker-compose.coolify.yml`:

```yaml
# Coolify develop deployment. Additive — does NOT replace docker-compose.yml
# (the local dev/AWS-adjacent stack). Deploy as a Coolify "Docker Compose"
# resource. In Coolify: expose `frontend` at dev.<domain> (with Basic Auth) and
# `minio` port 9000 at s3.dev.<domain> (NO Basic Auth). See README "Deploying to
# Coolify (develop)".
services:
  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    restart: unless-stopped
    expose:
      - "80"
    depends_on:
      - backend

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile.coolify
    restart: unless-stopped
    expose:
      - "8080"
    environment:
      LOCAL: "true"
      NODE_ENV: development
      PORT: "8080"
      DATABASE_URL: ${DATABASE_URL}
      LOCAL_DATABASE_URL: ${LOCAL_DATABASE_URL}
      DIRECT_DATABASE_URL: ${DIRECT_DATABASE_URL}
      ALLOWED_ORIGIN: ${ALLOWED_ORIGIN}
      FRONTEND_URL: ${FRONTEND_URL}
      BETTER_AUTH_URL: ${BETTER_AUTH_URL}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      ADMIN_SECRET: ${ADMIN_SECRET}
      INTERNAL_SECRET_HEADER: ${INTERNAL_SECRET_HEADER}
      SEED_PASSWORD: ${SEED_PASSWORD}
      AWS_REGION: ${AWS_REGION:-us-east-1}
      AWS_ACCESS_KEY_ID: ${MINIO_ROOT_USER}
      AWS_SECRET_ACCESS_KEY: ${MINIO_ROOT_PASSWORD}
      S3_ENDPOINT: ${S3_ENDPOINT}
      S3_BUCKET_NAME: ${S3_BUCKET_NAME}
      # SES_FROM_EMAIL intentionally unset -> log-only email.
    depends_on:
      postgres:
        condition: service_healthy
      minio-init:
        condition: service_completed_successfully

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 10

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      # External URL so SigV4 host validation matches presigned URLs behind Traefik.
      MINIO_SERVER_URL: ${S3_ENDPOINT}
      # Allow browser cross-origin upload/stream from the app origin.
      MINIO_API_CORS_ALLOW_ORIGIN: ${ALLOWED_ORIGIN}
    volumes:
      - minio_data:/data
    expose:
      - "9000"
      - "9001"

  minio-init:
    image: minio/mc:latest
    depends_on:
      - minio
    entrypoint: ["/bin/sh", "/scripts/minio-init.sh"]
    environment:
      MINIO_INTERNAL_ENDPOINT: http://minio:9000
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      S3_BUCKET_NAME: ${S3_BUCKET_NAME}
    volumes:
      - ./scripts/minio-init.sh:/scripts/minio-init.sh:ro
    restart: "no"

volumes:
  postgres_data:
  minio_data:
```

- [ ] **Step 2: Validate compose syntax**

Run: `docker compose -f docker-compose.coolify.yml config >/dev/null && echo "compose valid"`
Expected: prints `compose valid` (interpolation resolves; note it will warn about unset vars until Step 3's env file exists — pass `--env-file .env.coolify` to silence).

- [ ] **Step 3: Create a LOCAL dry-run env file**

Copy the template and fill it for a purely-local run (no real domain). Use `localhost` origins and a host-port-mapped MinIO. Create `.env.coolify` (gitignored) with these values:

```bash
LOCAL=true
NODE_ENV=development
PORT=8080
POSTGRES_USER=angelman
POSTGRES_PASSWORD=devpassword
POSTGRES_DB=angelman
DATABASE_URL=postgres://angelman:devpassword@postgres:5432/angelman
LOCAL_DATABASE_URL=postgres://angelman:devpassword@postgres:5432/angelman
DIRECT_DATABASE_URL=postgres://angelman:devpassword@postgres:5432/angelman
ALLOWED_ORIGIN=http://localhost:8081
FRONTEND_URL=http://localhost:8081
BETTER_AUTH_URL=http://localhost:8081
BETTER_AUTH_SECRET=dry-run-secret-not-for-prod
ADMIN_SECRET=dry-run-admin-secret
INTERNAL_SECRET_HEADER=dry-run-internal
SEED_PASSWORD=dryrunpass123
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
AWS_REGION=us-east-1
S3_ENDPOINT=http://localhost:9000
S3_BUCKET_NAME=angelman-videos-develop
```

For the dry run only, add host port mappings so the browser can reach the stack. Create `docker-compose.coolify.override.yml` (gitignored, dry-run only — Coolify never uses it):

```yaml
services:
  frontend:
    ports:
      - "8081:80"
  minio:
    ports:
      - "9000:9000"
      - "9001:9001"
```

Note: presigned URLs are signed for `S3_ENDPOINT=http://localhost:9000`, which the browser can reach via this mapping — so upload/playback works in the dry run exactly as it will in production (where the host is `s3.dev.<domain>`).

- [ ] **Step 4: Bring the stack up**

Run: `docker compose --env-file .env.coolify -f docker-compose.coolify.yml -f docker-compose.coolify.override.yml up -d --build`
Expected: all services start; `minio-init` exits 0; `backend` logs show `[entrypoint] prisma migrate deploy`, then `[entrypoint] database empty — running seed`, then `Seed complete.`, then `Listening on port 8080`.

Check: `docker compose --env-file .env.coolify -f docker-compose.coolify.yml -f docker-compose.coolify.override.yml logs backend | grep -E "Seed complete|Listening on port"`
Expected: both lines present.

- [ ] **Step 5: Verify the backend health + seeded login**

Run: `curl -s http://localhost:8081/api/health`
Expected: `{"status":"ok"}` (proves nginx → backend proxy works).

Then in a browser, open `http://localhost:8081`, and log in as `admin@local.dev` with the `SEED_PASSWORD` value (`dryrunpass123`).
Expected: login succeeds and the reviews list loads with seeded data.

- [ ] **Step 6: Verify a full upload + playback round trip**

In the logged-in browser session, upload a small video via the upload dialog, then open it and press play.
Expected: the multipart upload completes (parts PUT directly to `localhost:9000`, ETags returned), the video record reaches `UPLOADED`, and playback streams from the presigned MinIO URL. This confirms MinIO CORS/ETag + presigned round trip end-to-end.

- [ ] **Step 7: Verify seed-if-empty idempotency (persistence across "redeploys")**

Run: `docker compose --env-file .env.coolify -f docker-compose.coolify.yml -f docker-compose.coolify.override.yml up -d --build --force-recreate backend`
Then: `docker compose --env-file .env.coolify -f docker-compose.coolify.yml -f docker-compose.coolify.override.yml logs backend | grep "already seeded"`
Expected: `[entrypoint] database already seeded — skipping` — and the video uploaded in Step 6 is still present after re-login. Confirms redeploys preserve data.

- [ ] **Step 8: Tear down the dry run and commit**

```bash
docker compose --env-file .env.coolify -f docker-compose.coolify.yml -f docker-compose.coolify.override.yml down -v
git add docker-compose.coolify.yml
git commit -m "Add docker-compose.coolify.yml (four-service develop stack)"
```

(`.env.coolify` and `docker-compose.coolify.override.yml` remain untracked — they match the existing `.env.*` ignore rule and are dry-run-only.)

---

## Task 6: README runbook

**Files:**
- Modify: `README.md` (append a new top-level section)

**Interfaces:**
- Consumes: all artifacts above.
- Produces: operator instructions for the live Coolify deploy performed in Task 7.

- [ ] **Step 1: Append the runbook section to `README.md`**

Add this section at the end of `README.md`:

```markdown
## Deploying to Coolify (develop)

An **additive, development-testing** deployment target, separate from the AWS
production path (which is unchanged). It runs the full stack — including working
video upload/playback — on a self-hosted Coolify server, using a containerized
MinIO object store in place of S3. See
`docs/superpowers/specs/2026-07-11-coolify-develop-deployment-design.md` for the
design.

### What gets deployed

One Coolify **Docker Compose** resource (`docker-compose.coolify.yml`) with four
services: `frontend` (nginx, public), `backend` (internal), `postgres`
(persistent volume), and `minio` (object store, public S3 API).

### DNS

Point two hostnames at the Coolify server:
- `dev.<domain>` — the app (frontend).
- `s3.dev.<domain>` — the MinIO S3 API (the browser uploads/streams here directly).

### One-time Coolify setup

1. **Create the resource:** New Resource → Docker Compose → this repo, branch
   `develop`, compose file `docker-compose.coolify.yml`.
2. **Environment variables:** paste the filled-in values from
   `.env.coolify.example` (generate every secret with `openssl rand -base64 32`).
   Set `ALLOWED_ORIGIN` / `FRONTEND_URL` / `BETTER_AUTH_URL` to `https://dev.<domain>`
   and `S3_ENDPOINT` to `https://s3.dev.<domain>`. Leave `SES_FROM_EMAIL` unset.
3. **Domains:**
   - `frontend` → `https://dev.<domain>` (container port 80).
   - `minio` → `https://s3.dev.<domain>` (container port **9000** only — do NOT
     expose the 9001 console publicly).
4. **Basic Auth:** enable Coolify/Traefik HTTP Basic Auth on the `frontend`
   domain only. Do NOT put Basic Auth on `s3.dev.<domain>` — presigned
   upload/stream URLs must stay reachable (the bucket is already private).
5. **Auto-deploy on merge to `develop`:** connect the **Coolify GitHub App** and
   enable automatic deployment for the `develop` branch.
   - ⚠️ The repo is in the `KhourySpecialProjects` org, so installing the GitHub
     App needs an **org-owner approval**. Until then, use Coolify's manual
     **Deploy** button — the deployment works; only the automation waits on
     approval.

### First deploy

Click **Deploy**. On first boot the backend runs `prisma migrate deploy`, detects
an empty database, seeds it, and (best-effort, `LOCAL=true`) uploads sample media
to MinIO. Later deploys skip seeding, so data and uploaded videos persist.

### Smoke test

1. Visit `https://dev.<domain>` (pass Basic Auth), log in as `admin@local.dev`
   with your `SEED_PASSWORD`.
2. Browse the reviews list (seeded data appears).
3. Upload a video and play it back (exercises the MinIO presigned round trip).
4. Trigger an invite from the admin UI and confirm the activation link appears in
   the `backend` service logs (log-only email).

### Notes

- **Log-only email:** no mail is sent; invite/reset links are logged by the
  backend. This is intentional for dev.
- **Seed password:** `SEED_PASSWORD` sets the seeded users' password so the public
  admin login is not a known credential.
- This target never touches AWS. Production still deploys via `scripts/deploy-*.sh`.
```

- [ ] **Step 2: Verify the section renders and links resolve**

Run: `grep -n "Deploying to Coolify (develop)" README.md && test -f docs/superpowers/specs/2026-07-11-coolify-develop-deployment-design.md && echo "spec link ok"`
Expected: the heading matches and prints `spec link ok`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Document Coolify develop deployment runbook"
```

---

## Task 7: Live Coolify provisioning + smoke test (operator-run)

This task is performed in the Coolify UI on the live server, following the Task 6
runbook. It is manual (no scriptable code) but has a concrete, verifiable
deliverable: a working develop deployment.

**Interfaces:**
- Consumes: the committed branch (`vmp-161-set-up-coolify-develop-branch-deployment`) merged/available on `develop`, and the Task 6 runbook.
- Produces: a live, Basic-Auth-gated develop deployment with working upload/playback.

- [ ] **Step 1: DNS** — point `dev.<domain>` and `s3.dev.<domain>` at the Coolify server; confirm both resolve (`dig +short dev.<domain>`).

- [ ] **Step 2: Create the Docker Compose resource** from `develop` using `docker-compose.coolify.yml`; paste env vars (secrets freshly generated).

- [ ] **Step 3: Configure domains** — `frontend` → `dev.<domain>` (port 80); `minio` → `s3.dev.<domain>` (port 9000 only). Enable Basic Auth on `dev.<domain>` only.

- [ ] **Step 4: Deploy** (manual button, or via GitHub App once org approval lands). Watch `backend` logs for `Seed complete.` and `Listening on port 8080`.

- [ ] **Step 5: Smoke test (the acceptance gate).** Run the four smoke-test steps from the README:
  - Basic Auth prompt appears on `dev.<domain>`.
  - Login as `admin@local.dev` / `SEED_PASSWORD` succeeds; reviews list loads.
  - Upload a video to `s3.dev.<domain>` and play it back — succeeds.
  - Invite activation link appears in `backend` logs.
  Expected: all four pass. If login fails with a cookie/redirect error, verify `BETTER_AUTH_URL=https://dev.<domain>` and that Traefik forwards `X-Forwarded-Proto: https` (the `trust proxy` setting from Task 2 relies on it).

- [ ] **Step 6: Enable auto-deploy** — confirm the Coolify GitHub App is installed (org-owner approved) and `develop` auto-deploys. Verify by pushing a trivial change to `develop` and watching Coolify redeploy. If approval is pending, note it and rely on manual deploy.

---

## Self-Review

**Spec coverage** (against `2026-07-11-coolify-develop-deployment-design.md`):
- 4-service topology → Task 5 compose; frontend reuse → Task 5 (uses `frontend/Dockerfile`); backend image → Task 3; postgres/minio → Task 5. ✓
- MinIO reuses `LOCAL=true`, browser-direct presign → Task 5 Steps 6 (verified). ✓
- Config strategy / env table → Task 1 template + Task 5 compose env. ✓
- Seed-if-empty entrypoint → Task 3. ✓
- Log-only email (SES_FROM_EMAIL unset) → Task 1/Task 5 (omitted), verified Task 7 Step 5. ✓
- COOP/COEP header → Task 2 Step 3. ✓
- Auto-deploy via GitHub App + org-approval caveat → Task 6/Task 7 Step 6. ✓
- Security: edge Basic Auth (app host only) + SEED_PASSWORD → Task 2 Step 2, Task 6/Task 7 Step 3. ✓
- Two/three app code changes only → Task 2 (trust proxy is the third; the design's "two changes" undercounted — trust proxy is required for correct auth/logging behind Traefik and is benign locally). ✓
- New files list → Tasks 1,3,4,5,6. ✓
- Risks (secure cookies, COOP/COEP vs media, MinIO CORS/ETag, org approval) → verified in Task 5 Steps 5–6 and Task 7 Steps 5–6. ✓
- Testing (local dry run + post-deploy smoke) → Task 5 + Task 7. ✓

**Placeholder scan:** `<domain>` / `<generate>` are intentional operator-supplied values, documented as such. No TBD/TODO/"handle edge cases". ✓

**Type consistency:** entrypoint uses `m.default.user.count()` — matches `prisma.ts` `export default prisma` and schema `model User { @@map("user") }` → client accessor `prisma.user`. Dist path `./dist/lib/prisma.js` matches the `outDir: dist` + `include: ["../shared/**/*"]` layout that emits to `dist/backend/src` (copied to `./dist`), identical to the working AWS image. Env var names match the Global Constraints list across Tasks 1/5. ✓
