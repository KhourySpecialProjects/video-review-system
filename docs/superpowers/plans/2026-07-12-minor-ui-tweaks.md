# Minor UI Tweaks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five small, independent frontend UI polish items shipped in one PR into `develop`.

**Architecture:** Pure React/Vite/Tailwind changes. Static swaps (icon, favicon, logo text) plus two components with real logic (an environment banner driven by build-time env flags, and count badges on the reviewer annotation tabs). Logic is extracted into pure/small units so it can be unit-tested without heavy rendering.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind v4 (CSS-var theme), lucide-react icons, Vitest + Testing Library.

## Global Constraints

- All work on branch `vmp-165-minor-ui-tweaks-upload-icon-favicon-logo-dev-banner-tab` (already created off `develop`); one PR back into `develop`.
- Banner copy is EXACT:
  - Local: `Local Development Preview`
  - Coolify dev: `Asclepion 1.0 - This is a Development Preview. Do NOT upload any PII or other sensitive information.`
- Banner visibility precedence: `import.meta.env.DEV` (local) → `import.meta.env.VITE_APP_ENV === 'dev-preview'` (Coolify) → else no banner (production).
- Icons come from `lucide-react`. Theme colors via Tailwind utilities backed by CSS vars (`bg-primary`, `text-primary-foreground`, `bg-warning`, `text-muted-foreground`, `bg-muted-foreground/15`).
- Run frontend commands from `frontend/`. Test: `npx vitest run <path>`. Typecheck: `npx tsc --noEmit -p tsconfig.app.json`.
- Known pre-existing test failures (VideoCard, ClipCard, DrawingCard, TimestampAnnotation) are unrelated — do not attempt to fix; just don't add new failures.

---

### Task 1: Upload button icon

**Files:**
- Modify: `frontend/src/features/video/videoUpload/VideoUpload.tsx` (import line 21; icon usage line 62)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing (visual-only).

- [ ] **Step 1: Swap the import**

In `frontend/src/features/video/videoUpload/VideoUpload.tsx` line 21, change:
```tsx
import { Download, CircleCheckBig, ArrowRight } from "lucide-react"
```
to:
```tsx
import { Upload, CircleCheckBig, ArrowRight } from "lucide-react"
```
(`Download` is used only on line 62 in this file — confirmed via grep — so removing it from the import is safe.)

- [ ] **Step 2: Swap the icon on the button**

Line 62, change:
```tsx
            <Download className="size-5 text-bg-dark text-2xl font-bold" />{" "}
```
to:
```tsx
            <Upload className="size-5 text-bg-dark text-2xl font-bold" />{" "}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/video/videoUpload/VideoUpload.tsx
git commit -m "VMP-165: use upload icon on the Upload Video button"
```

---

### Task 2: Favicon

**Files:**
- Create: `frontend/public/favicon.svg`
- Modify: `frontend/index.html` (line 5)
- Delete: `frontend/public/vite.svg`

**Interfaces:**
- Consumes: nothing.
- Produces: `/favicon.svg` served at site root.

- [ ] **Step 1: Create the favicon**

Create `frontend/public/favicon.svg` (rounded tile in the theme primary color, hex approximation of `oklch(0.55 0.14 45)`, white "A"):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#b0673f"/>
  <text x="50%" y="53%" text-anchor="middle" dominant-baseline="central"
        font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        font-size="40" font-weight="700" fill="#ffffff">A</text>
</svg>
```

- [ ] **Step 2: Point index.html at it**

In `frontend/index.html` line 5, change:
```html
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
```
to:
```html
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

- [ ] **Step 3: Remove the unused Vite favicon**

```bash
git rm frontend/public/vite.svg
```

- [ ] **Step 4: Verify build picks it up**

Run: `npx tsc --noEmit -p tsconfig.app.json` (sanity; no TS impact) — expected: no errors.
Manually confirm `frontend/public/favicon.svg` exists and `index.html` references `/favicon.svg`.

- [ ] **Step 5: Commit**

```bash
git add frontend/public/favicon.svg frontend/index.html
git commit -m "VMP-165: replace Vite favicon with Asclepion 'A' favicon"
```

---

### Task 3: Logo (top-left)

**Files:**
- Modify: `frontend/src/features/layout/Navbar.tsx` (lines 100–108)
- Test: `frontend/src/features/layout/Navbar.test.tsx` (lines 55–58)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing (visual-only).

- [ ] **Step 1: Update the failing test first**

