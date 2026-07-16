# `next` Coolify Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repo support a second long-lived Coolify deployment (`next`) that is visually and configurably distinct from `dev`, without changing `dev` or its `develop` auto-deploy.

**Architecture:** No new services. `next` is a second Coolify Docker Compose resource reusing `docker-compose.coolify.yml` with its own env, volumes, and domains. Three code changes make that safe: an environment-keyed banner so the two deployments are distinguishable, a single-secret DB config so the per-environment env block has one DB knob instead of five, and a parameterized `VITE_APP_ENV` build arg. Everything else is operator configuration.

**Tech Stack:** Docker Compose, Coolify, React 19 + TypeScript, Vite, Tailwind CSS 4, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-15-next-coolify-deployment-design.md`
**Ticket:** [VMP-173](https://linear.app/next-consulting/issue/VMP-173)

## Global Constraints

- **Branch:** all work on `vmp-173-next-coolify-deployment` (already created, off `develop`).
- **Never modify `dev` behavior.** Every compose default must preserve today's `dev` result exactly. `VITE_APP_ENV` defaults to `dev-preview`; the Postgres literals are `angelman`, matching `dev`'s existing volume (confirmed 2026-07-15 in the Coolify UI).
- **Postgres identifiers are the literal string `angelman`** for both user and database. Not configurable, not secret.
- **The only DB secret is `POSTGRES_PASSWORD`**, generated with `openssl rand -hex 32` (URL-safe — it is interpolated into a DSN; base64 can emit `/ + =` which break it).
- **Exact domains:** app `next.asclepion.cs4535.cloud`; MinIO `s3.next.asclepion.cs4535.cloud`.
- **Exact bucket:** `angelman-videos-next`.
- **`VITE_APP_ENV` value for next:** `next-preview`. For dev: `dev-preview`.
- **Commit trailer** on every commit:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- **Do not touch:** `backend/Dockerfile.coolify`, `scripts/coolify-backend-entrypoint.sh`, `frontend/nginx.conf`, `docker-compose.yml`, anything under `backend/src`, or `main`.
- **Out of scope** (do not implement): self-healing DB entrypoint, better-auth `cookieCache`, per-PR previews, GlitchTip.

---

### Task 1: Environment-keyed banner

Makes `next` visually distinguishable from `dev`. Today `DevBanner.tsx` matches `VITE_APP_ENV === "dev-preview"` with a literal and hardcodes `bg-warning`, and `docker-compose.coolify.yml` hardcodes the build arg — so `dev` and `next` would be pixel-identical while both sit open in browser tabs.

**Files:**
- Modify: `frontend/src/features/layout/DevBanner.tsx` (whole file)
- Modify: `frontend/src/features/layout/DevBanner.test.tsx:1-70`
- Modify: `docker-compose.coolify.yml:10-11`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `BannerConfig = { text: string; className: string }` and
  `resolveEnvBanner(env: { DEV?: boolean; VITE_APP_ENV?: string }): BannerConfig | null`.
  The `VITE_APP_ENV` key `"next-preview"` is relied on by Task 3's env template.

> **Note — the spec is slightly wrong here.** It claims all existing `DevBanner.test.tsx` cases stay green. The two `resolveEnvBanner` `toEqual` assertions do **not**: adding `className` to the returned object changes the shape they compare against. They must be updated, and Step 1 does that. The three render-based `DevBanner` cases genuinely do stay green.

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `frontend/src/features/layout/DevBanner.test.tsx` with:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { resolveEnvBanner, DevBanner } from "./DevBanner";

const DEV_PREVIEW_TEXT =
  "Asclepion 0.1 - This is a Development Preview. Do NOT upload any PII or other sensitive information.";
const NEXT_PREVIEW_TEXT =
  "Asclepion 0.1 - NEXT (staging). Unstable build. Do NOT upload any PII or other sensitive information.";

describe("resolveEnvBanner", () => {
  it("returns the local banner when DEV is true", () => {
    expect(resolveEnvBanner({ DEV: true })).toEqual({
      text: "Local Development Preview",
      className: "bg-warning",
    });
  });

  it("local takes precedence over the dev-preview flag", () => {
    expect(
      resolveEnvBanner({ DEV: true, VITE_APP_ENV: "dev-preview" }),
    ).toEqual({ text: "Local Development Preview", className: "bg-warning" });
  });

  it("local takes precedence over the next-preview flag", () => {
    expect(
      resolveEnvBanner({ DEV: true, VITE_APP_ENV: "next-preview" }),
    ).toEqual({ text: "Local Development Preview", className: "bg-warning" });
  });

  it("returns the Coolify banner for the dev-preview flag", () => {
    expect(
      resolveEnvBanner({ DEV: false, VITE_APP_ENV: "dev-preview" }),
    ).toEqual({ text: DEV_PREVIEW_TEXT, className: "bg-warning" });
  });

  it("returns the NEXT banner for the next-preview flag", () => {
    expect(
      resolveEnvBanner({ DEV: false, VITE_APP_ENV: "next-preview" }),
    ).toEqual({ text: NEXT_PREVIEW_TEXT, className: "bg-info" });
  });

  it("returns null in production (no flags)", () => {
    expect(resolveEnvBanner({ DEV: false })).toBeNull();
  });

  it("returns null for an unknown flag value", () => {
    expect(
      resolveEnvBanner({ DEV: false, VITE_APP_ENV: "something-else" }),
    ).toBeNull();
  });
});

describe("DevBanner", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders the local banner when DEV is stubbed true", () => {
    vi.stubEnv("DEV", true);
    render(<DevBanner />);
    expect(screen.getByText("Local Development Preview")).toBeInTheDocument();
  });

  it("renders the Coolify banner when VITE_APP_ENV=dev-preview", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_APP_ENV", "dev-preview");
    render(<DevBanner />);
    expect(
      screen.getByText(/Do NOT upload any PII or other sensitive information/),
    ).toBeInTheDocument();
  });

  it("renders the NEXT banner with bg-info when VITE_APP_ENV=next-preview", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_APP_ENV", "next-preview");
    render(<DevBanner />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("NEXT (staging)");
    expect(banner).toHaveClass("bg-info");
  });

  it("renders the dev banner with bg-warning, not bg-info", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_APP_ENV", "dev-preview");
    render(<DevBanner />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveClass("bg-warning");
    expect(banner).not.toHaveClass("bg-info");
  });

  it("renders nothing in production", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_APP_ENV", "");
    const { container } = render(<DevBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/features/layout/DevBanner.test.tsx`

