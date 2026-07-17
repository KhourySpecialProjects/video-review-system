# GlitchTip Telemetry + In-App Feedback Implementation Plan

> **Superseded (2026-07-16, post-implementation):** the **screenshot** parts of
> Task 3 (`screenshot.ts` / `html2canvas-pro`) and Task 4 (the "Attach screenshot"
> control) were **removed** after local testing showed GlitchTip returns HTTP 500
> on the envelope's attachment item — it stores the feedback event but rejects the
> attached image. `html2canvas-pro` was uninstalled; the widget sends message +
> type + route + auto-attached breadcrumbs only. Ignore screenshot steps below.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add self-hosted GlitchTip error telemetry (breadcrumbs, no replay) to the frontend and backend, plus an unobtrusive right-edge feedback widget that sends context-rich message events into GlitchTip for triage.

**Architecture:** GlitchTip is a Sentry-protocol-compatible server, so the official Sentry SDKs are the clients — `@sentry/react` on the frontend and `@sentry/node` on the backend. Errors and proactive feedback both flow to one self-hosted GlitchTip instance (a separate Coolify resource, stood up by the operator) with one project per environment. A privacy switch (`full` vs `scrubbed`) governs how much identifiable data is sent; it is a Vite **build arg** on the frontend and a **runtime env** on the backend. Nothing is persisted in the Asclepion database.

**Tech Stack:** React 19, Vite 8, TypeScript, Vitest + @testing-library/react (frontend); Express 5, TypeScript, Vitest (backend); `@sentry/react`, `@sentry/node`. (`html2canvas-pro` was part of the now-removed screenshot feature — see the superseded note above.)

## Global Constraints

- **Package manager: npm.** Each of `frontend/` and `backend/` has its own `package-lock.json`. Run `npm` commands inside the respective directory.
- **Frontend test runner:** `npx vitest run <file>` from `frontend/`. Tests colocated with source, `*.test.ts(x)`. Setup: `frontend/src/test/setup.ts` (jsdom, imports `@testing-library/jest-dom/vitest`).
- **Backend test runner:** `npx vitest run <file>` from `backend/`.
- **Screenshots MUST use `html2canvas-pro`, not `html2canvas`** — this app uses Tailwind CSS v4, whose default palette emits `oklch()` colors that plain `html2canvas` cannot parse (it produces blank/broken images). `html2canvas-pro` supports `oklch`.
- **Privacy default is `scrubbed`.** Any code that reads the privacy mode must treat an unset/empty/unrecognized value as `scrubbed` (fail private), matching the "unset value is a silent hole, fail safe" posture already used in `docker-compose.coolify.yml`.
- **Empty DSN = telemetry disabled.** SDK init must be a no-op when the DSN is empty, so local dev and any environment without GlitchTip run clean.
- **No changes to the Prisma schema or any migration.** If a task seems to require a DB change, stop — the design forbids it.
- **Env var names (exact):** frontend build args `VITE_GLITCHTIP_DSN`, `VITE_TELEMETRY_PRIVACY`; backend runtime env `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `TELEMETRY_PRIVACY`. Frontend reuses the existing `VITE_APP_ENV` for the `environment` tag.
- **Privacy mode type (exact), shared shape across FE and BE:** `type PrivacyMode = "full" | "scrubbed"`.
- **Commits:** one per task, conventional-commit style with scope. Every commit message ends with the trailer:
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```
- **Branch:** all work lands on a feature branch off `next` (`vmp-<n>-glitchtip-telemetry-feedback`), per the standard workflow. The Linear ticket is created before coding.

---

## File Structure

**Frontend (`frontend/src/`):**
- `lib/telemetry/config.ts` — pure config resolution + URL scrubber. No Sentry import. (Task 1)
- `lib/telemetry/config.test.ts` — tests for the above. (Task 1)
- `lib/telemetry/init.ts` — `initTelemetry()`: `Sentry.init` + `beforeBreadcrumb` scrubbing. (Task 2)
- `lib/telemetry/useTelemetryIdentity.ts` — hook syncing the logged-in user onto the Sentry scope, privacy-gated. (Task 2)
- `features/feedback/screenshot.ts` — `html2canvas-pro` wrapper. (Task 3)
- `features/feedback/captureFeedback.ts` — builds and sends the feedback message event. (Task 3)
- `features/feedback/captureFeedback.test.ts` — tests for the above. (Task 3)
- `features/feedback/FeedbackWidget.tsx` — the edge tab + slide-in panel. (Task 4)
- `features/feedback/FeedbackWidget.test.tsx` — tests for the above. (Task 4)
- `main.tsx` (modify) — call `initTelemetry()` before render. (Task 2)
- `routes/root.tsx` (modify) — call identity hook (Task 2), mount `<FeedbackWidget/>` (Task 4).
- `vite-env.d.ts` (modify) — declare new env vars. (Task 2)

**Backend (`backend/src/`):**
- `lib/telemetry.ts` — config resolution + `initTelemetry()`. (Task 5)
- `lib/telemetry.test.ts` — tests for the above. (Task 5)
- `instrument.ts` — side-effect module that calls `initTelemetry()`; imported first. (Task 5)
- `index.ts` (modify) — `import "./instrument.js"` at the very top. (Task 5)
- `middleware/errors.ts` (modify) — `Sentry.captureException` for 5xx/unknown errors. (Task 6)
- `middleware/errors.test.ts` — tests for capture behavior. (Task 6)