In `frontend/src/features/layout/Navbar.test.tsx`, replace the `renders the logo` test (lines 55–58):
```tsx
    it("renders the logo", () => {
        renderNavbar();
        expect(screen.getByText("CV")).toBeInTheDocument();
    });
```
with:
```tsx
    it("renders the logo", () => {
        renderNavbar();
        expect(screen.getByText("A")).toBeInTheDocument();
        expect(screen.getByText("Asclepion")).toBeInTheDocument();
    });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/layout/Navbar.test.tsx -t "renders the logo"`
Expected: FAIL — `Unable to find an element with the text: A` / `Asclepion` (code still renders "CV").

- [ ] **Step 3: Update the logo markup**

In `frontend/src/features/layout/Navbar.tsx`, replace lines 100–108:
```tsx
            <Link
                to="/"
                className="flex items-center gap-2 text-lg font-bold text-text"
                aria-label="Home"
            >
                <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
                    CV
                </div>
            </Link>
```
with:
```tsx
            <Link
                to="/"
                className="flex items-center gap-2 text-lg font-bold text-text"
                aria-label="Home"
            >
                <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
                    A
                </div>
                <span className="hidden sm:inline">Asclepion</span>
            </Link>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/layout/Navbar.test.tsx`
Expected: PASS (all Navbar tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/layout/Navbar.tsx frontend/src/features/layout/Navbar.test.tsx
git commit -m "VMP-165: replace CV logo with Asclepion 'A' + wordmark"
```

---

### Task 4: Tab count badges (reviewer annotations panel)

**Files:**
- Create: `frontend/src/features/sidebar/TabCountBadge.tsx`
- Test: `frontend/src/features/sidebar/TabCountBadge.test.tsx`
- Modify: `frontend/src/features/sidebar/sidebar.tsx` (import; tab loop ~127–144)

**Interfaces:**
- Consumes: nothing.
- Produces: `TabCountBadge({ count: number })` — renders a small pill when `count > 0`, otherwise `null`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/sidebar/TabCountBadge.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TabCountBadge } from "./TabCountBadge";

describe("TabCountBadge", () => {
  it("renders the count when greater than zero", () => {
    render(<TabCountBadge count={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders nothing when the count is zero", () => {
    const { container } = render(<TabCountBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/sidebar/TabCountBadge.test.tsx`
Expected: FAIL — cannot resolve `./TabCountBadge` (module missing).

- [ ] **Step 3: Implement the component**

Create `frontend/src/features/sidebar/TabCountBadge.tsx`:
```tsx
/**
 * @description Small count pill shown next to an annotation tab label.
 * Renders nothing when the count is zero so empty tabs stay clean.
 * @param count - Number of entries on the tab
 */
export function TabCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-muted-foreground/15 px-1 text-xs font-medium text-muted-foreground tabular-nums">
      {count}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/sidebar/TabCountBadge.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire the badge into the tab list**

In `frontend/src/features/sidebar/sidebar.tsx`, add the import near the other sidebar imports (after line 13):
```tsx
import { TabCountBadge } from "./TabCountBadge"
```

Then in the tab loop, replace the label span (lines 140–142):
```tsx
                  <span className="relative z-10">
                    {value === "clips" ? "Clips" : value === "notes" ? "Notes" : "Draw"}
                  </span>
```
with a version that appends the badge (uses the already-declared `clips`, `notes`, `drawings` arrays from lines 107–109):
```tsx
                  <span className="relative z-10 inline-flex items-center">
                    {value === "clips" ? "Clips" : value === "notes" ? "Notes" : "Draw"}
                    <TabCountBadge
                      count={
                        value === "clips"
                          ? clips.length
                          : value === "notes"
                            ? notes.length
                            : drawings.length
                      }
                    />
                  </span>
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/sidebar/TabCountBadge.tsx frontend/src/features/sidebar/TabCountBadge.test.tsx frontend/src/features/sidebar/sidebar.tsx
git commit -m "VMP-165: add count badges to reviewer annotation tabs"
```

---

### Task 5: Environment banner

**Files:**
- Create: `frontend/src/vite-env.d.ts`
- Create: `frontend/src/features/layout/DevBanner.tsx`
- Test: `frontend/src/features/layout/DevBanner.test.tsx`
- Modify: `frontend/src/routes/root.tsx` (import; render above `<Navbar>` ~line 36)
- Modify: `frontend/Dockerfile` (before `RUN npm run build`)
- Modify: `docker-compose.coolify.yml` (frontend service `build`)

**Interfaces:**
- Consumes: `import.meta.env` (`DEV`, `VITE_APP_ENV`).
- Produces:
  - `resolveEnvBanner(env: { DEV?: boolean; VITE_APP_ENV?: string }): { text: string } | null`
  - `DevBanner()` — React component rendering the strip, or `null` in production.

- [ ] **Step 1: Declare the custom env var for TypeScript**

Create `frontend/src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 2: Write the failing test for the resolver**

Create `frontend/src/features/layout/DevBanner.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { resolveEnvBanner, DevBanner } from "./DevBanner";

describe("resolveEnvBanner", () => {
  it("returns the local banner when DEV is true", () => {
    expect(resolveEnvBanner({ DEV: true })).toEqual({
      text: "Local Development Preview",
    });
  });

  it("local takes precedence over the dev-preview flag", () => {
    expect(
      resolveEnvBanner({ DEV: true, VITE_APP_ENV: "dev-preview" }),
    ).toEqual({ text: "Local Development Preview" });
  });

  it("returns the Coolify banner for the dev-preview flag", () => {
    expect(
      resolveEnvBanner({ DEV: false, VITE_APP_ENV: "dev-preview" }),
    ).toEqual({
      text: "Asclepion 1.0 - This is a Development Preview. Do NOT upload any PII or other sensitive information.",
    });
  });

  it("returns null in production (no flags)", () => {
    expect(resolveEnvBanner({ DEV: false })).toBeNull();
  });
});

describe("DevBanner", () => {
  it("renders a banner in the test env (DEV is true under vitest)", () => {
    render(<DevBanner />);
    expect(screen.getByText("Local Development Preview")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/features/layout/DevBanner.test.tsx`
Expected: FAIL — cannot resolve `./DevBanner` (module missing).

- [ ] **Step 4: Implement the resolver and component**

Create `frontend/src/features/layout/DevBanner.tsx`:
```tsx
type BannerConfig = { text: string }

/**
 * @description Resolves which environment banner (if any) to show, from
 * build-time env. Local dev takes precedence over the Coolify dev-preview
 * flag; production (neither set) returns null.
 * @param env - Subset of import.meta.env
 */
export function resolveEnvBanner(env: {
  DEV?: boolean
  VITE_APP_ENV?: string
}): BannerConfig | null {
  if (env.DEV) return { text: "Local Development Preview" }
  if (env.VITE_APP_ENV === "dev-preview") {
    return {
      text: "Asclepion 1.0 - This is a Development Preview. Do NOT upload any PII or other sensitive information.",
    }
  }
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
      className="w-full bg-warning px-4 py-1.5 text-center text-xs font-medium text-black"
    >
      {banner.text}
    </div>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/features/layout/DevBanner.test.tsx`
Expected: PASS (5 tests). (Under vitest `import.meta.env.DEV` is `true`, so the component renders the local banner.)

- [ ] **Step 6: Mount the banner above the Navbar**

In `frontend/src/routes/root.tsx`, add the import next to the Navbar import (line 6):
```tsx
import { DevBanner } from "@/features/layout/DevBanner";
```
Then render `<DevBanner />` immediately before `<Navbar scrollContainerRef={mainRef} />` (line 36):
```tsx
                <DevBanner />
                <Navbar scrollContainerRef={mainRef} />
```

- [ ] **Step 7: Wire the build flag into the frontend Dockerfile**

In `frontend/Dockerfile`, add the ARG/ENV immediately before `RUN npm run build`:
```dockerfile
COPY frontend/ .
COPY shared ../shared
ARG VITE_APP_ENV=""
ENV VITE_APP_ENV=$VITE_APP_ENV
RUN npm run build
```

- [ ] **Step 8: Pass the flag from the Coolify compose**

In `docker-compose.coolify.yml`, update the `frontend` service `build` block to pass the arg:
```yaml
  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
      args:
        VITE_APP_ENV: dev-preview
    restart: unless-stopped
    expose:
      - "80"
    depends_on:
      - backend
```

- [ ] **Step 9: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/vite-env.d.ts frontend/src/features/layout/DevBanner.tsx frontend/src/features/layout/DevBanner.test.tsx frontend/src/routes/root.tsx frontend/Dockerfile docker-compose.coolify.yml
git commit -m "VMP-165: add non-prod environment banner (local + Coolify dev)"
```

---

### Task 6: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full frontend test suite**

Run: `cd frontend && npx vitest run`
Expected: all NEW tests pass; failure count no higher than the known pre-existing baseline (VideoCard, ClipCard, DrawingCard, TimestampAnnotation).

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 3: Visual smoke (manual, via running dev server)**

Confirm: Upload button shows an upload icon; browser tab shows the "A" favicon; top-left shows "A Asclepion"; an amber "Local Development Preview" strip sits above the header; a reviewer video's Clips/Notes tabs show count badges (Draw shows none when empty).

- [ ] **Step 4: Push and open the PR** (handled by the executing skill / operator).