Expected: FAIL. The `resolveEnvBanner` `toEqual` cases fail because the returned object has no `className` property; the `next-preview` cases fail because `resolveEnvBanner` returns `null` for that value.

- [ ] **Step 3: Write the implementation**

Replace the entire contents of `frontend/src/features/layout/DevBanner.tsx` with:

```tsx
import { cn } from "@/lib/utils"

type BannerConfig = { text: string; className: string }

/**
 * Banner per `VITE_APP_ENV` value. The `bg-*` classes are written as literals
 * here so Tailwind's source scanner emits them — it cannot see classes that
 * only exist as a runtime lookup result.
 */
const ENV_BANNERS: Record<string, BannerConfig> = {
  "dev-preview": {
    text: "Asclepion 0.1 - This is a Development Preview. Do NOT upload any PII or other sensitive information.",
    className: "bg-warning",
  },
  "next-preview": {
    text: "Asclepion 0.1 - NEXT (staging). Unstable build. Do NOT upload any PII or other sensitive information.",
    className: "bg-info",
  },
}

/**
 * @description Resolves which environment banner (if any) to show, from
 * build-time env. Local dev takes precedence over the Coolify preview flags;
 * production (neither set) and unknown flag values return null.
 * @param env - Subset of import.meta.env
 */
export function resolveEnvBanner(env: {
  DEV?: boolean
  VITE_APP_ENV?: string
}): BannerConfig | null {
  if (env.DEV) {
    return { text: "Local Development Preview", className: "bg-warning" }
  }
  const flag = env.VITE_APP_ENV
  if (flag && flag in ENV_BANNERS) return ENV_BANNERS[flag]
  return null
}

/**
 * @description Full-width strip above the header identifying non-production
 * environments. Renders nothing in production.
 */
export function DevBanner() {
  const banner = resolveEnvBanner(import.meta.env)
  if (!banner) return null
  return (
    <div
      role="status"
      // `relative z-50` keeps the strip above viewport-anchored `fixed` page
      // chrome (e.g. the review page's shadcn sidebar, z-10) so it always spans
      // the full width — matching the navbar's own z-50.
      className={cn(
        "relative z-50 w-full px-4 py-1.5 text-center text-xs font-medium text-black",
        banner.className,
      )}
    >
      {banner.text}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/features/layout/DevBanner.test.tsx`

