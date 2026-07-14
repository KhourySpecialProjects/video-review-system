# Non-caregiver "Failed to fetch videos" Toast Fix (VMP-166) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the 403-driven "Failed to fetch videos" (and sibling "Failed to load video" / "Failed to search videos") toasts that flash for non-caregivers on caregiver-only routes, by role-gating the guarded prefetches and relocating query error toasts out of `queryFn`.

**Architecture:** Frontend only. React Router runs matched loaders in parallel, so the caregiver-only prefetch loaders race the `caregiverGuardLoader` redirect and issue caregiver-only requests that 403 for non-caregivers. Fix: (1) only prefetch when the session role is `CAREGIVER`; (2) move the error toast to a single `QueryCache.onError` handler driven by `query.meta.errorMessage`; (3) point the Home logo at the role-appropriate landing page.

**Tech Stack:** React, React Router (data routers/loaders), TanStack Query, better-auth client, Vitest + Testing Library, sonner.

## Global Constraints

- Frontend only: no backend, no Prisma/schema, no migration.
- Preserve Suspense-streaming: the `prefetchQuery` call stays fire-and-forget; only the cached role check is awaited.
- Error toasts must fire at most once per query error (no per-attempt / StrictMode duplication).
- `getSessionRole()` reads the better-auth session, which is already cached by `authGuardLoader` — do not add a separate network fetch.
- Commit trailer on every commit: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Frontend commands run from `frontend/`.

---

## File Structure

- `frontend/src/hooks/auth-guard.ts` — export the existing private `getSessionRole()`.
- `frontend/src/lib/video.service.ts` — add `prefetchIfCaregiver`; make the three loaders async + role-gated; remove `toast.error` from the three `queryFn`s and add `meta.errorMessage`.
- `frontend/src/lib/video.service.test.ts` — new: role-gating tests for the three loaders.
- `frontend/src/lib/queryClient.ts` — add a `QueryCache({ onError })` wired to an exported `toastQueryError`.
- `frontend/src/lib/queryClient.test.ts` — new: `toastQueryError` unit tests.
- `frontend/src/features/layout/Navbar.tsx` — role-aware logo link.
- `frontend/src/features/layout/Navbar.test.tsx` — add logo-href-per-role tests.

---

### Task 1: Role-gate the caregiver-only prefetch loaders

**Files:**
- Modify: `frontend/src/hooks/auth-guard.ts`
- Modify: `frontend/src/lib/video.service.ts`
- Test: `frontend/src/lib/video.service.test.ts` (create)

**Interfaces:**
- Produces: `getSessionRole(): Promise<Role | null>` (now exported from `auth-guard.ts`); `homeLoader`, `searchLoader`, `videoViewLoader` return loaders that only prefetch when the role is `CAREGIVER`. Return shapes are unchanged (`{ limit, offset }`, `{ searchParams, q }`, `{ videoId }`).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/video.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { getSession: getSessionMock },
}));

import { homeLoader, searchLoader, videoViewLoader } from "./video.service";

function makeQc() {
  const qc = new QueryClient();
  const spy = vi.spyOn(qc, "prefetchQuery").mockResolvedValue(undefined);
  return { qc, spy };
}

const asCaregiver = () =>
  getSessionMock.mockResolvedValue({ data: { user: { role: "CAREGIVER" } } });
const asSysadmin = () =>
  getSessionMock.mockResolvedValue({ data: { user: { role: "SYSADMIN" } } });

