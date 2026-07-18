# Version / Release Numbering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every build a traceable, human-legible version `{base}+{channel}.{shortSHA}`, surface it in GlitchTip and the frontend, with zero CI and zero secrets.

**Architecture:** A committed root `/VERSION` holds the SemVer base. Both apps assemble the full string from that base + Coolify's `SOURCE_COMMIT`/`COOLIFY_BRANCH`. Backend reads them at runtime; frontend bakes them at Vite build time via Docker build args. The full string feeds `Sentry.init({ release })` and an `<AppVersion />` UI. A `/api/version` endpoint exposes the backend's version for a FE↔BE skew badge + reload nudge.

**Tech Stack:** Backend = Node 22 + Express 5 + TypeScript (ESM) + Vitest/supertest. Frontend = React 19 + Vite + TypeScript + Vitest/@testing-library. Deploy = Coolify (Docker Compose), no GitHub Actions.

## Global Constraints

- **Full version format (verbatim, identical in FE + BE):** `` `${base}+${channel}.${short}` `` where `channel = (branch ?? "").trim() || "local"` and `short = (commit ?? "").trim() ? commit.trim().slice(0, 7) : "local"`. Base defaults to `"0.0.0"` when unresolved.
- **GlitchTip release string:** `` `vmp@${fullVersion}` `` (e.g. `vmp@0.1.0+next.a1b2c3d`). `environment` stays the channel — unchanged from today.
- **Starting base version:** `/VERSION` file contains exactly `0.1.0` (one line, newline-terminated).
- **GitHub commit URL base:** `https://github.com/KhourySpecialProjects/video-review-system/commit/` + full commit SHA.
- **Format is intentionally duplicated** in `backend/src/lib/version.ts` and `frontend/src/lib/version.ts`. Each file carries a comment: `// KEEP IN SYNC with the other app's version.ts — see docs/superpowers/specs/2026-07-18-version-release-numbering-design.md`. Both test suites assert the same canonical example so a format change is a visible, deliberate edit.
- **Do NOT** add a GitHub Action, Coolify deploy token, or webhook. **Do NOT** touch the Coolify dashboard, cut a GitHub Release, or set a live DSN — those are the operator's manual steps.
- Backend has **no `lint` script**; its gate is `npm test` (`vitest run`) + `npm run build` (`tsc`). Frontend gate is `npm run build` (`tsc -b && vite build`), `npm run lint` (`eslint .`), `npm test` (`vitest run`).

---

### Task 1: Root `/VERSION` + backend version module + `/api/version` endpoint (VMP-182)

**Files:**
- Create: `/VERSION`
- Create: `backend/src/lib/version.ts`
- Test: `backend/src/__tests__/unit/version.test.ts`
- Modify: `backend/src/index.ts` (add route next to `/api/health` at line 56-58)
- Modify: `backend/src/__tests__/http/app.test.ts` (add a `/api/version` test mirroring the `/api/health` test)

**Interfaces:**
- Produces:
  - `interface VersionInfo { version: string; base: string; branch: string; commit: string; shortCommit: string; builtAt: string | null }`
  - `composeVersion(base: string, branch?: string, commit?: string): string`
  - `resolveVersionInfo(input: { base: string; branch?: string; commit?: string; builtAt?: string | null }): VersionInfo` — pure.
  - `getVersionInfo(): VersionInfo` — impure; reads `/VERSION`, `process.env.SOURCE_COMMIT`, `process.env.COOLIFY_BRANCH`, and an optional build-stamp file.
  - `GET /api/version` → `VersionInfo` JSON, unauthenticated, declared before the domain-router mounts.

- [ ] **Step 1: Create the VERSION file**

Create `/VERSION` with exactly:
```
0.1.0
```

- [ ] **Step 2: Write the failing unit test**

Create `backend/src/__tests__/unit/version.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { composeVersion, resolveVersionInfo } from "../../lib/version.js";

describe("composeVersion", () => {
  it("composes base + channel + short sha (canonical example)", () => {
    expect(composeVersion("0.1.0", "next", "a1b2c3d4e5f6")).toBe("0.1.0+next.a1b2c3d");
  });
  it("falls back to local channel and local short when branch/commit are empty", () => {
    expect(composeVersion("0.1.0", "", "")).toBe("0.1.0+local.local");
    expect(composeVersion("0.1.0")).toBe("0.1.0+local.local");
  });
  it("trims whitespace-only branch/commit to the fallbacks", () => {
    expect(composeVersion("0.1.0", "  ", "  ")).toBe("0.1.0+local.local");
  });
});

describe("resolveVersionInfo", () => {
  it("returns a fully-populated VersionInfo", () => {
    const info = resolveVersionInfo({
      base: "0.1.0",
      branch: "develop",
      commit: "abcdef1234567890",
      builtAt: "2026-07-18T00:00:00Z",
    });
    expect(info).toEqual({
      version: "0.1.0+develop.abcdef1",
      base: "0.1.0",
      branch: "develop",
      commit: "abcdef1234567890",
      shortCommit: "abcdef1",
      builtAt: "2026-07-18T00:00:00Z",
    });
  });
  it("normalizes empty branch/commit and null builtAt", () => {
    const info = resolveVersionInfo({ base: "0.1.0" });
    expect(info.version).toBe("0.1.0+local.local");
    expect(info.branch).toBe("local");
    expect(info.commit).toBe("");
    expect(info.shortCommit).toBe("local");
    expect(info.builtAt).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npm test -- version`