Expected: PASS — 12 tests passed.

- [ ] **Step 5: Verify types and lint are clean**

Run: `cd frontend && npx tsc -b && npx eslint src/features/layout/DevBanner.tsx src/features/layout/DevBanner.test.tsx`

Expected: no output from either (success).

- [ ] **Step 6: Parameterize the compose build arg**

In `docker-compose.coolify.yml`, change lines 10-11 from:

```yaml
      args:
        VITE_APP_ENV: dev-preview
```

to:

```yaml
      args:
        # Selects the DevBanner variant. Defaults to dev-preview so the `dev`
        # resource is unchanged; the `next` resource sets next-preview. In
        # Coolify this MUST be marked a BUILD variable — Vite bakes it in at
        # build time, so a runtime variable silently does nothing.
        VITE_APP_ENV: ${VITE_APP_ENV:-dev-preview}
```

- [ ] **Step 7: Verify the default preserves `dev` behavior**

Run: `docker compose -f docker-compose.coolify.yml config 2>/dev/null | grep -A2 "args:"`

Expected: output contains `VITE_APP_ENV: dev-preview` — the unset default resolves to today's value.

Then run: `VITE_APP_ENV=next-preview docker compose -f docker-compose.coolify.yml config 2>/dev/null | grep -A2 "args:"`

Expected: output contains `VITE_APP_ENV: next-preview`.

> If `config` errors about required variables (`BETTER_AUTH_SECRET is required`, etc.), that is the `${VAR:?}` guard firing and is unrelated to this step — prefix the command with dummy values, e.g.
> `BETTER_AUTH_SECRET=x ADMIN_SECRET=x INTERNAL_SECRET_HEADER=x SEED_PASSWORD=x POSTGRES_PASSWORD=x docker compose -f docker-compose.coolify.yml config`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/layout/DevBanner.tsx frontend/src/features/layout/DevBanner.test.tsx docker-compose.coolify.yml
git commit -m "$(cat <<'EOF'
feat(layout): key the env banner on VITE_APP_ENV so next is distinct from dev (VMP-173)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Single-secret DB config

Removes the `POSTGRES_DB`/`POSTGRES_USER`/DSN footgun that already broke the first `dev` deploy (a generated `POSTGRES_DB` created a hex-named database; the backend failed repeatedly with `database "angelman" does not exist`). Standing up `next` means filling that five-variable block a second time by hand — this reduces it to one secret before that happens.

**Files:**
- Modify: `docker-compose.coolify.yml:29-31` (backend DSNs), `:54-67` (postgres service), and add a top-level anchor
- Modify: `.env.coolify.example:9-33`
- Modify: `README.md:273-290`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: compose no longer reads `POSTGRES_USER`, `POSTGRES_DB`, `DATABASE_URL`, `LOCAL_DATABASE_URL`, or `DIRECT_DATABASE_URL` from the environment. Task 3's `next` env template must therefore not define them.

> **Safety note:** this is the only change in the plan that reaches `dev`. It is a no-op there **because** `dev`'s existing volume was confirmed on 2026-07-15 to use `angelman` for both user and database. Do not change the literal to anything else.

- [ ] **Step 1: Add the DSN anchor**

In `docker-compose.coolify.yml`, insert immediately after the header comment block and **before** the `services:` key (i.e. between current lines 4 and 5):

```yaml
# Single source of truth for the DB connection string. POSTGRES_PASSWORD is the
# only DB secret; the user and database names are fixed literals (`angelman`),
# matching the postgres service below. An anchor keeps the three DSNs from
# drifting apart — they must be identical.
x-database-url: &database-url postgres://angelman:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}@postgres:5432/angelman

```

- [ ] **Step 2: Point the backend DSNs at the anchor**

In `docker-compose.coolify.yml`, replace these three lines in the `backend` service's `environment:` block:

```yaml
      DATABASE_URL: ${DATABASE_URL}
      LOCAL_DATABASE_URL: ${LOCAL_DATABASE_URL}
      DIRECT_DATABASE_URL: ${DIRECT_DATABASE_URL}
```

with:

```yaml
      # Under LOCAL=true both prisma.ts and prisma.config.ts read
      # LOCAL_DATABASE_URL; the other two are set identically as safe defaults.
      DATABASE_URL: *database-url
      LOCAL_DATABASE_URL: *database-url
      DIRECT_DATABASE_URL: *database-url
```

- [ ] **Step 3: Make the postgres service use literals**

In `docker-compose.coolify.yml`, replace the `postgres` service's `environment:` and `healthcheck:` blocks:

```yaml
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
```

with:

```yaml
    environment:
      # Fixed identifiers, NOT secrets. They are only applied on the volume's
      # FIRST init, so changing them later strands the existing database and
      # requires wiping postgres_data. They must stay in sync with the
      # x-database-url anchor above.
      POSTGRES_USER: angelman
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
      POSTGRES_DB: angelman
```

and replace the healthcheck test line:

```yaml
      test: ["CMD", "pg_isready", "-U", "${POSTGRES_USER}"]
```

with:

```yaml
      test: ["CMD", "pg_isready", "-U", "angelman"]
```

- [ ] **Step 4: Verify the resolved config**

Run:

```bash
BETTER_AUTH_SECRET=x ADMIN_SECRET=x INTERNAL_SECRET_HEADER=x SEED_PASSWORD=x \
POSTGRES_PASSWORD=testpw123 MINIO_ROOT_USER=x MINIO_ROOT_PASSWORD=xxxxxxxx \
S3_ENDPOINT=http://minio:9000 S3_BUCKET_NAME=b ALLOWED_ORIGIN=http://x \
FRONTEND_URL=http://x BETTER_AUTH_URL=http://x \
docker compose -f docker-compose.coolify.yml config | grep -E "DATABASE_URL|POSTGRES_(USER|DB)|pg_isready"
```

Expected: all three DSNs resolve identically to
`postgres://angelman:testpw123@postgres:5432/angelman`, `POSTGRES_USER: angelman`,
`POSTGRES_DB: angelman`, and the healthcheck shows `pg_isready -U angelman`.

- [ ] **Step 5: Verify the password guard fires**

Run:

```bash
BETTER_AUTH_SECRET=x ADMIN_SECRET=x INTERNAL_SECRET_HEADER=x SEED_PASSWORD=x \
docker compose --env-file /dev/null -f docker-compose.coolify.yml config >/dev/null; echo "exit=$?"
```

Expected: a non-zero exit and an error mentioning `POSTGRES_PASSWORD is required`. An empty password must fail the deploy rather than boot a passwordless database.

> **`--env-file /dev/null` is required and is not optional cosmetics.** `docker
> compose` auto-loads the repo root's `.env` regardless of `-f`, and that file
> sets `POSTGRES_PASSWORD=postgres` for the unrelated local `docker-compose.yml`
> stack. Without the isolation this command exits 0 and the check **passes for the
> wrong reason**, telling you a guard works when you have not tested it. The
> Coolify host has no such root `.env`, so the guard does fire there.

- [ ] **Step 6: Update the env template**

In `.env.coolify.example`, replace the header note (lines 9-12):

```dotenv
# Replace every <...> placeholder. Generate secrets with: openssl rand -base64 32
# EXCEPTION: POSTGRES_PASSWORD is embedded in the postgres:// DSNs below, so it
# must be URL-safe — generate it with `openssl rand -hex 32` (base64 can emit
# / + = which break the DSN). Use the SAME value in all three DSNs.
```

with:

```dotenv
# Replace every <...> placeholder. Generate secrets with: openssl rand -base64 32
# EXCEPTION: POSTGRES_PASSWORD must be URL-safe — the compose file interpolates
# it into the postgres:// DSN — so generate it with `openssl rand -hex 32`
# (base64 can emit / + = which break the DSN).
```

Then replace the whole Postgres block (lines 24-33):

```dotenv
# ── Postgres (containerized, persistent volume) ─────────────────────────────
POSTGRES_USER=angelman
POSTGRES_PASSWORD=<generate: openssl rand -hex 32 — URL-safe, embedded in DSNs below>
POSTGRES_DB=angelman
# Both point at the compose "postgres" service. Under LOCAL=true, both
# prisma.ts and prisma.config.ts use LOCAL_DATABASE_URL. DATABASE_URL/
# DIRECT_DATABASE_URL are set to the same DSN as safe defaults.
DATABASE_URL=postgres://angelman:<generate>@postgres:5432/angelman
LOCAL_DATABASE_URL=postgres://angelman:<generate>@postgres:5432/angelman
DIRECT_DATABASE_URL=postgres://angelman:<generate>@postgres:5432/angelman
```

