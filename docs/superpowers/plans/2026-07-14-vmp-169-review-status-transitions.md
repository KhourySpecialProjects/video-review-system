# VMP-169 Review Status Transitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a WRITE/ADMIN reviewer move a video through `NOT_REVIEWED → IN_REVIEW → REVIEWED` (and back, one step at a time) from the review page, persisting the change on the `VideoStudy` row.

**Architecture:** New `GET`/`PATCH` `/reviews/:videoId/:studyId/:siteId/status` endpoints on the existing reviews router (service validates transitions against an adjacency table). Frontend reads status + real permission via a TanStack Query seeded by the review loader, and mutates via `useMutation` that updates the cache in place — so the `<video>` never remounts.

**Tech Stack:** Express + Prisma + Zod + Vitest/supertest (backend); React 19 + React Router v7 + TanStack Query + Vitest/Testing Library (frontend); shared TS types in `shared/`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-14-review-status-transitions-design.md`.
- Review-status UI strings are lowercase: `"not reviewed" | "in review" | "reviewed"` (type `ReviewStatus` in `shared/review.ts`). DB enum `review_status` is uppercase `NOT_REVIEWED | IN_REVIEW | REVIEWED`.
- Permission level on the review page is the **uppercase** `PermissionLevel` (`"READ" | "WRITE" | "EXPORT" | "ADMIN"`, `shared/permissions.ts`) — this is what `PermissionProvider` consumes. Do NOT use the lowercase `ReviewPermissionLevel` for the review page.
- Legal transitions (adjacent only, revertible): `NOT_REVIEWED⇄IN_REVIEW⇄REVIEWED`. Every other pair (including no-op and 2-step jumps) → `400`.
- Only WRITE/ADMIN may PATCH; READ is read-only. Backend enforces via `requirePermission("WRITE", …)`; UI hides controls when `!canWrite`.
- ESLint `@typescript-eslint/no-explicit-any` is an ERROR. Never write `as any`; use `as unknown as <Type>`.
- `apiFetch(path)` (`frontend/src/lib/api.ts`) prepends `/api/domain`; pass paths like `/reviews/...`.
- Commit after each task. Branch is already `vmp-169-review-status-transitions-not_reviewed-in_review-reviewed` off `develop`.

---

### Task 1: Backend — shared type, Zod schema, service transition logic

**Files:**
- Modify: `shared/review.ts` (add `ReviewStatusResponse`)
- Modify: `backend/src/domains/reviews/reviews.types.ts` (add `updateReviewStatusSchema`)
- Modify: `backend/src/domains/reviews/reviews.service.ts` (add `ALLOWED_TRANSITIONS`, `getReviewStatus`, `updateReviewStatus`)
- Test: `backend/src/__tests__/unit/reviews.service.test.ts` (create)

**Interfaces:**
- Consumes: existing `REVIEW_STATUS_LABEL` and `REVIEW_STATUS_TO_DB` maps in `reviews.service.ts`; `prisma.videoStudy`; `AppError` (`backend/src/middleware/errors.ts`); `review_status` enum type.
- Produces:
  - `type ReviewStatusResponse = { reviewStatus: ReviewStatus; permissionLevel: PermissionLevel }` in `shared/review.ts`.
  - `updateReviewStatusSchema` (Zod) → `{ reviewStatus: ReviewStatus }`.
  - `getReviewStatus(studyId: string, videoId: string, siteId: string): Promise<ReviewStatus>`
  - `updateReviewStatus(studyId: string, videoId: string, siteId: string, next: ReviewStatus): Promise<ReviewStatus>`

- [ ] **Step 1: Add the shared response type**

In `shared/review.ts`, add an import for `PermissionLevel` at the top and the new type at the end:

```ts
import type { PermissionLevel } from "./permissions";
```

```ts
/**
 * @description Response shape for the review-status read/patch endpoints
 * (`/reviews/:videoId/:studyId/:siteId/status`). `permissionLevel` is the
 * uppercase resource permission level (feeds the review page PermissionProvider).
 */
export type ReviewStatusResponse = {
  reviewStatus: ReviewStatus;
  permissionLevel: PermissionLevel;
};
```

- [ ] **Step 2: Add the PATCH body schema**

In `backend/src/domains/reviews/reviews.types.ts`, after `reviewsQuerySchema`:

```ts
/**
 * @description Validates the body of `PATCH /domain/reviews/:videoId/:studyId/:siteId/status`.
 * Accepts the lowercase UI review-status strings.
 */
