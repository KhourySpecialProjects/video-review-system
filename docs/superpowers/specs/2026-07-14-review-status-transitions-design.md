# VMP-169 — Review status transitions (NOT_REVIEWED → IN_REVIEW → REVIEWED)

**Linear:** [VMP-169](https://linear.app/next-consulting/issue/VMP-169)
**Date:** 2026-07-14
**Status:** Approved
**Surface:** Backend (`reviews` domain) + frontend (review page). No schema change.

## Problem

The three-stage review workflow `NOT_REVIEWED → IN_REVIEW → REVIEWED` (the
`review_status` column on the `VideoStudy` join table) is displayed everywhere
but written nowhere. Every genuinely-uploaded video sits at `NOT_REVIEWED`
forever; the only non-default values come from the seed. There is no endpoint,
service function, or UI control that transitions a video between stages.

`review_status` is keyed per `VideoStudy` row — the composite
`(studyId, videoId, siteId)` — so a transition is scoped to one study/site link,
not to the video globally.

## Goal

A reviewer with WRITE or ADMIN permission on a video-study can move it through
the review workflow from the review page, the change persists, and the status
badge / reviews list / admin counts reflect it. READ-only users see the status
but cannot change it.

## Decisions (settled during brainstorming)

1. **IN_REVIEW is entered explicitly** via a "Start review" button — no
   auto-promote on open. Opening the page has no side effects.
2. **Linear state machine, adjacent steps only, revertible:**
   `NOT_REVIEWED ⇄ IN_REVIEW ⇄ REVIEWED`. Non-adjacent jumps are rejected by the
   backend.
3. **No `commentOverview` requirement** — marking REVIEWED does not depend on
   the review overview comment.
4. **Permission:** WRITE and ADMIN can transition; READ-only is read-only.
   Enforced by the backend; the UI hides the controls for non-writers.
5. **Placement:** the status badge + transition buttons live in the existing
   bottom `ReviewDetailsSection` strip.

## State machine

```
NOT_REVIEWED  ⇄  IN_REVIEW  ⇄  REVIEWED
   Start review     Mark reviewed
   ← Reopen         ← Reopen
```

Legal transitions (current → next):

| Current        | Allowed next values          |
| -------------- | ---------------------------- |
| `NOT_REVIEWED` | `IN_REVIEW`                  |
| `IN_REVIEW`    | `NOT_REVIEWED`, `REVIEWED`   |
| `REVIEWED`     | `IN_REVIEW`                  |

Any other (current, next) pair — including a no-op `current === next` and any
two-step jump — is rejected with `400`.

## Architecture

The review page (`/review/:videoId/:studyId/:siteId`) currently fetches only the
stream response (`fetchStreamUrl` → `VideoStreamResponse`) and **hard-codes**
`permissionLevel: "WRITE"` in `videoReviewLoader`
(`frontend/src/lib/video.service.ts:390`). It knows neither the current
`reviewStatus` nor the user's real permission. This feature adds a small read
path for both, and a mutation for the transition.

**Chosen approach — dedicated TanStack Query + mutation**, mirroring how
annotations/clips/sequences already work on this page. The `<video>` element is
never remounted because React Router loader revalidation is not involved.

*Rejected alternative — React Router action + loader revalidation:* simpler
wiring, but submitting a status change re-runs `videoReviewLoader`, refetches the
stream URL, and remounts the `<video>` mid-review. The page's
`videoReviewShouldRevalidate` already suppresses exactly this for the sidebar
`/clips`, `/annotations`, `/sequences` mutations; the query-cache approach keeps
that property.

## Backend

All under the existing `reviews.router` (`requireSession` + `denyCaregiver`,
mounted at `/api/domain/reviews`).

### Types (`backend/src/domains/reviews/reviews.types.ts`)

- A Zod schema `updateReviewStatusSchema` validating the PATCH body:
  `{ reviewStatus: "not reviewed" | "in review" | "reviewed" }` (the same
  lowercase UI strings already used by `REVIEW_STATUS_TO_DB`).

### Routes (`backend/src/domains/reviews/reviews.router.ts`)

1. **`GET /:videoId/:studyId/:siteId/status`** → `200 { reviewStatus, permissionLevel }`
   - Middleware: `requirePermissionContext("READ")`.
   - Handler resolves the specific level with
     `resolvePermissionLevel(req.permissionContext!.rows, { studyId, siteId, videoId })`;
     if it returns `null`, respond `403` (user has READ somewhere but not on this
     specific video-study).
   - `reviewStatus` and `permissionLevel` are the lowercase UI strings
     (reuse `REVIEW_STATUS_LABEL` / `PERMISSION_LABEL` from `reviews.service.ts`).
   - `404` if the `VideoStudy` row does not exist.

2. **`PATCH /:videoId/:studyId/:siteId/status`** body `{ reviewStatus }` → `200 { reviewStatus }`
   - Middleware: `requirePermission("WRITE", resolveContexts)` where
     `resolveContexts(req)` returns `[{ studyId, siteId, videoId }]` from
     `req.params`.
   - Body parsed with `updateReviewStatusSchema` (`400` on invalid).
   - Delegates to the service (below), which validates the transition.

### Service (`backend/src/domains/reviews/reviews.service.ts`)

Two new exported functions plus a transition table:

- `const ALLOWED_TRANSITIONS: Record<review_status, review_status[]>` encoding the
  table above.
- `getReviewStatus(studyId, videoId, siteId)` → fetches the `VideoStudy` row by
  composite key; `404` (`AppError.notFound`) if missing; returns the DB
  `review_status`.
- `updateReviewStatus(studyId, videoId, siteId, nextUi)`:
  1. Map `nextUi` → DB enum via `REVIEW_STATUS_TO_DB`.
  2. Fetch current row (`404` if missing).
  3. If `next` is not in `ALLOWED_TRANSITIONS[current]` → `AppError.badRequest`
     with a message naming the current + attempted status.
  4. `prisma.videoStudy.update` on the composite key, set `reviewStatus: next`.
  5. Return the new status (UI string).

Composite-key access uses the Prisma `studyId_videoId_siteId` compound unique
input (matching `@@id([studyId, videoId, siteId])`).

## Frontend

### Shared types (`shared/review.ts`)

- `ReviewStatusResponse = { reviewStatus: ReviewStatus; permissionLevel: ReviewPermissionLevel }`.

### Data layer (`frontend/src/lib/video.service.ts`)

- `reviewStatusQuery(videoId, studyId, siteId)` — `queryOptions` with key
  `["review-status", videoId, studyId, siteId]` and a `queryFn` that
  `GET`s `/reviews/:videoId/:studyId/:siteId/status`. Carries
  `meta: { errorMessage: "Failed to load review status" }` (consistent with the
  VMP-166 `QueryCache` `onError` pattern).
- `videoReviewLoader`: additionally `await`s the status query via
  `queryClient.fetchQuery(reviewStatusQuery(...))` (so the strip has data on
  first paint and the cache is seeded), and sets
  `permissionLevel: status.permissionLevel` on the returned
  `VideoReviewLoaderData` — **replacing the hard-coded `"WRITE"`**. This feeds
  the existing `PermissionProvider`, so READ users become correctly read-only on
  the review page.

### Mutation hook (`frontend/src/features/video/review/useReviewStatus.ts`)

- `useReviewStatus(videoId, studyId, siteId)` — reads the current status via
  `useQuery(reviewStatusQuery(...))` (hits the seeded cache) and exposes a
  `useMutation` that `PATCH`es the next status. On success it writes the returned
  status into the query cache with `queryClient.setQueryData`. No React Router
  revalidation, so the video does not remount.

### UI (`ReviewDetailsSection` + a small `ReviewStatusControl`)

- New `ReviewStatusControl` component rendered inside the bottom strip: a
  `Badge` showing the current status and the contextual button(s):
  - `NOT_REVIEWED` → **Start review** (→ IN_REVIEW)
  - `IN_REVIEW` → **Mark reviewed** (→ REVIEWED) + **Reopen** (→ NOT_REVIEWED)
  - `REVIEWED` → **Reopen** (→ IN_REVIEW)
- Controls are hidden when `!canWrite` (the strip already receives a
  `disabled`/read-only signal via `usePermission`); the badge still shows.
- Buttons are disabled while the mutation is pending.

`ReviewDetailsSection` gains the `videoId/studyId/siteId` it needs (already
available on `VideoReviewLoaderData`; thread them from `VideoReview.tsx`).

### Cross-view freshness

No manual cross-cache invalidation. The reviews list (`reviewsLoader`) and the
admin dashboard fetch through their own React Router loaders on navigation, so
the badge and `NOT_REVIEWED` counts refresh naturally when the user returns to
those pages.

## Testing

### Backend

- **Service** (`reviews.service.test.ts`): every legal transition succeeds and
  persists; every illegal pair (each two-step jump, each reverse-skip, and a
  no-op) throws `badRequest`; `getReviewStatus`/`updateReviewStatus` throw
  `notFound` on a missing row.
- **Router** (`reviews.router.test.ts`): `PATCH` with WRITE succeeds (`200`,
  body echoes new status); READ-only is `403`; invalid body is `400`; `GET`
  returns `{ reviewStatus, permissionLevel }`.

### Frontend

- `ReviewStatusControl` renders the correct button set for each status.
- Clicking a button fires the mutation with the expected next status and updates
  the badge from the cache (no remount).
- Read-only (`canWrite === false`) hides the controls but still shows the badge.
- `useReviewStatus` writes the PATCH response into the query cache on success.

## Out of scope

- Auto-promote to IN_REVIEW on open.
- Wiring `commentOverview` / the notes+tags editors to real persistence.
- Broader permission-plumbing cleanup beyond passing the real level into
  `videoReviewLoader`.
- The symmetric handling for any other role/route.

## Risks / notes

- Retiring the hard-coded `permissionLevel: "WRITE"` means READ-only users now
  correctly lose write affordances on the review page. This is the intended fix,
  but it changes behavior for any READ-only reviewer who previously saw
  (backend-rejected) write controls — call it out in the PR.
- The `GET …/status` READ gate uses `requirePermissionContext("READ")` (a coarse
  "has READ somewhere" gate) plus a specific `resolvePermissionLevel` null-check
  for the exact video-study, matching the pattern in `listReviewsForUser`.