with:

```dotenv
# ── Postgres (containerized, persistent volume) ─────────────────────────────
# The ONLY DB variable. The user and database names are fixed literals
# (`angelman`) in docker-compose.coolify.yml, and the three DSNs are built from
# them there — do not set POSTGRES_USER, POSTGRES_DB, DATABASE_URL,
# LOCAL_DATABASE_URL, or DIRECT_DATABASE_URL here; compose ignores them.
POSTGRES_PASSWORD=<generate: openssl rand -hex 32 — URL-safe, interpolated into the DSN>
```

- [ ] **Step 7: Update the README**

In `README.md`, replace the two bullets at lines 273-290 (from `- **Generate these secrets**` through `Leave \`SES_FROM_EMAIL\` unset.`) with:

```markdown
   - **Generate these secrets** with `openssl rand -base64 32`:
     `BETTER_AUTH_SECRET`, `ADMIN_SECRET`, `INTERNAL_SECRET_HEADER`,
     `SEED_PASSWORD`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`. Generate
     `POSTGRES_PASSWORD` with `openssl rand -hex 32` instead — the compose file
     interpolates it into the DB connection URL, so it must be URL-safe (base64
     can emit `/ + =`).
   - **`POSTGRES_PASSWORD` is the only DB variable you set.** The user and
     database names are fixed literals (`angelman`) in
     `docker-compose.coolify.yml`, and all three DSNs
     (`DATABASE_URL` / `LOCAL_DATABASE_URL` / `DIRECT_DATABASE_URL`) are built
     from them by a YAML anchor. Do not set `POSTGRES_USER`, `POSTGRES_DB`, or
     any DSN in Coolify — compose ignores them.
   - Set `ALLOWED_ORIGIN` / `FRONTEND_URL` / `BETTER_AUTH_URL` to
     `https://dev.<domain>` and `S3_ENDPOINT` to `https://s3.dev.<domain>`.
     Leave `SES_FROM_EMAIL` unset.
```

- [ ] **Step 8: Commit**

```bash
git add docker-compose.coolify.yml .env.coolify.example README.md
git commit -m "$(cat <<'EOF'
refactor(coolify): reduce DB config to a single POSTGRES_PASSWORD secret (VMP-173)

Bake angelman in as the literal Postgres user/database and build all three DSNs
from a YAML anchor. Removes the POSTGRES_DB footgun that broke the first dev
deploy and de-risks running a second environment off the same compose file.

No-op for dev: its volume already uses angelman/angelman (confirmed 2026-07-15).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `next` env template and deployment docs

Gives the operator an exact, copyable env set for the `next` Coolify resource and documents the deploy-pointer workflow.

**Files:**
- Create: `.env.coolify.next.example`
- Modify: `.gitignore` — add `!.env.coolify.next.example`
- Modify: `README.md` (append a new `## Deploying to Coolify (next)` section after the `### Notes` block that currently ends the develop section at line 336)

> **The `.gitignore` negation is required, not optional.** A blanket `.env.*` rule
> (`.gitignore:10`) would otherwise make the new template silently uncommittable —
> `git add` would refuse it and the file would never ship. Mirror the existing
> `!.env.coolify.example` negation immediately above it.

**Interfaces:**
- Consumes: `VITE_APP_ENV=next-preview` (Task 1); the single-secret DB config (Task 2) — this template must NOT define `POSTGRES_USER`, `POSTGRES_DB`, or any DSN.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Create the `next` env template**

Create `.env.coolify.next.example` with exactly:

```bash
# ============================================================================
# Coolify "next" deployment — environment template.
#
# `next` is a SECOND long-lived Coolify resource, separate from `dev`. It exists
# so changes can be seen running without redeploying dev.asclepion.cs4535.cloud
# while clients are testing against it. Same compose file, same machinery —
# only these values differ. See
# docs/superpowers/specs/2026-07-15-next-coolify-deployment-design.md
#
# Shared explanation of each variable lives in .env.coolify.example; this file
# documents only what differs for `next`. Paste these into the Coolify UI.
#
# EVERY SECRET BELOW MUST BE NEWLY GENERATED — do not copy dev's values. Separate
# secrets mean a leak in one environment does not reach the other.
# ============================================================================

# ── Core mode (identical to dev) ────────────────────────────────────────────
LOCAL=true
NODE_ENV=development
PORT=8080

# ── Banner ──────────────────────────────────────────────────────────────────
# Selects the blue "NEXT (staging)" DevBanner instead of dev's amber one.
# In Coolify this MUST be marked a BUILD variable — Vite bakes it in at build
# time, so a runtime variable silently does nothing and `next` would wear dev's
# banner.
VITE_APP_ENV=next-preview

# ── Postgres ────────────────────────────────────────────────────────────────
# The ONLY DB variable. User/database are fixed literals (`angelman`) in
# docker-compose.coolify.yml. Do NOT set POSTGRES_USER, POSTGRES_DB, or any DSN.
POSTGRES_PASSWORD=<generate: openssl rand -hex 32 — URL-safe>

# ── App origin / auth ───────────────────────────────────────────────────────
ALLOWED_ORIGIN=https://next.asclepion.cs4535.cloud
FRONTEND_URL=https://next.asclepion.cs4535.cloud
BETTER_AUTH_URL=https://next.asclepion.cs4535.cloud
BETTER_AUTH_SECRET=<generate: openssl rand -base64 32>
ADMIN_SECRET=<generate: openssl rand -base64 32>
INTERNAL_SECRET_HEADER=<generate: openssl rand -base64 32>

# ── Seed ────────────────────────────────────────────────────────────────────
SEED_PASSWORD=<generate: openssl rand -base64 32>

# ── MinIO object store ──────────────────────────────────────────────────────
MINIO_ROOT_USER=<generate: openssl rand -base64 32>
MINIO_ROOT_PASSWORD=<generate: openssl rand -base64 32>
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=${MINIO_ROOT_USER}
AWS_SECRET_ACCESS_KEY=${MINIO_ROOT_PASSWORD}
# The browser signs/uploads/streams against this EXACT host — it must be the
# real public next MinIO hostname or SigV4 host validation fails.
S3_ENDPOINT=https://s3.next.asclepion.cs4535.cloud
S3_BUCKET_NAME=angelman-videos-next

# ── Email ───────────────────────────────────────────────────────────────────
# SES_FROM_EMAIL is intentionally OMITTED -> log-only email. Do not set it.
```

- [ ] **Step 2: Verify the template defines no DB vars compose ignores**

Run: `grep -nE "^(POSTGRES_USER|POSTGRES_DB|DATABASE_URL|LOCAL_DATABASE_URL|DIRECT_DATABASE_URL)=" .env.coolify.next.example; echo "exit=$?"`

Expected: no matches, `exit=1`.

- [ ] **Step 3: Append the README section**

Append to the end of `README.md`:

````markdown
## Deploying to Coolify (next)

`next` is a **second long-lived Coolify deployment** at
`next.asclepion.cs4535.cloud`, separate from `dev`. It exists so changes can be
seen running **without redeploying `dev`** while clients are user-testing there.
It reuses `docker-compose.coolify.yml` unchanged — only the environment differs.
See `docs/superpowers/specs/2026-07-15-next-coolify-deployment-design.md`.

### `next` is a deploy pointer, not a branch you work on

Coolify watches the long-lived `next` branch and redeploys on push. You never
change the branch in the Coolify UI — you force-push at the pointer instead:

```bash
git push -f origin HEAD:next                   # deploy what I'm working on
git push -f origin vmp-174-some-feature:next   # deploy a specific branch
git push -f origin develop:next                # reset to develop
```

**Rules:**

1. **Never merge `next` into anything.** Its history is a series of force-pushes
   from unrelated branches. It is a deploy target, not a source of truth.
2. Never open a PR against it; never branch off it.
3. `git push -f origin develop:next` is the reset button — safe any time, since
   there is no state on the branch to lose.

This gives one preview at a time, which is what solo iteration needs.

### DNS

Point two hostnames at the Coolify server:
- `next.asclepion.cs4535.cloud` — the app (frontend).
- `s3.next.asclepion.cs4535.cloud` — the MinIO S3 API (the browser
  uploads/streams here directly).

### One-time Coolify setup

1. **Create the pointer branch:** `git push origin develop:next`.
2. **Create the resource:** New Resource → Docker Compose → this repo, branch
   `next`, compose file `docker-compose.coolify.yml`. (Cloning the `dev` resource
   also works — but then clear every secret; they must not be shared.)