export const updateReviewStatusSchema = z.object({
    reviewStatus: z.enum(["not reviewed", "in review", "reviewed"]),
});

export type UpdateReviewStatusBody = z.infer<typeof updateReviewStatusSchema>;
```

- [ ] **Step 3: Write the failing service tests**

Create `backend/src/__tests__/unit/reviews.service.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    videoStudy: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../lib/prisma.js", () => ({ default: prismaMock }));

import { getReviewStatus, updateReviewStatus } from "../../domains/reviews/reviews.service.js";

const KEY = { studyId: "s1", videoId: "v1", siteId: "site1" };
const compoundWhere = { studyId_videoId_siteId: KEY };

describe("reviews.service review status", () => {
  beforeEach(() => {
    prismaMock.videoStudy.findUnique.mockReset();
    prismaMock.videoStudy.update.mockReset();
  });

  describe("getReviewStatus", () => {
    it("returns the lowercase UI status for an existing row", async () => {
      prismaMock.videoStudy.findUnique.mockResolvedValue({ reviewStatus: "IN_REVIEW" });
      const result = await getReviewStatus(KEY.studyId, KEY.videoId, KEY.siteId);
      expect(result).toBe("in review");
      expect(prismaMock.videoStudy.findUnique).toHaveBeenCalledWith({ where: compoundWhere });
    });

    it("throws 404 when the row is missing", async () => {
      prismaMock.videoStudy.findUnique.mockResolvedValue(null);
      await expect(getReviewStatus(KEY.studyId, KEY.videoId, KEY.siteId)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe("updateReviewStatus", () => {
    it.each([
      ["NOT_REVIEWED", "in review", "IN_REVIEW"],
      ["IN_REVIEW", "reviewed", "REVIEWED"],
      ["IN_REVIEW", "not reviewed", "NOT_REVIEWED"],
      ["REVIEWED", "in review", "IN_REVIEW"],
    ])("allows %s -> %s and persists", async (current, next, nextDb) => {
      prismaMock.videoStudy.findUnique.mockResolvedValue({ reviewStatus: current });
      prismaMock.videoStudy.update.mockResolvedValue({ reviewStatus: nextDb });
      const result = await updateReviewStatus(KEY.studyId, KEY.videoId, KEY.siteId, next as never);
      expect(prismaMock.videoStudy.update).toHaveBeenCalledWith({
        where: compoundWhere,
        data: { reviewStatus: nextDb },
      });
      expect(result).toBe(next);
    });

    it.each([
      ["NOT_REVIEWED", "reviewed"],
      ["NOT_REVIEWED", "not reviewed"],
      ["REVIEWED", "not reviewed"],
      ["IN_REVIEW", "in review"],
    ])("rejects illegal transition %s -> %s with 400", async (current, next) => {
      prismaMock.videoStudy.findUnique.mockResolvedValue({ reviewStatus: current });
      await expect(
        updateReviewStatus(KEY.studyId, KEY.videoId, KEY.siteId, next as never),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(prismaMock.videoStudy.update).not.toHaveBeenCalled();
    });

    it("throws 404 when the row is missing", async () => {
      prismaMock.videoStudy.findUnique.mockResolvedValue(null);
      await expect(
        updateReviewStatus(KEY.studyId, KEY.videoId, KEY.siteId, "in review" as never),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
```

- [ ] **Step 4: Run the tests to confirm they fail**

Run: `cd backend && npx vitest run src/__tests__/unit/reviews.service.test.ts`
Expected: FAIL — `getReviewStatus`/`updateReviewStatus` are not exported yet.

- [ ] **Step 5: Implement the service functions**

In `backend/src/domains/reviews/reviews.service.ts`:

Add `AppError` to the imports and `UpdateReviewStatusBody`'s status type. At the top with the other imports, add:

```ts
import { AppError } from "../../middleware/errors.js";
```

After the existing `REVIEW_STATUS_TO_DB` map, add the transition table and functions:

```ts
/**
 * @description Legal adjacent review-status transitions (DB enum). Any pair not
 * listed here — including no-ops and two-step jumps — is rejected.
 */
const ALLOWED_TRANSITIONS: Record<review_status, review_status[]> = {
    NOT_REVIEWED: ["IN_REVIEW"],
    IN_REVIEW: ["NOT_REVIEWED", "REVIEWED"],
    REVIEWED: ["IN_REVIEW"],
};

/** @description Compound-key selector for a VideoStudy row. */
function videoStudyKey(studyId: string, videoId: string, siteId: string) {
    return { studyId_videoId_siteId: { studyId, videoId, siteId } };
}

/**
 * @description Reads the current review status for a video-study-site link.
 * @throws 404 if the VideoStudy row does not exist.
 */
export async function getReviewStatus(
    studyId: string,
    videoId: string,
    siteId: string,
): Promise<ReviewStatus> {
    const row = await prisma.videoStudy.findUnique({
        where: videoStudyKey(studyId, videoId, siteId),
    });
    if (!row) throw AppError.notFound("Review not found");
    return REVIEW_STATUS_LABEL[row.reviewStatus];
}

/**
 * @description Transitions the review status of a video-study-site link,
 * enforcing the adjacent-only state machine.
 * @throws 404 if the row is missing; 400 if the transition is not allowed.
 */
export async function updateReviewStatus(
    studyId: string,
    videoId: string,
    siteId: string,
    next: ReviewStatus,
): Promise<ReviewStatus> {
    const nextDb = REVIEW_STATUS_TO_DB[next];
    const row = await prisma.videoStudy.findUnique({
        where: videoStudyKey(studyId, videoId, siteId),
    });
    if (!row) throw AppError.notFound("Review not found");

    if (!ALLOWED_TRANSITIONS[row.reviewStatus].includes(nextDb)) {
        throw AppError.badRequest(
            `Cannot change review status from ${row.reviewStatus} to ${nextDb}`,
        );
    }

    const updated = await prisma.videoStudy.update({
        where: videoStudyKey(studyId, videoId, siteId),
        data: { reviewStatus: nextDb },
    });
    return REVIEW_STATUS_LABEL[updated.reviewStatus];
}
```

- [ ] **Step 6: Run the tests to confirm they pass**

Run: `cd backend && npx vitest run src/__tests__/unit/reviews.service.test.ts`
Expected: PASS (all transition, rejection, and 404 cases green).

- [ ] **Step 7: Typecheck**

Run: `cd backend && npx tsc -b`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add shared/review.ts backend/src/domains/reviews/reviews.types.ts backend/src/domains/reviews/reviews.service.ts backend/src/__tests__/unit/reviews.service.test.ts
git commit -m "feat(reviews): add review-status transition service + schema (VMP-169)"
```

---

### Task 2: Backend — GET/PATCH status routes

**Files:**
- Modify: `backend/src/domains/reviews/reviews.router.ts`
- Test: `backend/src/__tests__/http/reviews.router.test.ts` (create)

**Interfaces:**
- Consumes (Task 1): `getReviewStatus`, `updateReviewStatus`, `updateReviewStatusSchema`.
- Consumes (existing): `requireSession`, `denyCaregiver`, `requirePermission`, `requirePermissionContext` (`backend/src/middleware/auth.ts`); `resolvePermissionLevel` (`backend/src/lib/permissions.ts`); `AppError`.
- Produces: routes `GET /:videoId/:studyId/:siteId/status` → `200 { reviewStatus, permissionLevel }` (or `403`/`404`), and `PATCH /:videoId/:studyId/:siteId/status` → `200 { reviewStatus }` (or `400`).

- [ ] **Step 1: Write the failing router tests**

Create `backend/src/__tests__/http/reviews.router.test.ts`:

```ts
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp } from "../helpers/test-app.js";

const { authMock, permissionsMock, reviewsServiceMock } = vi.hoisted(() => ({
  authMock: { auth: { api: { getSession: vi.fn() } } },
  permissionsMock: { resolvePermissionLevel: vi.fn() },
  reviewsServiceMock: {
    listReviewsForUser: vi.fn(),
    getReviewStatus: vi.fn(),
    updateReviewStatus: vi.fn(),
  },
}));

vi.mock("../../lib/auth.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/auth.js")>();
  return { ...actual, auth: authMock.auth };
});

vi.mock("../../lib/permissions.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/permissions.js")>();
  return { ...actual, resolvePermissionLevel: permissionsMock.resolvePermissionLevel };
});

vi.mock("../../middleware/auth.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../middleware/auth.js")>();
  return {
    ...actual,
    requireSession: async (req: any, _res: any, next: any) => {
      req.authSession = await authMock.auth.api.getSession();
      next();
    },
    denyCaregiver: (_req: any, _res: any, next: any) => next(),
    requirePermission: () => (_req: any, _res: any, next: any) => next(),
    requirePermissionContext: () => (req: any, _res: any, next: any) => {
      req.permissionContext = { rows: [], isGlobal: true };
      next();
    },
  };
});

vi.mock("../../domains/reviews/reviews.service.js", () => reviewsServiceMock);

import reviewsRouter from "../../domains/reviews/reviews.router.js";

describe("reviews.router status routes", () => {
  const app = createTestApp("/domain/reviews", reviewsRouter);

  beforeEach(() => {
    vi.resetAllMocks();
    authMock.auth.api.getSession.mockResolvedValue({
      user: { id: "user-1", role: "CLINICAL_REVIEWER" },
    });
  });

  it("GET status returns reviewStatus + permissionLevel", async () => {
    permissionsMock.resolvePermissionLevel.mockReturnValue("WRITE");
    reviewsServiceMock.getReviewStatus.mockResolvedValue("in review");

    const res = await request(app).get("/domain/reviews/v1/s1/site1/status");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reviewStatus: "in review", permissionLevel: "WRITE" });
    expect(reviewsServiceMock.getReviewStatus).toHaveBeenCalledWith("s1", "v1", "site1");
  });

  it("GET status returns 403 when the user has no level on this resource", async () => {
    permissionsMock.resolvePermissionLevel.mockReturnValue(null);

    const res = await request(app).get("/domain/reviews/v1/s1/site1/status");

    expect(res.status).toBe(403);
    expect(reviewsServiceMock.getReviewStatus).not.toHaveBeenCalled();
  });

  it("PATCH status updates and echoes the new status", async () => {
    reviewsServiceMock.updateReviewStatus.mockResolvedValue("reviewed");

    const res = await request(app)
      .patch("/domain/reviews/v1/s1/site1/status")
      .send({ reviewStatus: "reviewed" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reviewStatus: "reviewed" });
    expect(reviewsServiceMock.updateReviewStatus).toHaveBeenCalledWith("s1", "v1", "site1", "reviewed");
  });

  it("PATCH status rejects an invalid body with 400", async () => {
    const res = await request(app)
      .patch("/domain/reviews/v1/s1/site1/status")
      .send({ reviewStatus: "bogus" });

    expect(res.status).toBe(400);
    expect(reviewsServiceMock.updateReviewStatus).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `cd backend && npx vitest run src/__tests__/http/reviews.router.test.ts`
Expected: FAIL — routes return 404 (not defined yet).

- [ ] **Step 3: Implement the routes**

Replace the contents of `backend/src/domains/reviews/reviews.router.ts` with:

```ts
import { Router } from "express";
import {
  requireSession,
  denyCaregiver,
  requirePermissionContext,
  requirePermission,
} from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { resolvePermissionLevel } from "../../lib/permissions.js";
import {
  listReviewsForUser,
  getReviewStatus,
  updateReviewStatus,
} from "./reviews.service.js";
import { reviewsQuerySchema, updateReviewStatusSchema } from "./reviews.types.js";

const router = Router();

router.use(requireSession);
router.use(denyCaregiver);

/**
 * @description GET /domain/reviews - list video-review assignments for the current user.
 *
 * Visibility is scoped by the user's permission rows via requirePermissionContext.
 * All query params are optional; unknown params are ignored.
 *
 * @query search - free-text search across the caregiver privateTitle/privateNotes
 * @query study - filter by study name (exact)
 * @query site - filter by site name (exact)
 * @query status - one of "not reviewed" | "in review" | "reviewed"
 * @query dateFrom - ISO datetime lower bound for video.createdAt
 * @query dateTo - ISO datetime upper bound for video.createdAt
 * @query page - 1-indexed page number (default 1)
 * @query limit - page size (default 9, max 100)
 *
 * @returns 200 with { videos, totalCount, studies, sites }
 * @returns 400 on invalid query params
 */
router.get("/",
  requirePermissionContext("READ"),
  async (req, res) => {
    const data = reviewsQuerySchema.parse(req.query);
    const result = await listReviewsForUser(req.permissionContext!, data);
    res.json(result);
  }
);

/**
 * @description GET /domain/reviews/:videoId/:studyId/:siteId/status - current
 * review status + the caller's resolved permission level for this video-study.
 *
 * @returns 200 { reviewStatus, permissionLevel }
 * @returns 403 if the caller has no permission on this specific video-study
 * @returns 404 if the video-study link does not exist
 */
router.get("/:videoId/:studyId/:siteId/status",
  requirePermissionContext("READ"),
  async (req, res) => {
    const { videoId, studyId, siteId } = req.params;
    const level = resolvePermissionLevel(req.permissionContext!.rows, { studyId, siteId, videoId });
    if (!level) throw AppError.forbidden();
    const reviewStatus = await getReviewStatus(studyId, videoId, siteId);
    res.json({ reviewStatus, permissionLevel: level });
  }
);

/**
 * @description PATCH /domain/reviews/:videoId/:studyId/:siteId/status - transition
 * the review status. Requires WRITE on the video-study; enforces the
 * adjacent-only state machine in the service.
 *
 * @returns 200 { reviewStatus }
 * @returns 400 on invalid body or illegal transition
 * @returns 403 without WRITE permission
 * @returns 404 if the video-study link does not exist
 */
router.patch("/:videoId/:studyId/:siteId/status",
  requirePermission("WRITE", (req) => [
    { studyId: req.params.studyId, siteId: req.params.siteId, videoId: req.params.videoId },
  ]),
  async (req, res) => {
    const { reviewStatus } = updateReviewStatusSchema.parse(req.body);
    const { videoId, studyId, siteId } = req.params;
    const updated = await updateReviewStatus(studyId, videoId, siteId, reviewStatus);
    res.json({ reviewStatus: updated });
  }
);

export default router;
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `cd backend && npx vitest run src/__tests__/http/reviews.router.test.ts`
Expected: PASS (GET 200/403, PATCH 200/400).

- [ ] **Step 5: Typecheck**

Run: `cd backend && npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/domains/reviews/reviews.router.ts backend/src/__tests__/http/reviews.router.test.ts
git commit -m "feat(reviews): add GET/PATCH review-status routes (VMP-169)"
```

---

### Task 3: Frontend — review-status query + loader wiring

**Files:**
- Modify: `frontend/src/lib/video.service.ts` (add `reviewStatusQuery`; rewrite `videoReviewLoader` to fetch status + set real `permissionLevel`)
- Test: `frontend/src/lib/video.service.test.ts` (add a `videoReviewLoader` describe block)

**Interfaces:**
- Consumes: `ReviewStatusResponse` (`@shared/review`); `apiFetch`; `queryOptions`/`QueryClient` (`@tanstack/react-query`); existing `fetchStreamUrl`, `annotationsQuery`, `clipsQuery`, `sequencesQuery`.
- Produces:
  - `reviewStatusQuery(videoId: string, studyId: string, siteId: string)` → `queryOptions` with key `["review-status", videoId, studyId, siteId]`.
  - `videoReviewLoader` now sets `permissionLevel` from the fetched status and seeds the status cache (retires the hard-coded `"WRITE"`).

- [ ] **Step 1: Write the failing loader test**

In `frontend/src/lib/video.service.test.ts`, add at the top-level (after the existing imports) a mock for `@/lib/api`, and a new describe block. If `@/lib/api` is not yet mocked in this file, add:

```ts
const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: apiFetchMock }));
```

Add `videoReviewLoader` to the existing import from `./video.service`, then append:

```ts
describe("videoReviewLoader", () => {
  beforeEach(() => apiFetchMock.mockReset());

  it("awaits status, sets the real permissionLevel, and seeds the status cache", async () => {
    const streamPayload = {
      video: { id: "v1", durationSeconds: 10, createdAt: "2026-01-01T00:00:00Z", takenAt: null },
      videoUrl: "https://s3/video.mp4",
      imgUrl: "https://s3/thumb.jpg",
      expiresIn: 3600,
    };
    const statusPayload = { reviewStatus: "in review", permissionLevel: "READ" };

    apiFetchMock.mockImplementation((path: string) => {
      const body = path.includes("/stream") ? streamPayload : statusPayload;
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as unknown as Response);
    });

    const qc = new QueryClient();
    const data = await videoReviewLoader(qc)({
      params: { videoId: "v1", studyId: "s1", siteId: "site1" },
      request: new Request("http://localhost/review/v1/s1/site1"),
    } as unknown as LoaderFunctionArgs);

    expect(data.permissionLevel).toBe("READ");
    expect(data.videoId).toBe("v1");
    expect(qc.getQueryData(["review-status", "v1", "s1", "site1"])).toEqual(statusPayload);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `cd frontend && npx vitest run src/lib/video.service.test.ts`
Expected: FAIL — loader still returns hard-coded `permissionLevel: "WRITE"` and does not seed the cache.

- [ ] **Step 3: Add the query and rewrite the loader**

In `frontend/src/lib/video.service.ts`:

Add `ReviewStatusResponse` to the existing `@shared/*` type imports (it lives in `@shared/review`):

```ts
import type { ReviewStatusResponse } from "@shared/review";
```

Add the query factory near the other `queryOptions` exports:

```ts
/**
 * @description Query for a video-study's review status + the caller's permission
 * level. Seeded by `videoReviewLoader` and read by the review-status control.
 * `staleTime` dedupes the loader's fetch and the control's mount read.
 *
 * @param videoId - Video id
 * @param studyId - Study id
 * @param siteId - Site id
 * @returns Query options describing key and fetcher
 */
export function reviewStatusQuery(videoId: string, studyId: string, siteId: string) {
    return queryOptions({
        queryKey: ["review-status", videoId, studyId, siteId] as const,
        queryFn: async () => {
            const res = await apiFetch(`/reviews/${videoId}/${studyId}/${siteId}/status`);
            if (!res.ok) throw new Error("Failed to load review status");
            return res.json() as Promise<ReviewStatusResponse>;
        },
        staleTime: 5_000,
        meta: { errorMessage: "Failed to load review status" },
    });
}
```

Rewrite the body of `videoReviewLoader` so the status fetch runs alongside the stream fetch and feeds `permissionLevel`:

```ts
export function videoReviewLoader(queryClient: QueryClient) {
    return async ({ params, request }: LoaderFunctionArgs): Promise<VideoReviewLoaderData> => {
        const { videoId, studyId, siteId } = params;
        if (!videoId || !studyId || !siteId) {
            throw new Response("Missing review route params", { status: 400 });
        }

        // Fire list prefetches without awaiting so they stream into the cache;
        // the page's useSuspenseQuery calls pick them up when ready.
        queryClient.prefetchQuery(annotationsQuery(videoId));
        queryClient.prefetchQuery(clipsQuery(videoId, studyId));
        queryClient.prefetchQuery(sequencesQuery(videoId, studyId));

        // Await the stream URL (video paints) and the review status (needed for
        // the PermissionProvider + the status control). fetchQuery also caches
        // the status so the control reads it without a second request.
        const [streamData, status] = await Promise.all([
            fetchStreamUrl(videoId, request),
            queryClient.fetchQuery(reviewStatusQuery(videoId, studyId, siteId)),
        ]);

        if (!streamData.video) {
            throw new Response("Video not found", { status: 404 });
        }

        return {
            video: streamData.video,
            videoUrl: streamData.videoUrl,
            imgUrl: streamData.imgUrl,
            expiresIn: streamData.expiresIn,
            videoId,
            studyId,
            siteId,
            permissionLevel: status.permissionLevel,
        };
    };
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `cd frontend && npx vitest run src/lib/video.service.test.ts`
Expected: PASS (both the new block and the pre-existing loader tests).

- [ ] **Step 5: Typecheck + lint**

Run: `cd frontend && npx tsc -b && npm run lint`
Expected: no errors (note: `VideoReviewLoaderData.permissionLevel` is `PermissionLevel`, matching `status.permissionLevel`).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/video.service.ts frontend/src/lib/video.service.test.ts
git commit -m "feat(review): fetch review status + real permission in review loader (VMP-169)"
```

---

### Task 4: Frontend — status control UI + hook, wired into the review strip

**Files:**
- Create: `frontend/src/features/video/review/useReviewStatus.ts`
- Create: `frontend/src/features/video/review/ReviewStatusControl.tsx`
- Create: `frontend/src/features/video/review/ReviewStatusControl.test.tsx`
- Modify: `frontend/src/features/video/review/ReviewDetailsSection.tsx` (accept ids, render control as a sibling of the expand button)
- Modify: `frontend/src/routes/VideoReview.tsx` (pass ids to `ReviewDetailsSection`)

**Interfaces:**
- Consumes (Task 3): `reviewStatusQuery`; `ReviewStatusResponse`, `ReviewStatus` (`@shared/review`).
- Consumes (existing): `apiFetch`; `usePermission` (`@/contexts/PermissionContext`); `Badge` (`@/components/ui/badge`); `Button` (`@/components/ui/button`); `toast` (`sonner`); `useQuery`/`useMutation`/`useQueryClient` (`@tanstack/react-query`).
- Produces:
  - `useReviewStatus(videoId, studyId, siteId)` → `{ status: ReviewStatus | undefined; setStatus: (next: ReviewStatus) => void; isPending: boolean }`.
  - `<ReviewStatusControl videoId studyId siteId />`.

- [ ] **Step 1: Implement the mutation hook**

Create `frontend/src/features/video/review/useReviewStatus.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { reviewStatusQuery } from "@/lib/video.service";
import { apiFetch } from "@/lib/api";
import type { ReviewStatus, ReviewStatusResponse } from "@shared/review";

/**
 * @description Reads the current review status from the (loader-seeded) cache
 * and exposes a mutation that PATCHes a new status, updating the cache in place
 * on success. No React Router revalidation, so the video never remounts.
 *
 * @param videoId - Video id
 * @param studyId - Study id
 * @param siteId - Site id
 * @returns Current status, a setter, and the mutation's pending flag
 */
export function useReviewStatus(videoId: string, studyId: string, siteId: string) {
  const queryClient = useQueryClient();
  const options = reviewStatusQuery(videoId, studyId, siteId);
  const query = useQuery(options);

  const mutation = useMutation({
    mutationFn: async (next: ReviewStatus): Promise<ReviewStatus> => {
      const res = await apiFetch(`/reviews/${videoId}/${studyId}/${siteId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: next }),
      });
      if (!res.ok) throw new Error("Failed to update review status");
      const body = (await res.json()) as { reviewStatus: ReviewStatus };
      return body.reviewStatus;
    },
    onSuccess: (reviewStatus) => {
      queryClient.setQueryData<ReviewStatusResponse>(options.queryKey, (prev) =>
        prev ? { ...prev, reviewStatus } : prev,
      );
    },
    onError: () => {
      toast.error("Failed to update review status");
    },
  });

  return {
    status: query.data?.reviewStatus,
    setStatus: mutation.mutate,
    isPending: mutation.isPending,
  };
}
```

- [ ] **Step 2: Implement the control component**

Create `frontend/src/features/video/review/ReviewStatusControl.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/contexts/PermissionContext";
import { useReviewStatus } from "./useReviewStatus";
import type { ReviewStatus } from "@shared/review";

type ReviewStatusControlProps = {
  videoId: string;
  studyId: string;
  siteId: string;
};

/** @description Badge variant per review status (matches the reviews list). */
const STATUS_VARIANT: Record<ReviewStatus, "default" | "secondary" | "outline"> = {
  "reviewed": "default",
  "in review": "secondary",
  "not reviewed": "outline",
};

type Action = { label: string; next: ReviewStatus; variant: "default" | "outline" };

/** @description Contextual transition buttons for each status (adjacent-only). */
const ACTIONS: Record<ReviewStatus, Action[]> = {
  "not reviewed": [{ label: "Start review", next: "in review", variant: "default" }],
  "in review": [
    { label: "Mark reviewed", next: "reviewed", variant: "default" },
    { label: "Reopen", next: "not reviewed", variant: "outline" },
  ],
  "reviewed": [{ label: "Reopen", next: "in review", variant: "outline" }],
};

/**
 * @description Review-status badge plus the contextual transition button(s),
 * shown in the bottom review details strip. Buttons appear only for WRITE/ADMIN
 * users; READ-only users see the badge alone.
 *
 * @param props - Video/study/site identifiers for the VideoStudy row
 */
export function ReviewStatusControl({ videoId, studyId, siteId }: ReviewStatusControlProps) {
  const { canWrite } = usePermission();
  const { status, setStatus, isPending } = useReviewStatus(videoId, studyId, siteId);

  if (!status) return null;

  return (
    <div className="flex shrink-0 items-center gap-2 border-t-2 border-border bg-bg-light px-4 py-2 shadow-s">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Status
      </span>
      <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
      {canWrite &&
        ACTIONS[status].map((action) => (
          <Button
            key={action.label}
            size="sm"
            variant={action.variant}
            disabled={isPending}
            onClick={() => setStatus(action.next)}
          >
            {action.label}
          </Button>
        ))}
    </div>
  );
}
```

- [ ] **Step 3: Write the failing component tests**

Create `frontend/src/features/video/review/ReviewStatusControl.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PermissionProvider } from "@/contexts/PermissionContext";
import type { PermissionLevel } from "@shared/permissions";
import type { ReviewStatus } from "@shared/review";

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: apiFetchMock }));

import { ReviewStatusControl } from "./ReviewStatusControl";

const IDS = { videoId: "v1", studyId: "s1", siteId: "site1" };

function renderControl(status: ReviewStatus, level: PermissionLevel) {
  const qc = new QueryClient();
  qc.setQueryData(["review-status", "v1", "s1", "site1"], {
    reviewStatus: status,
    permissionLevel: level,
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <PermissionProvider level={level}>{children}</PermissionProvider>
    </QueryClientProvider>
  );
  render(<ReviewStatusControl {...IDS} />, { wrapper });
  return qc;
}

describe("ReviewStatusControl", () => {
  beforeEach(() => apiFetchMock.mockReset());

  it("shows Start review for a not-reviewed video (WRITE)", () => {
    renderControl("not reviewed", "WRITE");
    expect(screen.getByText("not reviewed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start review" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reopen" })).not.toBeInTheDocument();
  });

  it("shows Mark reviewed + Reopen for an in-review video (WRITE)", () => {
    renderControl("in review", "WRITE");
    expect(screen.getByRole("button", { name: "Mark reviewed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reopen" })).toBeInTheDocument();
  });

  it("shows only Reopen for a reviewed video (WRITE)", () => {
    renderControl("reviewed", "WRITE");
    expect(screen.getByRole("button", { name: "Reopen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark reviewed" })).not.toBeInTheDocument();
  });

  it("hides all buttons for a READ-only user but still shows the badge", () => {
    renderControl("in review", "READ");
    expect(screen.getByText("in review")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("PATCHes the next status and updates the badge on click", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ reviewStatus: "in review" }),
    } as unknown as Response);

    renderControl("not reviewed", "WRITE");
    await userEvent.click(screen.getByRole("button", { name: "Start review" }));

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/reviews/v1/s1/site1/status",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ reviewStatus: "in review" }),
      }),
    );
    await waitFor(() => expect(screen.getByText("in review")).toBeInTheDocument());
  });
});
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `cd frontend && npx vitest run src/features/video/review/ReviewStatusControl.test.tsx`
Expected: PASS (per-status buttons, read-only hides buttons, PATCH + badge update).

- [ ] **Step 5: Wire the control into the review strip**

In `frontend/src/features/video/review/ReviewDetailsSection.tsx`:

Add the import:

```tsx
import { ReviewStatusControl } from "./ReviewStatusControl";
```

Extend the props type and signature so the strip receives the ids:

```tsx
type ReviewDetailsSectionProps = {
  /** @description Whether editing is disabled (READ-only users). */
  disabled: boolean;
  videoId: string;
  studyId: string;
  siteId: string;
};
```

```tsx
export function ReviewDetailsSection({
  disabled,
  videoId,
  studyId,
  siteId,
}: ReviewDetailsSectionProps) {
```

Wrap the existing expand `<Button>` and the new control in a flex row so the status control is a **sibling** of the button (the expand element is itself a `<button>` — nesting buttons is invalid and would bubble clicks into the sheet). Change the opening of the returned fragment from:

```tsx
  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
```

to:

```tsx
  return (
    <>
      <div className="flex w-full items-stretch">
        <ReviewStatusControl videoId={videoId} studyId={studyId} siteId={siteId} />
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
```

and add the matching closing `</div>` immediately after the expand `</Button>` (before the `<Sheet>` element).

- [ ] **Step 6: Pass the ids from the page**

In `frontend/src/routes/VideoReview.tsx`, update the `ReviewDetailsSection` usage (currently `<ReviewDetailsSection disabled={!canWrite} />`) to:

```tsx
          <ReviewDetailsSection
            disabled={!canWrite}
            videoId={loaderData.videoId}
            studyId={loaderData.studyId}
            siteId={loaderData.siteId}
          />
```

- [ ] **Step 7: Typecheck, lint, and run the review test suite**

Run: `cd frontend && npx tsc -b && npm run lint && npx vitest run src/features/video/review`
Expected: no type/lint errors; review-area tests green.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/video/review/useReviewStatus.ts frontend/src/features/video/review/ReviewStatusControl.tsx frontend/src/features/video/review/ReviewStatusControl.test.tsx frontend/src/features/video/review/ReviewDetailsSection.tsx frontend/src/routes/VideoReview.tsx
git commit -m "feat(review): review-status control in the review details strip (VMP-169)"
```

---

## Notes for the executor

- **PR write-up:** call out that retiring the hard-coded `permissionLevel: "WRITE"` in `videoReviewLoader` means READ-only reviewers now correctly lose write affordances on the review page — a deliberate behavior change.
- **No cross-cache invalidation needed:** the reviews list (`reviewsLoader`) and admin dashboard fetch through their own React Router loaders on navigation, so badges/counts refresh when the user returns to those pages.
- **Router-level permission denial** (READ blocked from PATCH) is enforced by `requirePermission("WRITE", …)`, which is exercised by the existing middleware/permissions unit tests; the reviews HTTP test mocks it to a pass-through and instead covers wiring + body validation. The transition state machine and 404s are covered by the Task 1 service tests.
