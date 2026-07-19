# Asclepion Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public, on-brand Asclepion landing page at `/` for logged-out visitors, with a clear path to login.

**Architecture:** A new self-contained `Landing` component owns `/` behind a splitter loader that renders the page for anonymous visitors and redirects authenticated users to their role home. To free up `/`, the caregiver dashboard moves from the `/` index to `/home`; the authenticated `Root` shell becomes a pathless layout route so every other path is unchanged.

**Tech Stack:** React 19, React Router v7 (`createBrowserRouter`, loaders, `redirect`), Tailwind CSS v4 (existing oklch design tokens), Base UI Button, Vitest + Testing Library.

## Global Constraints

- **Design system:** use existing tokens/components only — `text-primary`, `text-primary-foreground`, `text-muted-foreground`, `bg-primary`, `shadow-l`, `text-balance`. No new colors, no logo artwork. Light mode is the app default.
- **Reused components:** `@/components/ui/button` (Button), `@/components/ThemeToggle`, `@/features/layout/AppVersion`.
- **Login CTA:** a real router `Link` to `/login` styled with `buttonVariants({ size: "lg" })` — `role="link"` (correct for a navigation) with the app's button look. (Resolves a conflict vs. the `<Button render={<Link/>}>` idiom, which Base UI renders as `role="button"`; user chose the real link. Trade-off accepted: no Button press animation.)
- **Tagline copy (verbatim):** `Helping families, caregivers, and clinicians advance Angelman Syndrome research together.`
- **Footer copy (verbatim):** `Angelman Syndrome Video Management Portal` · `In collaboration with Boston Children's Hospital` · `<AppVersion />`.
- **Role home targets:** caregiver → `/home`; every other authenticated role → `/reviews`.
- **Commands (run from `frontend/`):** test a file `npx vitest run <path>`; full suite `npm run test`; typecheck+build `npm run build`; lint `npm run lint`.
- **Tests are colocated** with their subject (`*.test.tsx` next to the file).

---

### Task 1: Landing page component

**Files:**
- Create: `frontend/src/features/landing/Landing.tsx`
- Test: `frontend/src/features/landing/Landing.test.tsx`

**Interfaces:**
- Consumes: `Button` (`@/components/ui/button`), `ThemeToggle` (`@/components/ThemeToggle`), `AppVersion` (`@/features/layout/AppVersion`), `Link` (`react-router`).
- Produces: `export function Landing(): JSX.Element` — a full-viewport page with the wordmark, tagline, a `Log in` link to `/login`, a theme toggle, and a footer. No router loader here (added in Task 2).

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/landing/Landing.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Landing } from "./Landing";

function renderLanding() {
    const router = createMemoryRouter([
        { path: "/", element: <Landing /> },
        { path: "/login", element: <div>Login Page</div> },
    ]);
    return render(<RouterProvider router={router} />);
}

