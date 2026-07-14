# VMP-166 — Non-caregiver "Failed to fetch videos" toast (guarded-prefetch race)

**Linear:** [VMP-166](https://linear.app/next-consulting/issue/VMP-166)
**Date:** 2026-07-13
**Status:** Approved
**Surface:** Frontend only. No backend change, no data-model change.

## Problem

When a non-caregiver (SYSADMIN / SITE_COORDINATOR / CLINICAL_REVIEWER) navigates
to `/` — e.g. clicking the top-left Asclepion/Home logo — an error toast
("Failed to fetch videos", and on the sibling routes "Failed to load video" /
"Failed to search videos") flashes before they are redirected to `/reviews`.

### Root cause

The route tree (`frontend/src/router.tsx`) nests:

```
authGuardLoader
└── caregiverGuardLoader        → redirect("/reviews") for non-caregivers
    ├── homeLoader              → prefetchQuery(homeVideosQuery)   → GET /videos
    │   └── searchLoader        → prefetchQuery(searchVideosQuery) → GET /videos/search
    └── videoViewLoader         → prefetchQuery(videoStreamQuery)  → GET /videos/:id/stream
```

React Router runs matched route loaders **in parallel**. So `caregiverGuardLoader`
(which returns the redirect) races the child prefetch loader, and the caregiver-only
request fires **before the redirect wins**. `GET /api/domain/videos` is
`requireRole("CAREGIVER")`-only by design, so a non-caregiver gets a `403`. The
query's `queryFn` then calls `toast.error(...)` (`video.service.ts` lines ~148,
~189, ~227) and throws. React StrictMode double-invokes the `queryFn` in dev, so
multiple toasts can appear.

Backend behavior is correct; the bug is purely client-side — the prefetch should
not fire for a user the guard is about to redirect.

## Goal

A non-caregiver landing on (or deep-linking to) a caregiver-only route sees no
error toast: the caregiver-only request is never issued for them, and error
toasts no longer originate from inside `queryFn`.

## Design

Frontend-only, in three parts.

### Part 1 — Role-gate the caregiver-only prefetches (root-cause fix)

- Promote the existing private `getSessionRole()` in
  `frontend/src/hooks/auth-guard.ts` to an exported function.
- Add a shared helper in `frontend/src/lib/video.service.ts`:

  ```ts
  async function prefetchIfCaregiver(queryClient, query) {
    const role = await getSessionRole();  // cached: authGuardLoader already fetched the session
    if (role === "CAREGIVER") queryClient.prefetchQuery(query);
  }
  ```

- `homeLoader`, `searchLoader`, and `videoViewLoader` become `async`, `await`
  the role check, and call `prefetchIfCaregiver(...)` instead of prefetching
  unconditionally. The `prefetchQuery` call inside the helper remains
  fire-and-forget, so the existing Suspense-streaming behavior is preserved —
  only a cached role check is awaited (negligible latency; the session is already
  warm from the parent `authGuardLoader`). The loaders still return their
  existing `{ limit, offset }` / `{ searchParams, q }` / `{ videoId }` data.

This alone resolves the reported symptom: a non-caregiver never issues
`GET /videos`, `/videos/search`, or `/videos/:id/stream`, so there is no 403 and
no toast.

### Part 2 — Move the toast out of `queryFn` (hardening)

Calling `toast.error` inside a TanStack `queryFn` is the anti-pattern behind the
StrictMode double-toast (fires per attempt × StrictMode). Relocate it to a single
cache-level handler:

- Add a global `QueryCache({ onError })` to the shared `queryClient`
  (`frontend/src/lib/queryClient.ts`) that toasts `query.meta?.errorMessage`.
  The `QueryCache` `onError` fires **once** per query error (after retries), not
  per component or per attempt.
- In `homeVideosQuery`, `searchVideosQuery`, and `videoStreamQuery`
  (`video.service.ts`): remove the `toast.error(...)` line and add
  `meta: { errorMessage: "..." }` with the existing message. The queries still
  `throw` on failure, so a genuine failure for a legitimate caregiver still
  surfaces exactly one toast; the throw/error-page behavior is unchanged.

Only these three queries opt in via `meta`; admin and review queries keep their
current handling (incremental adoption, no regression).

### Part 3 — Role-aware Home logo link (nav polish)

In `frontend/src/features/layout/Navbar.tsx`, the logo `<Link to="/">` always
targets the caregiver Home. Point it at the role-appropriate landing page (the
component already has `user.role` in scope):

```tsx
to={user?.role && user.role !== "CAREGIVER" ? "/reviews" : "/"}
```

Additive: prevents a non-caregiver from navigating into the guarded route via the
logo. Deep-links / refresh to `/` remain covered by Part 1.

## Testing

- **Part 1** — for each of `homeLoader`, `searchLoader`, `videoViewLoader`: mock
  `authClient.getSession` and spy on `queryClient.prefetchQuery`. Non-caregiver
  session ⇒ `prefetchQuery` is **not** called; caregiver session ⇒ it **is**
  called (with the expected query key). Loader still returns its data either way.
- **Part 2** — a query that rejects and carries `meta: { errorMessage }` triggers
  `toast.error(errorMessage)` exactly once via the `QueryCache` `onError`; a
  query without `meta.errorMessage` triggers no toast from the handler.
- **Part 3** — `Navbar` renders the logo link `href` as `/reviews` for a
  non-caregiver user and `/` for a caregiver (via the auth context).

## Out of scope

- The symmetric race for **caregivers** hitting `/reviews` or `/admin` (their
  loaders vs the `nonCaregiverGuardLoader` / `adminGuardLoader`). Different roles
  than those reported; possible follow-up.
- Adding route `errorElement`s or improving the generic error page.

## Risks / notes

- Making the loaders `async` and awaiting `getSessionRole()` does not delay the
  redirect: the parent guard runs in parallel and its redirect still wins; the
  child loader's awaited result is discarded on redirect. The point is only that
  no caregiver-only request is issued.
- `getSession()` is already called by `authGuardLoader` and again by the role
  guards on every navigation, so an additional cached call in the prefetch loader
  is consistent with current behavior and cheap.