Expected: FAIL — cannot find module `../../lib/version.js`.

- [ ] **Step 4: Write `backend/src/lib/version.ts`**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// KEEP IN SYNC with frontend/src/lib/version.ts — see
// docs/superpowers/specs/2026-07-18-version-release-numbering-design.md

export interface VersionInfo {
  /** Full release string, e.g. "0.1.0+next.a1b2c3d". */
  version: string;
  /** SemVer base from /VERSION, e.g. "0.1.0". */
  base: string;
  /** Deploy channel (git branch), or "local". */
  branch: string;
  /** Full commit SHA, or "" when unknown. */
  commit: string;
  /** First 7 chars of the SHA, or "local". */
  shortCommit: string;
  /** ISO build timestamp, or null when not stamped. */
  builtAt: string | null;
}

/** Compose the full version string. Pure. Format is duplicated in the frontend. */
export function composeVersion(base: string, branch?: string, commit?: string): string {
  const channel = (branch ?? "").trim() || "local";
  const trimmedCommit = (commit ?? "").trim();
  const short = trimmedCommit ? trimmedCommit.slice(0, 7) : "local";
  return `${base}+${channel}.${short}`;
}

/** Build a VersionInfo from already-resolved parts. Pure. */
export function resolveVersionInfo(input: {
  base: string;
  branch?: string;
  commit?: string;
  builtAt?: string | null;
}): VersionInfo {
  const base = input.base.trim() || "0.0.0";
  const branch = (input.branch ?? "").trim() || "local";
  const commit = (input.commit ?? "").trim();
  const shortCommit = commit ? commit.slice(0, 7) : "local";
  return {
    version: composeVersion(base, branch, commit),
    base,
    branch,
    commit,
    shortCommit,
    builtAt: input.builtAt ?? null,
  };
}

/** Read the base from /VERSION across dev (cwd=backend/) and Docker (cwd=/app). */
function readVersionBase(): string {
  const candidates = [
    resolve(process.cwd(), "VERSION"), // Docker runtime: /app/VERSION
    resolve(process.cwd(), "../VERSION"), // local dev: repo-root VERSION
  ];
  for (const path of candidates) {
    try {
      const contents = readFileSync(path, "utf8").trim();
      if (contents) return contents;
    } catch {
      // try next candidate
    }
  }
  return "0.0.0";
}

/** Read the Docker build timestamp, if the image stamped one. */
function readBuiltAt(): string | null {
  const candidates = [
    resolve(process.cwd(), "BUILD_TIME"),
    resolve(process.cwd(), "../BUILD_TIME"),
  ];
  for (const path of candidates) {
    try {
      const contents = readFileSync(path, "utf8").trim();
      if (contents) return contents;
    } catch {
      // try next candidate
    }
  }
  return null;
}