**Deployment / docs (repo root):**
- `docker-compose.coolify.yml` (modify) — frontend build args + backend env. (Task 7)
- `.env.coolify.example`, `.env.coolify.next.example` (modify) — new vars. (Task 7)
- `README.md` (modify) — GlitchTip runbook + operator step. (Task 7)

---

## Task 1: Frontend telemetry config + URL scrubber (pure functions)

**Files:**
- Create: `frontend/src/lib/telemetry/config.ts`
- Test: `frontend/src/lib/telemetry/config.test.ts`

**Interfaces:**
- Produces:
  - `type PrivacyMode = "full" | "scrubbed"`
  - `interface TelemetryConfig { enabled: boolean; dsn: string; environment: string; privacyMode: PrivacyMode }`
  - `function resolveTelemetryConfig(env: { VITE_GLITCHTIP_DSN?: string; VITE_APP_ENV?: string; VITE_TELEMETRY_PRIVACY?: string }): TelemetryConfig`
  - `function parametrizeUrl(raw: string): string`
  - `const telemetryConfig: TelemetryConfig` (resolved once from `import.meta.env`)

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/telemetry/config.test.ts
import { describe, it, expect } from "vitest"
import { resolveTelemetryConfig, parametrizeUrl } from "./config"

describe("resolveTelemetryConfig", () => {
  it("is disabled when the DSN is empty", () => {
    const c = resolveTelemetryConfig({ VITE_GLITCHTIP_DSN: "", VITE_APP_ENV: "next-preview" })
    expect(c.enabled).toBe(false)
  })

  it("is enabled and carries dsn + environment when the DSN is set", () => {
    const c = resolveTelemetryConfig({
      VITE_GLITCHTIP_DSN: "https://abc@glitchtip.example/1",
      VITE_APP_ENV: "next-preview",
    })
    expect(c.enabled).toBe(true)
    expect(c.dsn).toBe("https://abc@glitchtip.example/1")
    expect(c.environment).toBe("next-preview")
  })

  it("defaults privacyMode to scrubbed when unset or unrecognized", () => {
    expect(resolveTelemetryConfig({}).privacyMode).toBe("scrubbed")
    expect(resolveTelemetryConfig({ VITE_TELEMETRY_PRIVACY: "nonsense" }).privacyMode).toBe("scrubbed")
  })

  it("honors privacyMode=full only for the exact string 'full'", () => {
    expect(resolveTelemetryConfig({ VITE_TELEMETRY_PRIVACY: "full" }).privacyMode).toBe("full")
  })

  it("falls back environment to 'local' when VITE_APP_ENV is unset", () => {
    expect(resolveTelemetryConfig({}).environment).toBe("local")
  })
})