describe("caregiver-gated prefetch loaders", () => {
  beforeEach(() => getSessionMock.mockReset());

  it("homeLoader prefetches for a caregiver and returns pagination", async () => {
    asCaregiver();
    const { qc, spy } = makeQc();
    const data = await homeLoader(qc)({
      request: new Request("http://localhost/?limit=10&offset=0"),
    } as any);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(data).toEqual({ limit: 10, offset: 0 });
  });

  it("homeLoader does NOT prefetch for a non-caregiver but still returns pagination", async () => {
    asSysadmin();
    const { qc, spy } = makeQc();
    const data = await homeLoader(qc)({
      request: new Request("http://localhost/?limit=10&offset=0"),
    } as any);
    expect(spy).not.toHaveBeenCalled();
    expect(data).toEqual({ limit: 10, offset: 0 });
  });

  it("searchLoader prefetches for a caregiver only", async () => {
    asCaregiver();
    const { qc, spy } = makeQc();
    await searchLoader(qc)({
      request: new Request("http://localhost/search?q=cat"),
    } as any);
    expect(spy).toHaveBeenCalledTimes(1);

    asSysadmin();
    const { qc: qc2, spy: spy2 } = makeQc();
    const data = await searchLoader(qc2)({
      request: new Request("http://localhost/search?q=cat"),
    } as any);
    expect(spy2).not.toHaveBeenCalled();
    expect(data).toEqual({ searchParams: "q=cat", q: "cat" });
  });

  it("videoViewLoader prefetches for a caregiver only", async () => {
    asCaregiver();
    const { qc, spy } = makeQc();
    await videoViewLoader(qc)({ params: { videoId: "v1" } } as any);
    expect(spy).toHaveBeenCalledTimes(1);

    asSysadmin();
    const { qc: qc2, spy: spy2 } = makeQc();
    const data = await videoViewLoader(qc2)({ params: { videoId: "v1" } } as any);
    expect(spy2).not.toHaveBeenCalled();
    expect(data).toEqual({ videoId: "v1" });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/video.service.test.ts`
Expected: FAIL — non-caregiver cases still call `prefetchQuery` (loaders currently prefetch unconditionally), and/or the loaders are not awaitable as written.

- [ ] **Step 3: Export `getSessionRole`**

In `frontend/src/hooks/auth-guard.ts`, change the declaration:

```ts
export async function getSessionRole(): Promise<Role | null> {
```

(It is currently `async function getSessionRole(...)` — just add `export`. Leave the body unchanged.)

- [ ] **Step 4: Add `prefetchIfCaregiver` and role-gate the three loaders**

In `frontend/src/lib/video.service.ts`:

Add the import (near the other imports at the top):

```ts
import { getSessionRole } from "@/hooks/auth-guard";
```

Add the helper (place it just above `homeLoader`, in the "Route loaders" section):

```ts
/**
 * @description Fires a caregiver-only list/stream prefetch only when the
 * current session role is CAREGIVER. The caregiver routes are guarded by
 * `caregiverGuardLoader`, which redirects non-caregivers — but React Router
 * runs matched loaders in parallel, so without this gate the prefetch races
 * the redirect and issues a caregiver-only request that 403s for a
 * non-caregiver (VMP-166). The prefetch stays fire-and-forget so the page
 * still streams in via Suspense; only the cached role check is awaited.
 *
 * @param queryClient - The shared TanStack QueryClient
 * @param query - The query options to prefetch when the user is a caregiver
 */
async function prefetchIfCaregiver(
    queryClient: QueryClient,
    query: Parameters<QueryClient["prefetchQuery"]>[0],
): Promise<void> {
    const role = await getSessionRole();
    if (role === "CAREGIVER") {
        queryClient.prefetchQuery(query);
    }
}
```

Change `homeLoader` to:

```ts
export function homeLoader(queryClient: QueryClient) {
    return async ({ request }: LoaderFunctionArgs): Promise<HomeLoaderData> => {
        const url = new URL(request.url);
        const limit = Number(url.searchParams.get("limit") ?? "10");
        const offset = Number(url.searchParams.get("offset") ?? "0");
        await prefetchIfCaregiver(queryClient, homeVideosQuery(limit, offset));
        return { limit, offset };
    };
}
```

Change `searchLoader` to:

```ts
export function searchLoader(queryClient: QueryClient) {
    return async ({ request }: LoaderFunctionArgs): Promise<SearchLoaderData> => {
        const url = new URL(request.url);
        const q = url.searchParams.get("q") ?? "";
        const searchParams = url.searchParams.toString();
        await prefetchIfCaregiver(queryClient, searchVideosQuery(searchParams));
        return { searchParams, q };
    };
}
```

Change `videoViewLoader` to:

```ts
export function videoViewLoader(queryClient: QueryClient) {
    return async ({ params }: LoaderFunctionArgs): Promise<VideoViewLoaderData> => {
        const { videoId } = params;
        if (!videoId) {
            throw new Response("Missing videoId", { status: 400 });
        }
        await prefetchIfCaregiver(queryClient, videoStreamQuery(videoId));
        return { videoId };
    };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/video.service.test.ts`
Expected: PASS (4 tests).

If tsc later flags the `prefetchIfCaregiver` parameter type, widen it to accept the `queryOptions(...)` results (e.g. import and use `FetchQueryOptions` from `@tanstack/react-query`); the three call sites pass `homeVideosQuery(...)` / `searchVideosQuery(...)` / `videoStreamQuery(...)`.

- [ ] **Step 6: Typecheck**

Run: `cd frontend && npx tsc -b`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/hooks/auth-guard.ts frontend/src/lib/video.service.ts frontend/src/lib/video.service.test.ts
git commit -m "fix: only prefetch caregiver videos for caregivers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Relocate query error toasts to a QueryCache handler

**Files:**
- Modify: `frontend/src/lib/queryClient.ts`
- Modify: `frontend/src/lib/video.service.ts`
- Test: `frontend/src/lib/queryClient.test.ts` (create)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `toastQueryError(error, query)` exported from `queryClient.ts`, wired into the shared `queryClient` via `QueryCache({ onError })`. The three caregiver queries carry `meta.errorMessage` instead of calling `toast.error` inside their `queryFn`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/queryClient.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { toastErrorMock } = vi.hoisted(() => ({ toastErrorMock: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: toastErrorMock } }));

import { toastQueryError } from "./queryClient";

describe("toastQueryError", () => {
  beforeEach(() => toastErrorMock.mockReset());

  it("toasts the query's meta.errorMessage exactly once", () => {
    toastQueryError(new Error("boom"), {
      meta: { errorMessage: "Failed to fetch videos" },
    } as any);
    expect(toastErrorMock).toHaveBeenCalledTimes(1);
    expect(toastErrorMock).toHaveBeenCalledWith("Failed to fetch videos");
  });

  it("does nothing when meta.errorMessage is absent", () => {
    toastQueryError(new Error("boom"), { meta: undefined } as any);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("does nothing when meta.errorMessage is not a string", () => {
    toastQueryError(new Error("boom"), { meta: { errorMessage: 42 } } as any);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/queryClient.test.ts`
Expected: FAIL — `toastQueryError` is not exported.

- [ ] **Step 3: Add the handler and wire the QueryCache**

In `frontend/src/lib/queryClient.ts`:

Change the import line to add `QueryCache` and `Query`, and import `toast`:

```ts
import { QueryClient, QueryCache, type Query } from "@tanstack/react-query";
import { toast } from "sonner";
```

Add the handler above the `queryClient` export:

```ts
/**
 * @description Centralized query error handler. Fires once per query error
 * (after retries) — not per component or per attempt — so error toasts never
 * duplicate under React StrictMode. Only queries that opt in by setting
 * `meta.errorMessage` produce a toast; everything else is silent here and
 * relies on its own handling.
 *
 * @param _error - The thrown query error (unused; the message comes from meta)
 * @param query - The failed query, whose `meta.errorMessage` drives the toast
 */
export function toastQueryError(_error: unknown, query: Query): void {
  const message = query.meta?.errorMessage;
  if (typeof message === "string") {
    toast.error(message);
  }
}
```

Change the `queryClient` construction to install the cache:

```ts
export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: toastQueryError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/queryClient.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Remove the in-`queryFn` toasts and add `meta.errorMessage`**

In `frontend/src/lib/video.service.ts`, update the three query definitions.

`homeVideosQuery` — replace its `queryFn`/options so the toast is gone and `meta` is added:

```ts
        queryFn: async () => {
            const res = await apiFetch(`/videos?limit=${limit}&offset=${offset}`);
            if (!res.ok) {
                throw new Error("Failed to fetch videos");
            }
            return res.json() as Promise<VideoListResponse>;
        },
        staleTime: LIST_STALE_MS,
        refetchInterval: LIST_STALE_MS,
        meta: { errorMessage: "Failed to fetch videos" },
```

`searchVideosQuery`:

```ts
        queryFn: async () => {
            const res = await apiFetch(`/videos/search?${searchParams}`);
            if (!res.ok) {
                throw new Error("Failed to search videos");
            }
            return res.json() as Promise<VideoListResponse>;
        },
        meta: { errorMessage: "Failed to search videos" },
```

`videoStreamQuery` — remove the toast in its `queryFn` and add `meta` alongside the existing `staleTime`/`refetchInterval`:

```ts
        queryFn: async () => {
            const res = await apiFetch(`/videos/${videoId}/stream`);
            if (!res.ok) {
                throw new Error("Failed to fetch stream URL");
            }
            return res.json() as Promise<VideoStreamResponse>;
        },
        staleTime: (query) =>
            refreshMs(query.state.data as VideoStreamResponse | undefined) ?? 0,
        refetchInterval: (query) =>
            refreshMs(query.state.data as VideoStreamResponse | undefined) ?? false,
        meta: { errorMessage: "Failed to load video" },
```

Then remove the now-unused `import { toast } from "sonner";` at the top of `video.service.ts` **only if** `toast` is no longer referenced anywhere else in the file (tsc/lint will flag it if it is still used — if so, leave the import).

- [ ] **Step 6: Verify tests, types, and lint**

Run: `cd frontend && npx vitest run src/lib/video.service.test.ts src/lib/queryClient.test.ts`
Expected: PASS.

Run: `cd frontend && npx tsc -b`
Expected: PASS.

Run: `cd frontend && npm run lint`
Expected: no new errors (an unused `toast` import, if left in, would be flagged — remove it per Step 5).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/queryClient.ts frontend/src/lib/queryClient.test.ts frontend/src/lib/video.service.ts
git commit -m "fix: move query error toasts to a single QueryCache handler

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Role-aware Home logo link

**Files:**
- Modify: `frontend/src/features/layout/Navbar.tsx`
- Modify: `frontend/src/features/layout/Navbar.test.tsx`

**Interfaces:**
- Consumes: the existing `user` from `useAuth()` already in `Navbar`.
- Produces: the logo `<Link>` targets `/reviews` for non-caregivers and `/` otherwise. No new exports.

- [ ] **Step 1: Write the failing tests**

In `frontend/src/features/layout/Navbar.test.tsx`, add these two tests inside the `describe("Navbar", ...)` block:

```ts
    it("logo links to /reviews for a non-caregiver", () => {
        authState.user = { name: "Sam Admin", role: "SYSADMIN" };
        renderNavbar();
        expect(screen.getByLabelText("Home")).toHaveAttribute("href", "/reviews");
    });

    it("logo links to / for a caregiver", () => {
        authState.user = { name: "Casey Care", role: "CAREGIVER" };
        renderNavbar();
        expect(screen.getByLabelText("Home")).toHaveAttribute("href", "/");
    });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/features/layout/Navbar.test.tsx`
Expected: FAIL — the non-caregiver case gets `href="/"` (the logo is hard-coded to `/`).

- [ ] **Step 3: Make the logo link role-aware**

In `frontend/src/features/layout/Navbar.tsx`, change the logo `<Link>`'s `to` prop:

```tsx
            <Link
                to={user?.role && user.role !== "CAREGIVER" ? "/reviews" : "/"}
                className="flex items-center gap-2 text-lg font-bold text-text"
                aria-label="Home"
            >
```

(Leave the rest of the `<Link>` — the `A` badge and the `Asclepion` span — unchanged.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/features/layout/Navbar.test.tsx`
Expected: PASS (all Navbar tests, including the two new ones).

- [ ] **Step 5: Typecheck and lint**

Run: `cd frontend && npx tsc -b`
Expected: PASS.

Run: `cd frontend && npm run lint`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/layout/Navbar.tsx frontend/src/features/layout/Navbar.test.tsx
git commit -m "feat: point the Home logo at the role-appropriate landing page

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final verification (after all tasks)

- [ ] Frontend full suite: `cd frontend && npm test` — expected: no NEW failures vs. `develop`. (Pre-existing out-of-scope failures in ClipCard/DrawingCard/TimestampAnnotation from `useOutletContext(...) is null` remain, per prior work.)
- [ ] `cd frontend && npx tsc -b` and `cd frontend && npm run lint` — clean (no new issues).
- [ ] Manual verify (see /verify): as a non-caregiver (`admin@local.dev` / `reviewer@local.dev` / `coordinator@local.dev`), click the Home/Asclepion logo and hard-navigate to `/`, `/search`, and `/videos/<id>` — confirm NO error toast and a clean redirect to `/reviews`. As a caregiver (`caregiver1@local.dev`), confirm Home still loads the video grid normally and a genuine list failure still shows one toast.

## Notes / self-review

- **Spec coverage:** Part 1 role-gate → Task 1 ✅; Part 2 toast relocation → Task 2 ✅; Part 3 role-aware logo → Task 3 ✅.
- **Out of scope (per spec):** symmetric caregiver-hits-`/reviews`/`/admin` race; route `errorElement`s.
- **Type consistency:** `getSessionRole` returns `Role | null`; loaders keep their existing return shapes; `toastQueryError(error, query: Query)` matches `QueryCache`'s `onError` signature; `meta.errorMessage` is read as `unknown` and string-checked.
- **Behavior preserved:** `prefetchQuery` remains fire-and-forget (Suspense streaming intact); queries still `throw` on failure (error-page behavior unchanged), only the toast source moved.