3. **Environment variables:** use `.env.coolify.next.example`. Generate **fresh**
   secrets; do not copy dev's.
4. **Mark `VITE_APP_ENV` as a BUILD variable** (value `next-preview`). Vite bakes
   it in at build time — as a runtime variable it silently does nothing and
   `next` renders dev's amber banner.
5. **Domains:**
   - `frontend` → `https://next.asclepion.cs4535.cloud` (container port 80).
   - `minio` → `https://s3.next.asclepion.cs4535.cloud` (container port **9000**
     only — do NOT expose the 9001 console publicly).
6. **Auto-deploy:** enable automatic deployment for the `next` branch, via the
   same Coolify GitHub App that already serves `develop`.

### Smoke test

1. Visit `https://next.asclepion.cs4535.cloud` — confirm the **blue** "NEXT
   (staging)" banner. Amber means `VITE_APP_ENV` was set as a runtime variable
   instead of a build variable.
2. Log in as `admin@local.dev` with the **`next`** `SEED_PASSWORD`.
3. Upload a video and play it back (exercises the presigned round trip against
   `s3.next.asclepion.cs4535.cloud`).
4. `git push -f origin develop:next` and confirm Coolify redeploys with no UI
   interaction.

### Notes

- **`next` and `dev` share nothing at runtime** — separate volumes, buckets,
  seeded data, and secrets. `next` can be wrecked and rebuilt freely.
- **`next` is where infrastructure changes get proven first**, before they reach
  the client-facing `dev`.
````

- [ ] **Step 4: Commit**

```bash
git add .env.coolify.next.example README.md
git commit -m "$(cat <<'EOF'
docs(coolify): add next deployment env template and deploy-pointer workflow (VMP-173)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Local dry run

Proves the compose file actually boots with the new DSN anchor and literals **before** it reaches Coolify — specifically that Postgres initializes a database named `angelman` and the backend connects to it. This is the check that would have caught the original `database "angelman" does not exist` failure.

**Files:**
- Create: `<scratchpad>/.env.coolify.dryrun` (temporary, outside the repo — never committed)
- No repo files modified.

**Interfaces:**
- Consumes: the compose changes from Tasks 1 and 2.
- Produces: nothing — this is a verification gate.

> **Do not use the real `.env.coolify`.** Its `S3_ENDPOINT` points at
> `https://s3.dev.asclepion.cs4535.cloud`, so a local backend booted with it would
> write seed media into the **live client-facing dev bucket**. The dummy env file
> below keeps everything local and uses no real secrets.

> **Only the backend is built.** The frontend image is not needed — Task 1 Step 7
> already proved the build arg interpolates, and the banner is covered by unit
> tests. Skipping it saves a full Vite build.

- [ ] **Step 1: Write the dry-run env file**

Create `/tmp/claude-1000/-home-mark-Work-CS4535-video-review-system/6135d48e-aa3f-41ac-8e9c-a6189396fe22/scratchpad/.env.coolify.dryrun`:

```bash
LOCAL=true
NODE_ENV=development
PORT=8080
VITE_APP_ENV=next-preview
POSTGRES_PASSWORD=dryrun0123456789abcdef0123456789abcdef
ALLOWED_ORIGIN=http://localhost:8081
FRONTEND_URL=http://localhost:8081
BETTER_AUTH_URL=http://localhost:8081
BETTER_AUTH_SECRET=dryrun-not-a-real-secret-0123456789
ADMIN_SECRET=dryrun-not-a-real-secret-0123456789
INTERNAL_SECRET_HEADER=dryrun-not-a-real-secret-0123456789
SEED_PASSWORD=dryrun-not-a-real-password
MINIO_ROOT_USER=dryrunminio
MINIO_ROOT_PASSWORD=dryrunminiopassword
AWS_REGION=us-east-1
S3_ENDPOINT=http://minio:9000
S3_BUCKET_NAME=angelman-videos-dryrun
```

- [ ] **Step 2: Boot the backend and its dependencies**

Run (from the repo root; `-p` isolates this from any other compose project):

```bash
docker compose -p vmp173-dryrun \
  --env-file /tmp/claude-1000/-home-mark-Work-CS4535-video-review-system/6135d48e-aa3f-41ac-8e9c-a6189396fe22/scratchpad/.env.coolify.dryrun \
  -f docker-compose.coolify.yml up -d backend
```