/** Resolve the running app's version from the filesystem + Coolify env. Impure. */
export function getVersionInfo(): VersionInfo {
  return resolveVersionInfo({
    base: readVersionBase(),
    branch: process.env.COOLIFY_BRANCH,
    commit: process.env.SOURCE_COMMIT,
    builtAt: readBuiltAt(),
  });
}
```

- [ ] **Step 5: Run unit test to verify it passes**

Run: `cd backend && npm test -- version`
Expected: PASS (6 assertions).

- [ ] **Step 6: Write the failing endpoint test**

In `backend/src/__tests__/http/app.test.ts`, add next to the existing `/api/health` test:
```ts
it("GET /api/version returns the version payload", async () => {
  const app = await getApp();
  const response = await request(app).get("/api/version");
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({
    version: expect.any(String),
    base: expect.any(String),
    branch: expect.any(String),
    commit: expect.any(String),
    shortCommit: expect.any(String),
  });
  expect(response.body).toHaveProperty("builtAt");
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `cd backend && npm test -- app`
Expected: FAIL — 404 (route not defined).

- [ ] **Step 8: Add the route in `backend/src/index.ts`**

Add the import near the other `./lib` imports at the top of the file:
```ts
import { getVersionInfo } from "./lib/version.js";
```
Add the route immediately after the `/api/health` handler (currently `index.ts:56-58`), before the domain-router `app.use(...)` mounts:
```ts
// version info (no auth required)
app.get("/api/version", (req, res) => {
  res.json(getVersionInfo());
});
```

- [ ] **Step 9: Run the endpoint test to verify it passes**

Run: `cd backend && npm test -- app`
Expected: PASS.

- [ ] **Step 10: Full backend gate**

Run: `cd backend && npm run build && npm test`
Expected: build clean, all tests pass.

- [ ] **Step 11: Commit**

```bash
git add VERSION backend/src/lib/version.ts backend/src/__tests__/unit/version.test.ts backend/src/index.ts backend/src/__tests__/http/app.test.ts
git commit -m "feat(version): add /VERSION, backend version module + /api/version (VMP-182)"
```

---

### Task 2: Backend Dockerfiles — COPY VERSION + stamp BUILD_TIME (VMP-182)

**Files:**
- Modify: `backend/Dockerfile.coolify` (runtime stage — the deployed image)
- Modify: `backend/Dockerfile` (AWS/prod image — parity)

**Interfaces:**
- Consumes: `/VERSION` (Task 1). Produces: `/app/VERSION` + `/app/BUILD_TIME` in the runtime image, read by `getVersionInfo()`.

- [ ] **Step 1: Add COPY + stamp to `backend/Dockerfile.coolify`**

In the **runtime** stage (the second `FROM node:22-alpine`, `WORKDIR /app`), add after the `COPY --from=builder ... ./src` line and before the entrypoint copy:
```dockerfile
# Version metadata read at runtime by src/lib/version.ts. SOURCE_COMMIT and
# COOLIFY_BRANCH arrive as runtime env from Coolify; VERSION + BUILD_TIME are baked here.
COPY VERSION ./VERSION
RUN date -u +"%Y-%m-%dT%H:%M:%SZ" > ./BUILD_TIME
```

- [ ] **Step 2: Mirror into `backend/Dockerfile` (prod parity)**

Read `backend/Dockerfile`; in its final runtime stage (whatever runs `node dist/index.js`), add the same two lines with the `COPY VERSION ./VERSION` path relative to that Dockerfile's build context. If the prod build context is NOT the repo root, adjust the source path accordingly and note it in the commit message. If uncertain, add the lines and flag it for review rather than guessing.

- [ ] **Step 3: Verify the Dockerfile parses (build the runtime image if Docker is available)**

Run: `docker build -f backend/Dockerfile.coolify -t vmp-backend-version-check . && docker run --rm --entrypoint sh vmp-backend-version-check -c 'cat /app/VERSION; echo; cat /app/BUILD_TIME'`
Expected: prints `0.1.0` then an ISO timestamp. If Docker is unavailable, note that and rely on review.

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile.coolify backend/Dockerfile
git commit -m "build(version): bake VERSION + BUILD_TIME into backend images (VMP-182)"
```

---

### Task 3: Backend telemetry `release` (VMP-184)

**Files:**
- Modify: `backend/src/lib/telemetry.ts` (add `release` to `TelemetryConfig` + `resolveTelemetryConfig`, pass into `Sentry.init`)
- Modify: `backend/src/instrument.ts` (wire the resolved version into the config)
- Test: `backend/src/lib/telemetry.test.ts` (create if absent; else extend the existing telemetry test)

**Interfaces:**
- Consumes: `getVersionInfo()` from Task 1.
- Produces: `resolveTelemetryConfig(env, versionString?)` — pure; `release = "vmp@" + (versionString ?? "unknown")`.

- [ ] **Step 1: Write/extend the failing test**

Add to the telemetry test (mirror the pattern in `frontend/src/lib/telemetry/config.test.ts` — pure function, explicit env):
```ts
it("sets release from the provided version string", () => {
  const c = resolveTelemetryConfig({ SENTRY_DSN: "https://x@h/1" } as NodeJS.ProcessEnv, "0.1.0+next.a1b2c3d");
  expect(c.release).toBe("vmp@0.1.0+next.a1b2c3d");
});
it("defaults release to vmp@unknown when no version string is given", () => {
  const c = resolveTelemetryConfig({ SENTRY_DSN: "https://x@h/1" } as NodeJS.ProcessEnv);
  expect(c.release).toBe("vmp@unknown");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && npm test -- telemetry`
Expected: FAIL — `release` undefined / property missing.

- [ ] **Step 3: Update `backend/src/lib/telemetry.ts`**

Add `release: string` to the `TelemetryConfig` interface. Change the resolver signature and body:
```ts
export function resolveTelemetryConfig(
  env: NodeJS.ProcessEnv,
  versionString?: string,
): TelemetryConfig {
  const dsn = (env.SENTRY_DSN ?? "").trim();
  return {
    enabled: dsn.length > 0,
    dsn,
    environment: env.SENTRY_ENVIRONMENT?.trim() || "unknown",
    privacyMode: env.TELEMETRY_PRIVACY === "full" ? "full" : "scrubbed",
    release: `vmp@${versionString ?? "unknown"}`,
  };
}
```
In `initTelemetry`, add `release: config.release,` inside the `Sentry.init({ ... })` object.

- [ ] **Step 4: Wire the version into `backend/src/instrument.ts`**

```ts
import { initTelemetry, resolveTelemetryConfig } from "./lib/telemetry.js";
import { getVersionInfo } from "./lib/version.js";

initTelemetry(resolveTelemetryConfig(process.env, getVersionInfo().version));
```

- [ ] **Step 5: Run tests + build**

Run: `cd backend && npm test -- telemetry && npm run build`
Expected: PASS, build clean.

- [ ] **Step 6: Commit**

```bash
git add backend/src/lib/telemetry.ts backend/src/instrument.ts backend/src/lib/telemetry.test.ts
git commit -m "feat(telemetry): tag GlitchTip release with app version, backend (VMP-184)"
```

---

### Task 4: Frontend version lib + env types (VMP-183)

**Files:**
- Create: `frontend/src/lib/version.ts`
- Test: `frontend/src/lib/version.test.ts`
- Modify: `frontend/src/vite-env.d.ts` (add version env keys)

**Interfaces:**
- Produces:
  - `interface VersionInfo { version; base; branch; commit; shortCommit; builtAt: string | null }` (same shape as backend)
  - `composeVersion(base, branch?, commit?): string`
  - `resolveVersionInfo(env): VersionInfo` — pure, reads `VITE_APP_VERSION_BASE`, `VITE_APP_BRANCH`, `VITE_APP_COMMIT`, `VITE_APP_BUILT_AT`.
  - `appVersion: VersionInfo` = `resolveVersionInfo(import.meta.env)`.
  - `fetchBackendVersion(): Promise<VersionInfo | null>` — `GET /api/version`, returns null on any failure.
  - `commitUrl(commit: string): string`.

- [ ] **Step 1: Add env keys to `frontend/src/vite-env.d.ts`**

Add inside `interface ImportMetaEnv`:
```ts
  readonly VITE_APP_VERSION_BASE?: string
  readonly VITE_APP_BRANCH?: string
  readonly VITE_APP_COMMIT?: string
  readonly VITE_APP_BUILT_AT?: string
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/lib/version.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { composeVersion, resolveVersionInfo, commitUrl } from "./version"

describe("composeVersion", () => {
  it("composes base + channel + short sha (canonical example)", () => {
    expect(composeVersion("0.1.0", "next", "a1b2c3d4e5f6")).toBe("0.1.0+next.a1b2c3d")
  })
  it("falls back to local when branch/commit are empty", () => {
    expect(composeVersion("0.1.0", "", "")).toBe("0.1.0+local.local")
  })
})

describe("resolveVersionInfo", () => {
  it("reads baked VITE_APP_* env into a VersionInfo", () => {
    const info = resolveVersionInfo({
      VITE_APP_VERSION_BASE: "0.1.0",
      VITE_APP_BRANCH: "develop",
      VITE_APP_COMMIT: "abcdef1234567890",
      VITE_APP_BUILT_AT: "2026-07-18T00:00:00Z",
    })
    expect(info).toEqual({
      version: "0.1.0+develop.abcdef1",
      base: "0.1.0",
      branch: "develop",
      commit: "abcdef1234567890",
      shortCommit: "abcdef1",
      builtAt: "2026-07-18T00:00:00Z",
    })
  })
  it("defaults everything for an empty env", () => {
    const info = resolveVersionInfo({})
    expect(info.version).toBe("0.0.0+local.local")
    expect(info.builtAt).toBeNull()
  })
})

describe("commitUrl", () => {
  it("builds a GitHub commit URL", () => {
    expect(commitUrl("abcdef1234567890")).toBe(
      "https://github.com/KhourySpecialProjects/video-review-system/commit/abcdef1234567890",
    )
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd frontend && npm test -- version`
Expected: FAIL — module not found.

- [ ] **Step 4: Write `frontend/src/lib/version.ts`**

```ts
// KEEP IN SYNC with backend/src/lib/version.ts — see
// docs/superpowers/specs/2026-07-18-version-release-numbering-design.md

const COMMIT_URL_BASE =
  "https://github.com/KhourySpecialProjects/video-review-system/commit/"

export interface VersionInfo {
  version: string
  base: string
  branch: string
  commit: string
  shortCommit: string
  builtAt: string | null
}

/** Compose the full version string. Pure. Format is duplicated in the backend. */
export function composeVersion(base: string, branch?: string, commit?: string): string {
  const channel = (branch ?? "").trim() || "local"
  const trimmedCommit = (commit ?? "").trim()
  const short = trimmedCommit ? trimmedCommit.slice(0, 7) : "local"
  return `${base}+${channel}.${short}`
}

/** Build a VersionInfo from baked build-time env. Pure. */
export function resolveVersionInfo(env: {
  VITE_APP_VERSION_BASE?: string
  VITE_APP_BRANCH?: string
  VITE_APP_COMMIT?: string
  VITE_APP_BUILT_AT?: string
}): VersionInfo {
  const base = (env.VITE_APP_VERSION_BASE ?? "").trim() || "0.0.0"
  const branch = (env.VITE_APP_BRANCH ?? "").trim() || "local"
  const commit = (env.VITE_APP_COMMIT ?? "").trim()
  const shortCommit = commit ? commit.slice(0, 7) : "local"
  const builtAt = (env.VITE_APP_BUILT_AT ?? "").trim() || null
  return { version: composeVersion(base, branch, commit), base, branch, commit, shortCommit, builtAt }
}

export function commitUrl(commit: string): string {
  return `${COMMIT_URL_BASE}${commit}`
}

/** The running app's baked version. */
export const appVersion: VersionInfo = resolveVersionInfo(import.meta.env)

/** Fetch the backend's version. Returns null on any failure (never throws). */
export async function fetchBackendVersion(): Promise<VersionInfo | null> {
  try {
    const res = await fetch("/api/version")
    if (!res.ok) return null
    return (await res.json()) as VersionInfo
  } catch {
    return null
  }
}
```

- [ ] **Step 5: Run test + typecheck**

Run: `cd frontend && npm test -- version && npm run build`
Expected: PASS, build clean.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/version.ts frontend/src/lib/version.test.ts frontend/src/vite-env.d.ts
git commit -m "feat(version): add frontend version lib + env types (VMP-183)"
```

---

### Task 5: Frontend telemetry `release` + boot log (VMP-184)

**Files:**
- Modify: `frontend/src/lib/telemetry/config.ts` (add `release` to `TelemetryConfig` + `resolveTelemetryConfig`)
- Modify: `frontend/src/lib/telemetry/init.ts` (pass `release` into `Sentry.init`)
- Modify: `frontend/src/main.tsx` (console.info the version on boot)
- Test: `frontend/src/lib/telemetry/config.test.ts` (extend)

**Interfaces:**
- Consumes: `composeVersion` from Task 4 (`frontend/src/lib/version.ts`).
- Produces: `TelemetryConfig.release`, resolved as `` `vmp@${composeVersion(base, branch, commit)}` `` from the baked env.

- [ ] **Step 1: Extend the failing test**

Add to `frontend/src/lib/telemetry/config.test.ts`:
```ts
it("sets release from the baked version env", () => {
  const c = resolveTelemetryConfig({
    VITE_GLITCHTIP_DSN: "https://x@h/1",
    VITE_APP_VERSION_BASE: "0.1.0",
    VITE_APP_BRANCH: "next",
    VITE_APP_COMMIT: "a1b2c3d4e5f6",
  })
  expect(c.release).toBe("vmp@0.1.0+next.a1b2c3d")
})
it("defaults release to vmp@0.0.0+local.local for an empty env", () => {
  expect(resolveTelemetryConfig({}).release).toBe("vmp@0.0.0+local.local")
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm test -- config`
Expected: FAIL — `release` missing.

- [ ] **Step 3: Update `frontend/src/lib/telemetry/config.ts`**

Add `release: string` to `TelemetryConfig`. Import at top: `import { composeVersion } from "../version"`. Extend the env param type with the three `VITE_APP_*` keys and add to the returned object:
```ts
    release: `vmp@${composeVersion(
      (env.VITE_APP_VERSION_BASE ?? "").trim() || "0.0.0",
      env.VITE_APP_BRANCH,
      env.VITE_APP_COMMIT,
    )}`,
```
(Keep the existing `enabled`/`dsn`/`environment`/`privacyMode` fields untouched.)

- [ ] **Step 4: Pass release into `Sentry.init` in `frontend/src/lib/telemetry/init.ts`**

Add `release: config.release,` inside the `Sentry.init({ ... })` object (after `environment: config.environment,`).

- [ ] **Step 5: Add the boot log in `frontend/src/main.tsx`**

After the existing `initTelemetry()` call (line 12), add:
```ts
import { appVersion } from "./lib/version"
// ...
console.info(`VMP ${appVersion.version}`)
```
(Place the import with the other imports; the `console.info` right after `initTelemetry()`.)

- [ ] **Step 6: Run tests + build**

Run: `cd frontend && npm test -- config && npm run build`
Expected: PASS, build clean.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/telemetry/config.ts frontend/src/lib/telemetry/init.ts frontend/src/main.tsx frontend/src/lib/telemetry/config.test.ts
git commit -m "feat(telemetry): tag GlitchTip release with app version, frontend (VMP-184)"
```

---

### Task 6: Frontend Dockerfile + compose build args (VMP-182)

**Files:**
- Modify: `frontend/Dockerfile` (add `ARG SOURCE_COMMIT`/`ARG COOLIFY_BRANCH`, COPY VERSION, bake `VITE_APP_*`)
- Modify: `docker-compose.coolify.yml` (add `SOURCE_COMMIT` + `COOLIFY_BRANCH` to the `frontend` service `build.args`)

**Interfaces:**
- Consumes: `/VERSION` (Task 1) and the `VITE_APP_*` env keys the frontend reads (Task 4).

- [ ] **Step 1: Update `frontend/Dockerfile` builder stage**

After the existing telemetry `ARG`/`ENV` pairs and before `RUN npm run build` (line 20), add:
```dockerfile
# Version metadata. SOURCE_COMMIT (requires Coolify "Include Source Commit in
# Build") and COOLIFY_BRANCH arrive as build args; VERSION is copied from the
# repo root. Vite bakes VITE_APP_* from process.env at build time.
ARG SOURCE_COMMIT=""
ARG COOLIFY_BRANCH=""
COPY VERSION ./VERSION
```
Then replace the `RUN npm run build` line with:
```dockerfile
RUN VITE_APP_VERSION_BASE="$(cat ./VERSION)" \
    VITE_APP_COMMIT="$SOURCE_COMMIT" \
    VITE_APP_BRANCH="$COOLIFY_BRANCH" \
    VITE_APP_BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    npm run build
```

- [ ] **Step 2: Add build args to `docker-compose.coolify.yml`**

In the `frontend` service `build.args` block (after `VITE_TELEMETRY_PRIVACY`, line 28), add:
```yaml
        # Git anchors for the version string. SOURCE_COMMIT requires the Coolify
        # "Include Source Commit in Build" toggle on the frontend resource;
        # COOLIFY_BRANCH is always available. Both empty in non-Coolify builds
        # (falls back to a "local" version).
        SOURCE_COMMIT: ${SOURCE_COMMIT:-}
        COOLIFY_BRANCH: ${COOLIFY_BRANCH:-}
```

- [ ] **Step 3: Verify the image bakes the version (if Docker is available)**

Run: `docker build -f frontend/Dockerfile --build-arg SOURCE_COMMIT=a1b2c3d4e5f6 --build-arg COOLIFY_BRANCH=next -t vmp-frontend-version-check . && docker run --rm vmp-frontend-version-check sh -c 'grep -rho "0.1.0+next.a1b2c3d" /usr/share/nginx/html/assets | head -1'`
Expected: prints `0.1.0+next.a1b2c3d` (the string is baked into the JS bundle). If Docker is unavailable, note it and rely on review.

- [ ] **Step 4: Commit**

```bash
git add frontend/Dockerfile docker-compose.coolify.yml
git commit -m "build(version): bake version into frontend image via Coolify build args (VMP-182)"
```

---

### Task 7: `<AppVersion />` component + placements (VMP-183)

**Files:**
- Create: `frontend/src/features/layout/AppVersion.tsx`
- Test: `frontend/src/features/layout/AppVersion.test.tsx`
- Modify: `frontend/src/features/layout/UserMenu.tsx` (add version line after the Log out item)
- Modify: `frontend/src/features/login/login.tsx` (add version string under the Card)

**Interfaces:**
- Consumes: `appVersion`, `commitUrl` from Task 4.
- Produces: `<AppVersion />` — renders `v{base} · {shortCommit}`, the short SHA linking to the commit, with a `title` tooltip of `{version} · {branch}` (+ ` · built {builtAt}` when present).

- [ ] **Step 1: Write the failing component test**

Create `frontend/src/features/layout/AppVersion.test.tsx` (mirror `DevBanner.test.tsx` render style):
```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"

afterEach(() => vi.resetModules())

async function renderWithVersion(info: Record<string, unknown>) {
  vi.doMock("@/lib/version", () => ({
    appVersion: info,
    commitUrl: (c: string) => `https://github.com/KhourySpecialProjects/video-review-system/commit/${c}`,
  }))
  const { AppVersion } = await import("./AppVersion")
  render(<AppVersion />)
}

describe("AppVersion", () => {
  it("shows base and short commit, linking the sha to the commit", async () => {
    await renderWithVersion({
      version: "0.1.0+next.a1b2c3d",
      base: "0.1.0",
      branch: "next",
      commit: "a1b2c3d4e5f6",
      shortCommit: "a1b2c3d",
      builtAt: null,
    })
    expect(screen.getByText(/v0\.1\.0/)).toBeInTheDocument()
    const link = screen.getByRole("link", { name: /a1b2c3d/ })
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/KhourySpecialProjects/video-review-system/commit/a1b2c3d4e5f6",
    )
  })
  it("renders a plain label with no link in local builds", async () => {
    await renderWithVersion({
      version: "0.0.0+local.local",
      base: "0.0.0",
      branch: "local",
      commit: "",
      shortCommit: "local",
      builtAt: null,
    })
    expect(screen.getByText(/v0\.0\.0/)).toBeInTheDocument()
    expect(screen.queryByRole("link")).toBeNull()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm test -- AppVersion`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `frontend/src/features/layout/AppVersion.tsx`**

```tsx
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test -- AppVersion`
Expected: PASS.

- [ ] **Step 5: Add to `UserMenu.tsx`**

Import at top: `import { AppVersion } from "./AppVersion"`. After the Log out `</DropdownMenuItem>` (line 105) and before `</DropdownMenuContent>` (line 106), add:
```tsx
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <AppVersion />
        </div>
```

- [ ] **Step 6: Add to `login.tsx`**

Import at top: `import { AppVersion } from "@/features/layout/AppVersion"`. After the `</Card>` (line 126), still inside the outer `min-h-screen` flex div, add:
```tsx
        <AppVersion className="mt-4 text-center" />
```
(If the outer div is not a flex-column that centers children, wrap in `<div className="mt-4 flex w-full justify-center">`. Check the actual JSX and match its layout.)

- [ ] **Step 7: Full frontend gate**

Run: `cd frontend && npm run lint && npm run build && npm test`
Expected: all clean.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/layout/AppVersion.tsx frontend/src/features/layout/AppVersion.test.tsx frontend/src/features/layout/UserMenu.tsx frontend/src/features/login/login.tsx
git commit -m "feat(version): show app version in profile menu + login page (VMP-183)"
```

---

### Task 8: FE↔BE skew badge + reload nudge (VMP-183)

**Files:**
- Create: `frontend/src/features/version/useVersionMonitor.ts`
- Test: `frontend/src/features/version/useVersionMonitor.test.ts`
- Create: `frontend/src/features/version/VersionNotices.tsx`
- Modify: `frontend/src/routes/root.tsx` (mount `<VersionNotices />` in the authenticated shell)

**Interfaces:**
- Consumes: `appVersion`, `fetchBackendVersion` from Task 4.
- Produces: `useVersionMonitor(): { skew: boolean; updateAvailable: boolean }`.
  - `skew` — backend's version, fetched on mount, differs from `appVersion.version` (half-deploy: FE and BE out of step).
  - `updateAvailable` — a later poll's backend version differs from the one first seen (a new build shipped since this tab loaded).

- [ ] **Step 1: Write the failing hook test**

Create `frontend/src/features/version/useVersionMonitor.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"

const fetchBackendVersion = vi.fn()
vi.mock("@/lib/version", () => ({
  appVersion: { version: "0.1.0+next.aaaaaaa" },
  fetchBackendVersion: () => fetchBackendVersion(),
}))

beforeEach(() => { vi.useFakeTimers(); fetchBackendVersion.mockReset() })
afterEach(() => vi.useRealTimers())

async function load() {
  const { useVersionMonitor } = await import("./useVersionMonitor")
  return useVersionMonitor
}

describe("useVersionMonitor", () => {
  it("flags skew when backend version differs from the frontend on mount", async () => {
    fetchBackendVersion.mockResolvedValue({ version: "0.1.0+next.bbbbbbb" })
    const useVersionMonitor = await load()
    const { result } = renderHook(() => useVersionMonitor())
    await waitFor(() => expect(result.current.skew).toBe(true))
  })
  it("does not flag skew when versions match", async () => {
    fetchBackendVersion.mockResolvedValue({ version: "0.1.0+next.aaaaaaa" })
    const useVersionMonitor = await load()
    const { result } = renderHook(() => useVersionMonitor())
    await waitFor(() => expect(result.current.skew).toBe(false))
  })
  it("flags updateAvailable when a later poll returns a new backend version", async () => {
    fetchBackendVersion
      .mockResolvedValueOnce({ version: "0.1.0+next.aaaaaaa" })
      .mockResolvedValueOnce({ version: "0.2.0+next.ccccccc" })
    const useVersionMonitor = await load()
    const { result } = renderHook(() => useVersionMonitor())
    await waitFor(() => expect(result.current.skew).toBe(false))
    await vi.advanceTimersByTimeAsync(60_000)
    await waitFor(() => expect(result.current.updateAvailable).toBe(true))
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npm test -- useVersionMonitor`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `frontend/src/features/version/useVersionMonitor.ts`**

```ts
import { useEffect, useRef, useState } from "react"
import { appVersion, fetchBackendVersion } from "@/lib/version"

const POLL_MS = 60_000

/**
 * Watches the backend's version relative to this build.
 * - `skew`: backend differs from the FE on first fetch (a half-deploy).
 * - `updateAvailable`: a later poll shows a different backend version than the
 *   one first observed (a new build shipped while this tab was open).
 */
export function useVersionMonitor(): { skew: boolean; updateAvailable: boolean } {
  const [skew, setSkew] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const firstSeen = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    async function check(isInitial: boolean) {
      const backend = await fetchBackendVersion()
      if (!active || !backend) return
      if (isInitial) {
        firstSeen.current = backend.version
        setSkew(backend.version !== appVersion.version)
      } else if (firstSeen.current && backend.version !== firstSeen.current) {
        setUpdateAvailable(true)
      }
    }
    void check(true)
    const id = setInterval(() => void check(false), POLL_MS)
    const onFocus = () => void check(false)
    window.addEventListener("focus", onFocus)
    return () => {
      active = false
      clearInterval(id)
      window.removeEventListener("focus", onFocus)
    }
  }, [])

  return { skew, updateAvailable }
}
```

- [ ] **Step 4: Run the hook test to verify it passes**

Run: `cd frontend && npm test -- useVersionMonitor`
Expected: PASS.

- [ ] **Step 5: Write `frontend/src/features/version/VersionNotices.tsx`**

```tsx
import { useVersionMonitor } from "./useVersionMonitor"

/**
 * Renders subtle notices driven by useVersionMonitor: a reload nudge when a new
 * build has shipped, and a muted skew badge when FE/BE versions disagree.
 * Both are non-blocking and dismissible via reload.
 */
export function VersionNotices() {
  const { skew, updateAvailable } = useVersionMonitor()
  if (!skew && !updateAvailable) return null
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      {updateAvailable ? (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full border bg-background px-4 py-2 text-sm shadow-md hover:bg-muted"
        >
          A new version is available — refresh
        </button>
      ) : (
        <span className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground shadow-sm">
          Frontend / backend version mismatch
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Mount in `frontend/src/routes/root.tsx`**

Import `import { VersionNotices } from "@/features/version/VersionNotices"` and render `<VersionNotices />` inside the shell (alongside `FeedbackWidget`/`DevBanner`). Match the existing JSX placement of those siblings.

- [ ] **Step 7: Full frontend gate**

Run: `cd frontend && npm run lint && npm run build && npm test`
Expected: all clean.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/version/ frontend/src/routes/root.tsx
git commit -m "feat(version): FE/BE skew badge + new-version reload nudge (VMP-183)"
```

---

### Task 9: Versioning docs in README (VMP-182)

**Files:**
- Modify: `README.md` (add a "Versioning" section)

**Interfaces:** none (docs only). The `CLAUDE.md` merge-time reminder already exists.

- [ ] **Step 1: Add a "Versioning" section to `README.md`**

Insert a concise section (near the deployment docs) covering:
- Version format `{/VERSION}+{channel}.{shortSHA}`; the `+sha` advances every merge automatically, the base is bumped by hand.
- To bump: edit `/VERSION` on `next` (it rides promotions untouched); at real milestones also cut a GitHub Release `vX.Y.Z` for notes.
- Where it shows: profile dropdown, login page, `GET /api/version`, GlitchTip `release`.
- The one operator step: enable **"Include Source Commit in Build"** on the frontend Coolify resource (or the baked SHA is empty).
- Link to `docs/superpowers/specs/2026-07-18-version-release-numbering-design.md`.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(version): document versioning + bump/release process (VMP-182)"
```

---

## Execution / parallelization notes

Tasks touch disjoint files, enabling two parallel waves (foundation modules first, then everything that depends on them). Because parallel agents share one working tree, **agents implement + run their own task's tests but do NOT `git commit`** — the orchestrator runs the full gate and commits per task after each wave, avoiding git-index races.

- **Wave 1 (parallel):** Task 1 (backend), Task 4 (frontend lib), Task 9 (README). These create `/VERSION`, `backend/src/lib/version.ts`, `frontend/src/lib/version.ts`.
- **Wave 2 (parallel, after Wave 1):** Task 2, Task 3 (backend Docker + telemetry), Task 5, Task 6, Task 7, Task 8 (frontend telemetry, Docker, component, monitor). All touch disjoint files.

## Self-Review

- **Spec coverage:** §1 version format → Task 1/4 (`composeVersion`), Global Constraints. §1 `/VERSION` SoT → Task 1. §2 manual bump/no-CI → Task 9 + no Action anywhere. §3 backend runtime + `/api/version` → Task 1; Docker COPY → Task 2; telemetry `release` → Task 3. §4 FE build args → Task 6; display in dropdown + public → Task 7; `useAppVersion`/env → Task 4; boot log → Task 5. §5 GlitchTip `release` both apps → Task 3 + Task 5. §6 skew check → Task 8; reload nudge → Task 8; sourcemaps = Phase 2 (out of scope, noted). Risks (Coolify toggle) → Task 6 + Task 9. All covered.
- **Placeholder scan:** no TBD/TODO; every code step shows full code. Docker verify steps degrade gracefully when Docker is absent.
- **Type consistency:** `VersionInfo` shape identical across FE/BE and `/api/version`; `composeVersion(base, branch?, commit?)`, `resolveVersionInfo`, `appVersion`, `fetchBackendVersion`, `commitUrl`, `useVersionMonitor(): { skew, updateAvailable }` used consistently between definition and consumers.