describe("Landing", () => {
    it("renders the Asclepion wordmark", () => {
        renderLanding();
        expect(screen.getByRole("heading", { name: "Asclepion" })).toBeInTheDocument();
    });

    it("renders the mission tagline", () => {
        renderLanding();
        expect(
            screen.getByText(/advance angelman syndrome research together/i)
        ).toBeInTheDocument();
    });

    it("renders a Log in call to action linking to /login", () => {
        renderLanding();
        const cta = screen.getByRole("link", { name: /log in/i });
        expect(cta).toHaveAttribute("href", "/login");
    });

    it("renders the theme toggle", () => {
        renderLanding();
        expect(
            screen.getByRole("button", { name: /toggle theme/i })
        ).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/landing/Landing.test.tsx`
Expected: FAIL — cannot resolve `./Landing` (module does not exist).

- [ ] **Step 3: Write the component**

Create `frontend/src/features/landing/Landing.tsx`:

```tsx
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppVersion } from "@/features/layout/AppVersion";
import { cn } from "@/lib/utils";

/**
 * @description Public landing page — the app's front door at `/`, shown only
 * to logged-out visitors. Authenticated users never reach it: the route's
 * splitter loader (`landingLoader`) redirects them to their role home before
 * this renders. Deliberately minimal — no app navbar/shell, just brand,
 * tagline, and a login CTA — and built entirely from existing design tokens.
 */
export function Landing() {
    return (
        <div className="relative grid min-h-screen grid-rows-[auto_1fr_auto] overflow-hidden">
            {/* Quiet warm glow behind the hero — the only decorative flourish. */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/3 -z-10 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
            />

            <header className="flex justify-end p-4">
                <ThemeToggle />
            </header>

            <main className="flex flex-col items-center justify-center gap-6 px-6 text-center">
                <div
                    aria-hidden="true"
                    className="flex size-24 items-center justify-center rounded-3xl bg-primary text-5xl font-bold text-primary-foreground shadow-l"
                >
                    A
                </div>
                <h1 className="text-5xl font-bold tracking-tight text-primary sm:text-6xl">
                    Asclepion
                </h1>
                <p className="max-w-md text-lg leading-relaxed text-balance text-muted-foreground">
                    Helping families, caregivers, and clinicians advance Angelman
                    Syndrome research together.
                </p>
                <Link
                    to="/login"
                    className={cn(buttonVariants({ size: "lg" }), "mt-2")}
                >
                    Log in
                    <ArrowRight className="size-4" />
                </Link>
            </main>

            <footer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 p-6 text-center text-xs text-muted-foreground">
                <span>Angelman Syndrome Video Management Portal</span>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span>In collaboration with Boston Children&apos;s Hospital</span>
                <span aria-hidden="true" className="opacity-40">·</span>
                <AppVersion />
            </footer>
        </div>
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/landing/Landing.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/landing/Landing.tsx frontend/src/features/landing/Landing.test.tsx
git commit -m "feat(landing): add Asclepion landing page component (VMP-180)"
```

---

### Task 2: Root splitter loader

**Files:**
- Modify: `frontend/src/hooks/auth-guard.ts` (add `landingLoader`; ~end of file)
- Test: `frontend/src/hooks/auth-guard.test.ts` (add a `describe` block; update the import on line 6)

**Interfaces:**
- Consumes: module-private `fetchSession()`, `redirect` (react-router), `Role` (`@shared/auth`) — all already present in `auth-guard.ts`.
- Produces: `export async function landingLoader(): Promise<Response | null>` — returns `null` when there is no session (render `<Landing/>`), `redirect("/home")` for a `CAREGIVER`, `redirect("/reviews")` for any other authenticated role.

- [ ] **Step 1: Write the failing test**

In `frontend/src/hooks/auth-guard.test.ts`, change the import on line 6 from:

```ts
import { getSessionRole, authGuardLoader } from "./auth-guard";
```

to:

```ts
import { getSessionRole, authGuardLoader, landingLoader } from "./auth-guard";
```

Then append this `describe` block to the end of the file:

```ts
describe("landingLoader", () => {
    beforeEach(() => getSessionMock.mockReset());

    it("renders the landing (returns null) for unauthenticated visitors", async () => {
        getSessionMock.mockResolvedValue({ data: null });
        expect(await landingLoader()).toBeNull();
    });

    it("redirects an authenticated caregiver to /home", async () => {
        getSessionMock.mockResolvedValue({ data: { user: { role: "CAREGIVER" } } });
        const res = await landingLoader();
        expect(res).toBeInstanceOf(Response);
        expect((res as Response).headers.get("Location")).toBe("/home");
    });

    it("redirects other authenticated roles to /reviews", async () => {
        getSessionMock.mockResolvedValue({
            data: { user: { role: "CLINICAL_REVIEWER" } },
        });
        const res = await landingLoader();
        expect(res).toBeInstanceOf(Response);
        expect((res as Response).headers.get("Location")).toBe("/reviews");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/hooks/auth-guard.test.ts`
Expected: FAIL — `landingLoader` is not exported / not a function.

- [ ] **Step 3: Add the loader**

Append to `frontend/src/hooks/auth-guard.ts` (after `adminGuardLoader`):

```ts
/**
 * @description Splitter loader for the public root route `/`. Unauthenticated
 * visitors get the landing page (returns `null`, so the route renders
 * `<Landing/>`). Authenticated users are redirected to their role home so `/`
 * never shows the public front door to someone already signed in. Reuses the
 * shared in-flight session read.
 *
 * @returns `null` to render the landing, or a redirect to the role's home.
 */
export async function landingLoader() {
    const { data: session } = await fetchSession();
    if (!session) return null;
    const role = (session.user as { role?: Role }).role;
    if (role === "CAREGIVER") return redirect("/home");
    return redirect("/reviews");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/hooks/auth-guard.test.ts`
Expected: PASS (existing tests + 3 new `landingLoader` tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/auth-guard.ts frontend/src/hooks/auth-guard.test.ts
git commit -m "feat(landing): add root splitter loader routing auth'd users home (VMP-180)"
```

---

### Task 3: Wire the router and move the caregiver dashboard to `/home`

This task is atomic: the router restructure and the reference updates must land together, or authenticated caregivers land on a broken `/`. After it, `/` is public and every other path is unchanged except the caregiver dashboard (`/` → `/home`) and its search tab (`/search` → `/home/search`).

**Files:**
- Modify: `frontend/src/router.tsx` (imports; the `/` routes)
- Modify: `frontend/src/hooks/auth-guard.ts` (two `redirect("/")` → `redirect("/home")`)
- Modify: `frontend/src/features/layout/Navbar.tsx:83` (caregiver logo link)
- Modify: `frontend/src/routes/video-view.tsx:36` (caregiver back-link)
- Modify: `frontend/src/routes/home.tsx` (tab active-state + tab navigation)

**Interfaces:**
- Consumes: `Landing` (Task 1), `landingLoader` (Task 2).
- Produces: `/` served by `<Landing/>` + `landingLoader`; caregiver dashboard at `/home`, its search tab at `/home/search`; all other routes unchanged.

- [ ] **Step 1: Add the landing imports to `router.tsx`**

Add near the other feature imports:

```tsx
import { Landing } from "./features/landing/Landing";
```

And extend the existing auth-guard import (currently line ~21) to include `landingLoader`:

```tsx
import { authGuardLoader, caregiverGuardLoader, nonCaregiverGuardLoader, adminGuardLoader, landingLoader } from "./hooks/auth-guard";
```

- [ ] **Step 2: Add the public landing route and make the app shell pathless**

In the `createBrowserRouter([...])` array, add the landing route as the **first** element, then change the existing app-shell route from `path: "/"` to a pathless layout. The block currently reads:

```tsx
export const router = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        loader: authGuardLoader,
        children: [
```

Change it to:

```tsx
export const router = createBrowserRouter([
    {
        path: "/",
        element: <Landing />,
        loader: landingLoader,
    },
    {
        element: <Root />,
        loader: authGuardLoader,
        children: [
```

(Removing `path: "/"` from the `<Root />` route makes it a pathless layout. Its children keep their explicit `path:` segments, so `/reviews`, `/admin`, `/videos/:videoId`, `/tutorials`, `/review/...` all resolve to the same URLs as before.)

- [ ] **Step 3: Move the caregiver `Home` route to `/home`**

Inside the `caregiverGuardLoader` children, the `Home` route currently has no `path` (it was the index of `/`):

```tsx
                    {
                        element: <Home />,
                        loader: homeLoader(queryClient),
                        children: [
                            { index: true, element: <></> },
                            {
                                path: "search",
                                element: <AllVideos />,
                                loader: searchLoader(queryClient),
                            },
                        ],
                    },
```

Add `path: "home"`:

```tsx
                    {
                        path: "home",
                        element: <Home />,
                        loader: homeLoader(queryClient),
                        children: [
                            { index: true, element: <></> },
                            {
                                path: "search",
                                element: <AllVideos />,
                                loader: searchLoader(queryClient),
                            },
                        ],
                    },
```

(Dashboard is now `/home`; the search tab is now `/home/search`.)

- [ ] **Step 4: Point the caregiver-home redirects/links at `/home`**

`frontend/src/hooks/auth-guard.ts` — both occurrences (in `nonCaregiverGuardLoader` ~line 80 and `adminGuardLoader` ~line 94):

```ts
    if (role === "CAREGIVER") return redirect("/");
```

become:

```ts
    if (role === "CAREGIVER") return redirect("/home");
```

`frontend/src/features/layout/Navbar.tsx:83` — the logo link:

```tsx
                to={user?.role && user.role !== "CAREGIVER" ? "/reviews" : "/"}
```

becomes:

```tsx
                to={user?.role && user.role !== "CAREGIVER" ? "/reviews" : "/home"}
```

`frontend/src/routes/video-view.tsx:36` — the caregiver back-link:

```tsx
                to="/"
```

becomes:

```tsx
                to="/home"
```

`frontend/src/routes/home.tsx` — the tab active-state (line ~24) and tab navigation (line ~35):

```tsx
    const activeTab: TabValue = location.pathname === "/search" ? "all" : "recent";
```

becomes:

```tsx
    const activeTab: TabValue = location.pathname === "/home/search" ? "all" : "recent";
```

and:

```tsx
        navigate(tab === "all" ? "/search" : "/");
```

becomes:

```tsx
        navigate(tab === "all" ? "/home/search" : "/home");
```

- [ ] **Step 5: Typecheck, lint, and run the full suite**

Run: `cd frontend && npm run build && npm run lint && npm run test`
Expected: build succeeds (no TS errors), lint clean, all tests pass — including Task 1 & 2 tests. `login.ts`'s post-login `redirect("/")` is intentionally left unchanged; it now flows through `landingLoader`, which forwards each role to its home.

- [ ] **Step 6: Manual smoke test in the dev server**

Run: `cd frontend && npm run dev`, then verify:
- Logged out, visit `/` → the Asclepion landing renders; **Log in** navigates to `/login`; theme toggle flips light/dark.
- Logged in as a caregiver, visit `/` → redirected to `/home` (dashboard); the recent/all tabs switch between `/home` and `/home/search`; the navbar logo returns to `/home`.
- Logged in as a reviewer/coordinator/sysadmin, visit `/` → redirected to `/reviews`.
- Log in from `/login` as each role → lands on the correct home.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/router.tsx frontend/src/hooks/auth-guard.ts frontend/src/features/layout/Navbar.tsx frontend/src/routes/video-view.tsx frontend/src/routes/home.tsx
git commit -m "feat(landing): serve landing at /, move caregiver dashboard to /home (VMP-180)"
```

---

## Notes for the implementer

- **Why the pathless layout works:** for URL `/`, only the `path: "/"` Landing route matches — the pathless `<Root/>` layout has no index child anymore, so it contributes nothing at `/`. For `/home`, `/reviews`, etc., the pathless layout matches via its child `path:` segments and the auth guards run as before.
- **Do not** change `hooks/use-login.ts`. Its `redirect("/")` is deliberate — the splitter re-routes by role.
- **About page** is intentionally out of scope; the footer already leaves room for a future link.
```