Expected: builds the backend image, then starts `postgres`, `minio`, `minio-init`, and `backend`. `minio-init` exits 0; the others report started.

- [ ] **Step 3: Verify Postgres created the `angelman` database**

Run:

```bash
docker compose -p vmp173-dryrun \
  --env-file /tmp/claude-1000/-home-mark-Work-CS4535-video-review-system/6135d48e-aa3f-41ac-8e9c-a6189396fe22/scratchpad/.env.coolify.dryrun \
  -f docker-compose.coolify.yml exec -T postgres psql -U angelman -d angelman -c '\l'
```

Expected: connects successfully and lists a database named `angelman` owned by `angelman`. A `database "angelman" does not exist` error here means the literals and the anchor disagree — stop and fix before going further.

- [ ] **Step 4: Verify the backend migrated, seeded, and started**

Run:

```bash
docker compose -p vmp173-dryrun \
  --env-file /tmp/claude-1000/-home-mark-Work-CS4535-video-review-system/6135d48e-aa3f-41ac-8e9c-a6189396fe22/scratchpad/.env.coolify.dryrun \
  -f docker-compose.coolify.yml logs backend | tail -40
```

Expected: `prisma migrate deploy` applies migrations (or reports none pending), the seed runs against the empty database, and the server reports listening on port 8080. There must be **no** `does not exist`, `authentication failed`, or `ECONNREFUSED` errors against Postgres.

- [ ] **Step 5: Confirm the seeded data landed**

Run:

```bash
docker compose -p vmp173-dryrun \
  --env-file /tmp/claude-1000/-home-mark-Work-CS4535-video-review-system/6135d48e-aa3f-41ac-8e9c-a6189396fe22/scratchpad/.env.coolify.dryrun \
  -f docker-compose.coolify.yml exec -T postgres psql -U angelman -d angelman -c 'SELECT count(*) FROM "user";'
```

Expected: a non-zero count — the seed wrote through the anchor-built DSN.

> The table is `"user"` (singular — the Better Auth convention, `@@map("user")` at
> `backend/prisma/schema.prisma:105`), and the double quotes are **required**:
> `user` is a reserved word in Postgres, so an unquoted `FROM user` parses as the
> `USER` keyword and fails with a syntax error rather than counting rows.

- [ ] **Step 6: Tear down, including volumes**

Run:

```bash
docker compose -p vmp173-dryrun \
  --env-file /tmp/claude-1000/-home-mark-Work-CS4535-video-review-system/6135d48e-aa3f-41ac-8e9c-a6189396fe22/scratchpad/.env.coolify.dryrun \
  -f docker-compose.coolify.yml down -v
```

Expected: containers removed and the `vmp173-dryrun` volumes deleted. `-v` is safe here **only** because `-p vmp173-dryrun` scopes it to this throwaway project — it does not touch your local `docker-compose.yml` stack.

- [ ] **Step 7: Confirm nothing was committed from the dry run**

Run: `git status --porcelain`

Expected: empty. The dry-run env file lives in the scratchpad, not the repo.

---

## Post-implementation: operator steps

Not code — these are yours to do, in this order, after the PR merges:

1. Add the two DNS records: `next.asclepion.cs4535.cloud` and
   `s3.next.asclepion.cs4535.cloud`.
2. `git push origin develop:next` to create the pointer branch.
3. Create the Coolify resource per `README.md` → "Deploying to Coolify (next)",
   using `.env.coolify.next.example`. Remember `VITE_APP_ENV` is a **build**
   variable.
4. Deploy and run the `next` smoke test (blue banner, login, upload, playback).
5. Confirm `dev` still boots after the merge, still shows its **amber** banner,
   and its data survived. The DB change is expected to be a no-op there.

## Verification checklist

- [ ] `cd frontend && npx vitest run` — full suite passes
- [ ] `cd frontend && npx tsc -b` — clean
- [ ] `cd frontend && npx eslint .` — clean
- [ ] Task 4 dry run boots with the `angelman` database and a seeded user count
- [ ] `docker compose -f docker-compose.coolify.yml config` with no `VITE_APP_ENV` still resolves `dev-preview`
- [ ] `git grep -n "POSTGRES_USER\|POSTGRES_DB" -- .env.coolify.example .env.coolify.next.example` returns nothing