describe("parametrizeUrl", () => {
  it("replaces numeric id segments with :id", () => {
    expect(parametrizeUrl("/videos/12345/review")).toBe("/videos/:id/review")
  })
  it("replaces uuid segments with :id", () => {
    expect(parametrizeUrl("/videos/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed")).toBe("/videos/:id")
  })
  it("drops query strings", () => {
    expect(parametrizeUrl("/search?q=secret")).toBe("/search")
  })
  it("preserves absolute origins while scrubbing the path", () => {
    expect(parametrizeUrl("https://app.example/videos/42")).toBe("https://app.example/videos/:id")
  })
  it("returns the input unchanged when it cannot be parsed", () => {
    expect(parametrizeUrl("::::")).toBe("::::")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/telemetry/config.test.ts`
Expected: FAIL — cannot resolve `./config`.

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/lib/telemetry/config.ts

export type PrivacyMode = "full" | "scrubbed"

export interface TelemetryConfig {
  enabled: boolean
  dsn: string
  environment: string
  privacyMode: PrivacyMode
}

/**
 * Resolve telemetry config from build-time env. Pure — takes the env subset so
 * it is testable without import.meta. Privacy fails safe to "scrubbed"; an empty
 * DSN disables telemetry entirely.
 */
export function resolveTelemetryConfig(env: {
  VITE_GLITCHTIP_DSN?: string
  VITE_APP_ENV?: string
  VITE_TELEMETRY_PRIVACY?: string
}): TelemetryConfig {
  const dsn = env.VITE_GLITCHTIP_DSN ?? ""
  return {
    enabled: dsn.length > 0,
    dsn,
    environment: env.VITE_APP_ENV ?? "local",
    privacyMode: env.VITE_TELEMETRY_PRIVACY === "full" ? "full" : "scrubbed",
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LONG_HEX_RE = /^[0-9a-f]{16,}$/i
const NUMERIC_RE = /^[0-9]+$/

/**
 * Replace id-like path segments (numeric, uuid, long hex) with ":id" and drop
 * the query string, so scrubbed breadcrumbs don't carry record identifiers.
 */
export function parametrizeUrl(raw: string): string {
  try {
    const hasProto = /^https?:\/\//i.test(raw)
    const u = new URL(raw, hasProto ? undefined : "http://placeholder.invalid")
    const scrubbedPath = u.pathname
      .split("/")
      .map((seg) =>
        NUMERIC_RE.test(seg) || UUID_RE.test(seg) || LONG_HEX_RE.test(seg) ? ":id" : seg,
      )
      .join("/")
    return hasProto ? `${u.origin}${scrubbedPath}` : scrubbedPath
  } catch {
    return raw
  }
}

/** Resolved once from build-time env for app use. */
export const telemetryConfig: TelemetryConfig = resolveTelemetryConfig(import.meta.env)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/telemetry/config.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/telemetry/config.ts frontend/src/lib/telemetry/config.test.ts
git commit -m "feat(telemetry): frontend telemetry config + URL scrubber

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Frontend Sentry init + identity wiring

**Files:**
- Create: `frontend/src/lib/telemetry/init.ts`
- Create: `frontend/src/lib/telemetry/useTelemetryIdentity.ts`
- Modify: `frontend/src/vite-env.d.ts`
- Modify: `frontend/src/main.tsx:1-20`
- Modify: `frontend/src/routes/root.tsx` (add identity hook call)
- Test: `frontend/src/lib/telemetry/init.test.ts`

**Interfaces:**
- Consumes: `telemetryConfig`, `parametrizeUrl`, `TelemetryConfig`, `PrivacyMode` from `./config` (Task 1); `useAuth` from `@/context/auth-context` (returns `{ user: { id, name, email, role? } | null }`).
- Produces:
  - `function initTelemetry(config?: TelemetryConfig): void`
  - `function scrubBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb` (exported for testing)
  - `function useTelemetryIdentity(): void`

- [ ] **Step 1: Install the SDK**

Run: `cd frontend && npm install @sentry/react`
Expected: adds `@sentry/react` to `frontend/package.json` dependencies.

- [ ] **Step 2: Write the failing test**

```ts
// frontend/src/lib/telemetry/init.test.ts
import { describe, it, expect } from "vitest"
import { scrubBreadcrumb } from "./init"

describe("scrubBreadcrumb", () => {
  it("parametrizes the url on a navigation breadcrumb", () => {
    const out = scrubBreadcrumb({
      category: "navigation",
      data: { from: "/videos/12", to: "/videos/34/review" },
    })
    expect(out.data).toEqual({ from: "/videos/:id", to: "/videos/:id/review" })
  })

  it("parametrizes a generic data.url (fetch/xhr)", () => {
    const out = scrubBreadcrumb({ category: "fetch", data: { url: "/api/videos/99?token=x" } })
    expect(out.data?.url).toBe("/api/videos/:id")
  })

  it("leaves breadcrumbs without urls untouched", () => {
    const out = scrubBreadcrumb({ category: "ui.click", message: "button" })
    expect(out.message).toBe("button")
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/telemetry/init.test.ts`
Expected: FAIL — cannot resolve `./init`.

- [ ] **Step 4: Implement init + scrubber**

```ts
// frontend/src/lib/telemetry/init.ts
import * as Sentry from "@sentry/react"
import { parametrizeUrl, telemetryConfig, type TelemetryConfig } from "./config"

/**
 * Scrub id-like values out of a breadcrumb's URL fields. Applied only in
 * scrubbed mode via beforeBreadcrumb.
 */
export function scrubBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb {
  const data = breadcrumb.data
  if (!data) return breadcrumb
  if (typeof data.url === "string") data.url = parametrizeUrl(data.url)
  if (typeof data.from === "string") data.from = parametrizeUrl(data.from)
  if (typeof data.to === "string") data.to = parametrizeUrl(data.to)
  return breadcrumb
}

/**
 * Initialize Sentry/GlitchTip for the browser. No-op when the DSN is empty, so
 * local dev runs clean. Tracing and replay are intentionally off — errors and
 * breadcrumbs only. In scrubbed mode, breadcrumb URLs are parametrized and PII
 * is not attached; in full mode both are sent as-is.
 */
export function initTelemetry(config: TelemetryConfig = telemetryConfig): void {
  if (!config.enabled) return
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    sendDefaultPii: config.privacyMode === "full",
    tracesSampleRate: 0,
    initialScope: { tags: { platform: "frontend" } },
    beforeBreadcrumb:
      config.privacyMode === "scrubbed"
        ? (breadcrumb) => scrubBreadcrumb(breadcrumb)
        : undefined,
  })
}
```

```ts
// frontend/src/lib/telemetry/useTelemetryIdentity.ts
import { useEffect } from "react"
import * as Sentry from "@sentry/react"
import { useAuth } from "@/context/auth-context"
import { telemetryConfig } from "./config"

/**
 * Keep the Sentry user scope in sync with the logged-in user. In full mode we
 * send id + email + name + role; in scrubbed mode only id + role (pseudonymous).
 * Clears the user on logout. No-op when telemetry is disabled.
 */
export function useTelemetryIdentity(): void {
  const { user } = useAuth()
  useEffect(() => {
    if (!telemetryConfig.enabled) return
    if (!user) {
      Sentry.setUser(null)
      return
    }
    Sentry.setUser(
      telemetryConfig.privacyMode === "full"
        ? { id: user.id, email: user.email, username: user.name, role: user.role }
        : { id: user.id, role: user.role },
    )
  }, [user])
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/telemetry/init.test.ts`
Expected: PASS.

- [ ] **Step 6: Declare env types**

Replace the body of `frontend/src/vite-env.d.ts` with:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: string
  readonly VITE_GLITCHTIP_DSN?: string
  readonly VITE_TELEMETRY_PRIVACY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 7: Call initTelemetry before render**

In `frontend/src/main.tsx`, add the import and call. After line 8 (`import { queryClient } ...`) add:

```ts
import { initTelemetry } from "./lib/telemetry/init"
```

Then immediately before `createRoot(...)` (line 11) add:

```ts
initTelemetry()
```

- [ ] **Step 8: Wire the identity hook into the root layout**

In `frontend/src/routes/root.tsx`:
- Add import near the other `@/features` imports:
  ```ts
  import { useTelemetryIdentity } from "@/lib/telemetry/useTelemetryIdentity"
  ```
- Inside `Root()`, as the first statement of the component body (before `const location = ...`), add:
  ```ts
  useTelemetryIdentity()
  ```

- [ ] **Step 9: Verify the app still type-checks and builds**

Run: `cd frontend && npm run build`
Expected: build succeeds (type-check passes).

- [ ] **Step 10: Commit**

```bash
git add frontend/src/lib/telemetry/init.ts frontend/src/lib/telemetry/init.test.ts \
  frontend/src/lib/telemetry/useTelemetryIdentity.ts frontend/src/vite-env.d.ts \
  frontend/src/main.tsx frontend/src/routes/root.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat(telemetry): initialize @sentry/react + privacy-gated identity

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Feedback capture core (screenshot + captureFeedback)

**Files:**
- Create: `frontend/src/features/feedback/screenshot.ts`
- Create: `frontend/src/features/feedback/captureFeedback.ts`
- Test: `frontend/src/features/feedback/captureFeedback.test.ts`

**Interfaces:**
- Consumes: `@sentry/react` (`withScope`, `captureMessage`).
- Produces:
  - `type FeedbackType = "bug" | "confusing" | "idea"`
  - `interface FeedbackInput { type: FeedbackType; message: string; route: string; screenshot?: Uint8Array | null }`
  - `function captureFeedback(input: FeedbackInput): void`
  - `function captureScreenshot(): Promise<Uint8Array | null>`

- [ ] **Step 1: Install html2canvas-pro**

Run: `cd frontend && npm install html2canvas-pro`
Expected: adds `html2canvas-pro` to dependencies. (NOT `html2canvas` — see Global Constraints.)

- [ ] **Step 2: Write the failing test**

```ts
// frontend/src/features/feedback/captureFeedback.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

const setTag = vi.fn()
const setContext = vi.fn()
const addAttachment = vi.fn()
const captureMessage = vi.fn()

vi.mock("@sentry/react", () => ({
  withScope: (cb: (scope: unknown) => void) => cb({ setTag, setContext, addAttachment }),
  captureMessage,
}))

import { captureFeedback } from "./captureFeedback"

beforeEach(() => {
  setTag.mockClear()
  setContext.mockClear()
  addAttachment.mockClear()
  captureMessage.mockClear()
})

describe("captureFeedback", () => {
  it("tags the event as feedback with its type and sends the message at info level", () => {
    captureFeedback({ type: "bug", message: "Upload spins forever", route: "/videos/1/review" })
    expect(setTag).toHaveBeenCalledWith("feedback", true)
    expect(setTag).toHaveBeenCalledWith("feedback.type", "bug")
    expect(setContext).toHaveBeenCalledWith("feedback", { route: "/videos/1/review" })
    expect(captureMessage).toHaveBeenCalledWith("Upload spins forever", "info")
  })

  it("attaches the screenshot when present", () => {
    const png = new Uint8Array([1, 2, 3])
    captureFeedback({ type: "idea", message: "Nice to have", route: "/", screenshot: png })
    expect(addAttachment).toHaveBeenCalledWith({
      filename: "screenshot.png",
      data: png,
      contentType: "image/png",
    })
  })

  it("does not attach when there is no screenshot", () => {
    captureFeedback({ type: "confusing", message: "What is this?", route: "/" })
    expect(addAttachment).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/feedback/captureFeedback.test.ts`
Expected: FAIL — cannot resolve `./captureFeedback`.

- [ ] **Step 4: Implement**

```ts
// frontend/src/features/feedback/captureFeedback.ts
import * as Sentry from "@sentry/react"

export type FeedbackType = "bug" | "confusing" | "idea"

export interface FeedbackInput {
  type: FeedbackType
  message: string
  route: string
  screenshot?: Uint8Array | null
}

/**
 * Send proactive tester feedback to GlitchTip as an info-level message event.
 * The Sentry SDK auto-attaches the live breadcrumb trail + user scope; we add
 * feedback tags (for triage), the route context, and an optional screenshot.
 */
export function captureFeedback(input: FeedbackInput): void {
  Sentry.withScope((scope) => {
    scope.setTag("feedback", true)
    scope.setTag("feedback.type", input.type)
    scope.setContext("feedback", { route: input.route })
    if (input.screenshot) {
      scope.addAttachment({
        filename: "screenshot.png",
        data: input.screenshot,
        contentType: "image/png",
      })
    }
    Sentry.captureMessage(input.message, "info")
  })
}
```

```ts
// frontend/src/features/feedback/screenshot.ts
import html2canvas from "html2canvas-pro"

/**
 * Capture the current page as a PNG for feedback attachment. Returns null on any
 * failure so the caller can send feedback without a screenshot. Uses
 * html2canvas-pro (plain html2canvas cannot parse Tailwind v4 oklch colors).
 */
export async function captureScreenshot(): Promise<Uint8Array | null> {
  try {
    const canvas = await html2canvas(document.body, { logging: false, useCORS: true })
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    )
    if (!blob) return null
    return new Uint8Array(await blob.arrayBuffer())
  } catch {
    return null
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/feedback/captureFeedback.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/feedback/captureFeedback.ts \
  frontend/src/features/feedback/captureFeedback.test.ts \
  frontend/src/features/feedback/screenshot.ts \
  frontend/package.json frontend/package-lock.json
git commit -m "feat(feedback): capture feedback as a GlitchTip message event + screenshot util

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Feedback widget UI (edge tab + panel)

**Files:**
- Create: `frontend/src/features/feedback/FeedbackWidget.tsx`
- Test: `frontend/src/features/feedback/FeedbackWidget.test.tsx`
- Modify: `frontend/src/routes/root.tsx` (mount the widget)

**Interfaces:**
- Consumes: `captureFeedback`, `FeedbackType` (Task 3); `captureScreenshot` (Task 3); `telemetryConfig` from `@/lib/telemetry/config`; `useLocation` from `react-router`; `toast` from `sonner`.
- Produces: `function FeedbackWidget(): JSX.Element`

- [ ] **Step 1: Write the failing test**

```tsx
// frontend/src/features/feedback/FeedbackWidget.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

const captureFeedback = vi.fn()
vi.mock("./captureFeedback", () => ({ captureFeedback: (...a: unknown[]) => captureFeedback(...a) }))
vi.mock("./screenshot", () => ({ captureScreenshot: vi.fn(async () => null) }))
vi.mock("react-router", () => ({ useLocation: () => ({ pathname: "/videos/7/review" }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// Force telemetry "enabled + full" so the screenshot control renders.
vi.mock("@/lib/telemetry/config", () => ({
  telemetryConfig: { enabled: true, dsn: "x", environment: "test", privacyMode: "full" },
}))

import { FeedbackWidget } from "./FeedbackWidget"

beforeEach(() => captureFeedback.mockClear())

describe("FeedbackWidget", () => {
  it("is collapsed by default and opens the panel when the tab is clicked", () => {
    render(<FeedbackWidget />)
    expect(screen.queryByRole("dialog")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: /feedback/i }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("blocks submit until a message is entered", () => {
    render(<FeedbackWidget />)
    fireEvent.click(screen.getByRole("button", { name: /feedback/i }))
    fireEvent.click(screen.getByRole("button", { name: /send/i }))
    expect(captureFeedback).not.toHaveBeenCalled()
  })

  it("submits the message with the selected type and current route", async () => {
    render(<FeedbackWidget />)
    fireEvent.click(screen.getByRole("button", { name: /feedback/i }))
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Button is confusing" } })
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }))
    await waitFor(() => expect(captureFeedback).toHaveBeenCalledTimes(1))
    expect(captureFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Button is confusing", type: "bug", route: "/videos/7/review" }),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/feedback/FeedbackWidget.test.tsx`
Expected: FAIL — cannot resolve `./FeedbackWidget`.

- [ ] **Step 3: Implement the widget**

```tsx
// frontend/src/features/feedback/FeedbackWidget.tsx
import { useState } from "react"
import { useLocation } from "react-router"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { telemetryConfig } from "@/lib/telemetry/config"
import { captureFeedback, type FeedbackType } from "./captureFeedback"
import { captureScreenshot } from "./screenshot"

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: "bug", label: "🐛 Bug" },
  { value: "confusing", label: "🤔 Confusing" },
  { value: "idea", label: "💡 Idea" },
]

/**
 * Right-edge feedback tab + slide-in panel, mounted once at the app root so it
 * appears on every page. Sends a context-rich message event to GlitchTip. The
 * screenshot control is shown only in "full" privacy mode. Renders nothing when
 * telemetry is disabled (no DSN).
 */
export function FeedbackWidget() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>("bug")
  const [message, setMessage] = useState("")
  const [attachShot, setAttachShot] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!telemetryConfig.enabled) return null
  const allowScreenshot = telemetryConfig.privacyMode === "full"

  async function handleSend() {
    if (!message.trim() || submitting) return
    setSubmitting(true)
    try {
      const screenshot = attachShot && allowScreenshot ? await captureScreenshot() : null
      captureFeedback({ type, message: message.trim(), route: location.pathname, screenshot })
      toast.success("Thanks — your feedback was sent.")
      setMessage("")
      setAttachShot(false)
      setOpen(false)
    } catch {
      toast.error("Could not send feedback. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Send feedback"
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/2 z-50 -translate-y-1/2 rounded-l-md bg-info px-1.5 py-3 text-xs font-medium tracking-wide text-black [writing-mode:vertical-rl] rotate-180"
        >
          FEEDBACK
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Send feedback"
          className="fixed right-4 top-1/2 z-50 w-80 -translate-y-1/2 rounded-lg border border-white/15 bg-bg-dark shadow-2xl"
        >
          <div className="flex items-center justify-between rounded-t-lg bg-info px-3 py-2 text-sm font-semibold text-black">
            <span>Send feedback</span>
            <button type="button" aria-label="Close feedback" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-3 p-3">
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs",
                    type === t.value ? "border-info bg-info/25" : "border-white/20",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <textarea
              aria-label="Feedback message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what happened…"
              className="h-24 w-full rounded-md border border-white/15 bg-white/5 p-2 text-sm"
            />

            {allowScreenshot && (
              <label className="flex items-center gap-2 text-xs opacity-80">
                <input
                  type="checkbox"
                  checked={attachShot}
                  onChange={(e) => setAttachShot(e.target.checked)}
                />
                Attach screenshot
              </label>
            )}

            <div className="rounded-md border border-dashed border-white/20 bg-white/5 px-2 py-1.5 text-[11px] leading-relaxed opacity-70">
              Auto-attached: page {location.pathname}, your role, recent actions.
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={submitting}
              className="rounded-md bg-info py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/feedback/FeedbackWidget.test.tsx`
Expected: PASS (all three cases).

- [ ] **Step 5: Mount the widget in the root layout**

In `frontend/src/routes/root.tsx`:
- Add import near the other feature imports:
  ```ts
  import { FeedbackWidget } from "@/features/feedback/FeedbackWidget"
  ```
- Inside the outer `<div className="flex h-screen flex-col overflow-hidden bg-bg-dark">`, add `<FeedbackWidget />` as the last child, immediately after the closing `</main>` tag and before the closing `</div>`:
  ```tsx
              </main>
              <FeedbackWidget />
          </div>
  ```

- [ ] **Step 6: Verify build**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/feedback/FeedbackWidget.tsx \
  frontend/src/features/feedback/FeedbackWidget.test.tsx \
  frontend/src/routes/root.tsx
git commit -m "feat(feedback): right-edge feedback widget mounted app-wide

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Backend telemetry init

**Files:**
- Create: `backend/src/lib/telemetry.ts`
- Create: `backend/src/instrument.ts`
- Test: `backend/src/lib/telemetry.test.ts`
- Modify: `backend/src/index.ts:1-13`

**Interfaces:**
- Consumes: `@sentry/node`.
- Produces:
  - `type PrivacyMode = "full" | "scrubbed"`
  - `interface TelemetryConfig { enabled: boolean; dsn: string; environment: string; privacyMode: PrivacyMode }`
  - `function resolveTelemetryConfig(env: NodeJS.ProcessEnv): TelemetryConfig`
  - `function initTelemetry(config?: TelemetryConfig): void`

- [ ] **Step 1: Install the SDK**

Run: `cd backend && npm install @sentry/node`
Expected: adds `@sentry/node` to `backend/package.json` dependencies.

- [ ] **Step 2: Write the failing test**

```ts
// backend/src/lib/telemetry.test.ts
import { describe, it, expect } from "vitest"
import { resolveTelemetryConfig } from "./telemetry.js"

describe("resolveTelemetryConfig (backend)", () => {
  it("is disabled with no DSN", () => {
    expect(resolveTelemetryConfig({}).enabled).toBe(false)
  })

  it("is enabled and reads dsn + environment", () => {
    const c = resolveTelemetryConfig({
      SENTRY_DSN: "https://k@glitchtip.example/2",
      SENTRY_ENVIRONMENT: "next",
    })
    expect(c.enabled).toBe(true)
    expect(c.dsn).toBe("https://k@glitchtip.example/2")
    expect(c.environment).toBe("next")
  })

  it("defaults privacyMode to scrubbed unless exactly 'full'", () => {
    expect(resolveTelemetryConfig({}).privacyMode).toBe("scrubbed")
    expect(resolveTelemetryConfig({ TELEMETRY_PRIVACY: "full" }).privacyMode).toBe("full")
  })

  it("falls back environment to 'unknown'", () => {
    expect(resolveTelemetryConfig({}).environment).toBe("unknown")
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npx vitest run src/lib/telemetry.test.ts`
Expected: FAIL — cannot resolve `./telemetry.js`.

- [ ] **Step 4: Implement**

```ts
// backend/src/lib/telemetry.ts
import * as Sentry from "@sentry/node"

export type PrivacyMode = "full" | "scrubbed"

export interface TelemetryConfig {
  enabled: boolean
  dsn: string
  environment: string
  privacyMode: PrivacyMode
}

/**
 * Resolve backend telemetry config from process.env. Pure — takes the env so it
 * is testable. Privacy fails safe to "scrubbed"; empty DSN disables telemetry.
 */
export function resolveTelemetryConfig(env: NodeJS.ProcessEnv): TelemetryConfig {
  const dsn = env.SENTRY_DSN ?? ""
  return {
    enabled: dsn.length > 0,
    dsn,
    environment: env.SENTRY_ENVIRONMENT ?? "unknown",
    privacyMode: env.TELEMETRY_PRIVACY === "full" ? "full" : "scrubbed",
  }
}

/**
 * Initialize Sentry/GlitchTip for the backend. No-op when the DSN is empty.
 * Tracing is off — error capture only. sendDefaultPii follows the privacy mode.
 */
export function initTelemetry(config: TelemetryConfig = resolveTelemetryConfig(process.env)): void {
  if (!config.enabled) return
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    sendDefaultPii: config.privacyMode === "full",
    tracesSampleRate: 0,
    initialScope: { tags: { platform: "backend" } },
  })
}
```

```ts
// backend/src/instrument.ts
// Side-effect module: initializes telemetry before the app and its
// instrumented libraries load. Must be imported first in index.ts.
import { initTelemetry } from "./lib/telemetry.js"

initTelemetry()
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npx vitest run src/lib/telemetry.test.ts`
Expected: PASS.

- [ ] **Step 6: Import instrument first in index.ts**

In `backend/src/index.ts`, add the import so it runs before `express` is imported. Place it immediately after the BigInt shim block (after line 11's closing `};`) and before `import express` (line 13):

```ts
BigInt.prototype.toJSON = function () {
  return Number(this);
};

// Initialize telemetry before importing/creating the app.
import "./instrument.js";

import express from "express";
```

- [ ] **Step 7: Verify backend still builds/starts**

Run: `cd backend && npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 8: Commit**

```bash
git add backend/src/lib/telemetry.ts backend/src/lib/telemetry.test.ts \
  backend/src/instrument.ts backend/src/index.ts \
  backend/package.json backend/package-lock.json
git commit -m "feat(telemetry): initialize @sentry/node from env config

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Capture backend errors in the error handler

**Files:**
- Modify: `backend/src/middleware/errors.ts:143-203`
- Test: `backend/src/middleware/errors.test.ts`

**Interfaces:**
- Consumes: `@sentry/node` (`captureException`); `errorHandler`, `AppError` from `./errors.js`.
- Produces: no new exports — behavior change: `errorHandler` calls `Sentry.captureException(err)` for server-side/unknown failures only (5xx, non-operational AppError, unknown errors), NOT for 4xx client errors (validation, 404, forbidden).

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/middleware/errors.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Request, Response, NextFunction } from "express"

const captureException = vi.fn()
vi.mock("@sentry/node", () => ({ captureException: (...a: unknown[]) => captureException(...a) }))

import { errorHandler, AppError } from "./errors.js"

function mockRes(): Response {
  const res = {} as Response
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}
const req = {} as Request
const next = (() => {}) as NextFunction

beforeEach(() => captureException.mockClear())

describe("errorHandler telemetry", () => {
  it("does NOT capture a 404 AppError (client error)", () => {
    errorHandler(AppError.notFound("nope"), req, mockRes(), next)
    expect(captureException).not.toHaveBeenCalled()
  })

  it("does NOT capture a 403 AppError", () => {
    errorHandler(AppError.forbidden(), req, mockRes(), next)
    expect(captureException).not.toHaveBeenCalled()
  })

  it("captures an unknown error (500)", () => {
    errorHandler(new Error("boom"), req, mockRes(), next)
    expect(captureException).toHaveBeenCalledTimes(1)
  })

  it("captures a non-operational AppError", () => {
    errorHandler(new AppError("bad", 500, false), req, mockRes(), next)
    expect(captureException).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/middleware/errors.test.ts`
Expected: FAIL — `captureException` not called for the 500/unknown cases (not yet wired).

- [ ] **Step 3: Wire capture into errorHandler**

In `backend/src/middleware/errors.ts`:
- Add at the top with the other imports:
  ```ts
  import * as Sentry from "@sentry/node";
  ```
- In the `AppError` branch (currently lines 145-153), before `res.status(...)`, add:
  ```ts
  if (!err.isOperational || err.statusCode >= 500) {
    Sentry.captureException(err);
  }
  ```
- In the Prisma branch, inside the existing `if (statusCode >= 500)` block (currently line 173-175), add the capture next to the existing `console.error`:
  ```ts
  if (statusCode >= 500) {
    console.error("Prisma error:", err);
    Sentry.captureException(err);
  }
  ```
- In the final unknown-error branch (currently lines 195-202), after `console.error("Unhandled error:", err);` add:
  ```ts
  Sentry.captureException(err);
  ```
- Leave the `ZodError` (400) and malformed-JSON (400) branches untouched — those are client errors and must NOT be captured.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx vitest run src/middleware/errors.test.ts`
Expected: PASS (all four cases).

- [ ] **Step 5: Verify no type errors**

Run: `cd backend && npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/middleware/errors.ts backend/src/middleware/errors.test.ts
git commit -m "feat(telemetry): capture 5xx/unknown backend errors to GlitchTip

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Deployment wiring + env examples + README runbook

**Files:**
- Modify: `docker-compose.coolify.yml:13-22` (frontend build args), `:36-60` (backend env)
- Modify: `.env.coolify.example`
- Modify: `.env.coolify.next.example`
- Modify: `README.md` (add a telemetry subsection under the Coolify docs)

**Interfaces:** none (config + docs only).

- [ ] **Step 1: Add frontend build args**

In `docker-compose.coolify.yml`, under `services.frontend.build.args` (after the existing `VITE_APP_ENV:` line, ~line 22), add:

```yaml
        # GlitchTip DSN for the browser SDK. Empty disables telemetry. MUST be a
        # BUILD variable in Coolify — Vite bakes it in at build time.
        VITE_GLITCHTIP_DSN: ${VITE_GLITCHTIP_DSN:-}
        # Privacy posture: "full" (next/dev, no real PII) or "scrubbed" (prod).
        # Defaults to scrubbed so an unset value fails private. BUILD variable.
        VITE_TELEMETRY_PRIVACY: ${VITE_TELEMETRY_PRIVACY:-scrubbed}
```

- [ ] **Step 2: Add backend runtime env**

In `docker-compose.coolify.yml`, under `services.backend.environment` (after the `SES_FROM_EMAIL` comment, ~line 60), add:

```yaml
      # GlitchTip telemetry (backend). Empty DSN disables it. Runtime vars.
      SENTRY_DSN: ${SENTRY_DSN:-}
      SENTRY_ENVIRONMENT: ${SENTRY_ENVIRONMENT:-}
      TELEMETRY_PRIVACY: ${TELEMETRY_PRIVACY:-scrubbed}
```

- [ ] **Step 3: Add the vars to both env example files**

Append to `.env.coolify.example` (the `dev` template):

```dotenv
# --- GlitchTip telemetry + feedback ---
# Paste the DSN from the GlitchTip "asclepion-dev" project. Empty = disabled.
VITE_GLITCHTIP_DSN=
VITE_TELEMETRY_PRIVACY=full
SENTRY_DSN=
SENTRY_ENVIRONMENT=dev
TELEMETRY_PRIVACY=full
```

Append to `.env.coolify.next.example` (the `next` template):

```dotenv
# --- GlitchTip telemetry + feedback ---
# Paste the DSN from the GlitchTip "asclepion-next" project. Empty = disabled.
VITE_GLITCHTIP_DSN=
VITE_TELEMETRY_PRIVACY=full
SENTRY_DSN=
SENTRY_ENVIRONMENT=next
TELEMETRY_PRIVACY=full
```

- [ ] **Step 4: Document it in the README**

In `README.md`, add a subsection at the end of the `## Deploying to Coolify (next)` area (adjust the heading level to match its neighbors):

```markdown
### Telemetry + feedback (GlitchTip)

Errors (frontend + backend) and in-app tester feedback flow to a **self-hosted
GlitchTip** instance — a separate Coolify resource, shared by `next` and `dev`.

**One-time operator setup (in Coolify, outside this repo):**
1. Create a GlitchTip **Docker Compose** resource (GlitchTip web + worker +
   its own Postgres + Redis) and point a domain at it (e.g.
   `glitchtip.cs4535.cloud`). GlitchTip is independent of the Asclepion app.
2. In GlitchTip, create two projects: `asclepion-next` and `asclepion-dev`.
3. Copy each project's **DSN** into the matching Asclepion deployment:
   - Frontend (mark these **BUILD** variables in Coolify): `VITE_GLITCHTIP_DSN`,
     `VITE_TELEMETRY_PRIVACY`.
   - Backend (runtime): `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `TELEMETRY_PRIVACY`.

**Privacy switch:** `*_TELEMETRY_PRIVACY` / `TELEMETRY_PRIVACY` = `full` on
`next`/`dev` (max data during testing; no real PII there), `scrubbed` in
production (pseudonymous identity, parametrized URLs, no screenshots). Unset
defaults to `scrubbed`. An empty DSN disables telemetry entirely.

**Triage → Linear:** work through issues in GlitchTip; feedback is tagged
`feedback` with a `feedback.type` of `bug`/`confusing`/`idea`. When an issue
deserves a ticket, create the Linear issue and cross-link (paste the GlitchTip
URL onto the Linear issue and the Linear URL back onto the GlitchTip issue).
```

- [ ] **Step 5: Sanity-check compose syntax**

Run (the throwaway values satisfy the existing `:?`-required guards so `config` doesn't abort on them):
```bash
POSTGRES_PASSWORD=x BETTER_AUTH_SECRET=x ADMIN_SECRET=x INTERNAL_SECRET_HEADER=x SEED_PASSWORD=x \
  docker compose -f docker-compose.coolify.yml config >/dev/null && echo OK
```
Expected: prints `OK` (no YAML/interpolation errors). If `docker` is unavailable, skip and rely on review.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.coolify.yml .env.coolify.example .env.coolify.next.example README.md
git commit -m "feat(telemetry): wire GlitchTip env into Coolify compose + document runbook

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phasing note

- **Phase 1 (frontend value):** Tasks 1–4 deliver frontend error telemetry + the feedback widget. Once the operator sets the four frontend vars (Task 7 Steps 1/3), `next` captures errors and feedback end-to-end.
- **Phase 2 (backend):** Tasks 5–6 add backend error capture. Task 7's backend vars complete the wiring.

Tasks are independently reviewable and can merge in one PR against `next`.

## Manual smoke test (after deploy to `next`)

1. On `next.asclepion.cs4535.cloud`, open the app; the FEEDBACK tab shows on the right edge.
2. Trigger a deliberate frontend error (e.g. a route that throws) → confirm it appears in the GlitchTip `asclepion-next` project with a breadcrumb trail and `platform:frontend`.
3. Submit feedback via the widget (type = bug, a message, screenshot on) → confirm a GlitchTip issue tagged `feedback` / `feedback.type:bug`, with breadcrumbs, user (email in `full` mode), route context, and the screenshot attachment.
4. Trigger a backend 500 → confirm capture with `platform:backend`; confirm a 404/validation error does NOT create an issue.
