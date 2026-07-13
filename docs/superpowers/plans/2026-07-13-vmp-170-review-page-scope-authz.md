# VMP-170 — Review-page 403s (video-derived list authorization): Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Stop `403 Forbidden` on the review page's Annotations/Clips/Sequences tabs for study- and site-scoped users by authorizing list reads against the video's actual `VideoStudy` scope instead of client-supplied query params.

**Architecture:** The three list GET routes (`/annotations`, `/clips`, `/sequences`) share `ResourceResolver.fromQuery` (`backend/src/lib/resolvers.ts`), which builds the permission context from `req.query.studyId/siteId/videoId`. Because the frontend never sends `siteId` (and annotations omits `studyId`), the resulting context only matches global/video-scoped grants — never study- or site-scoped ones. Fix: make `fromQuery` derive the full `{studyId, siteId, videoId}` contexts from the video's `VideoStudy` rows (looked up by `req.query.videoId`), exactly like the already-correct `videos.fromParams`. One change fixes all three endpoints for all roles.

**Tech Stack:** Node/Express, Prisma, Vitest (backend `src/__tests__`). Spec: Linear VMP-170.

## Global Constraints

- Branch `vmp-170-review-page-scope-authz` (already created off `develop`); one PR into `develop`.
- Backend-only. **No schema/migration/seed/data changes.**
- Run from `backend/`. Test: `npx vitest run <path>`. Full suite: `npm test`. Build: `npm run build`.
- The `studyId` query param must remain functional — clip/sequence **services** still use it to filter results. Only the **authorization** resolver changes.
- `checkPermission` returns false for an empty context array, so an unknown video / video with no `VideoStudy` rows must resolve to `[]` (safe 403).
- Existing HTTP router tests stub `requirePermission` to a pass-through, so they neither exercise nor regress this logic; the fix is verified by a resolver unit test.

## File Structure

- `backend/src/lib/resolvers.ts` (modify) — `ResourceResolver.fromQuery` becomes an async, video-derived resolver.
- `backend/src/__tests__/unit/resolvers.test.ts` (new) — unit tests for the new `fromQuery` behavior, using the established `vi.mock("../../lib/prisma.js")` pattern.

---

### Task 1: Resolver unit test (RED) then video-derived `fromQuery` (GREEN)

**Files:**
- Create: `backend/src/__tests__/unit/resolvers.test.ts`
- Modify: `backend/src/lib/resolvers.ts`

**Interfaces:**
- Consumes: `prisma.videoStudy.findMany({ where: { videoId }, select: { studyId: true, siteId: true } })` (existing model/columns).
- Produces: `annotations.fromQuery(req)` / `clips.fromQuery(req)` / `sequences.fromQuery(req)` return `Promise<ResourceContext[]>` where each element is `{ studyId, siteId, videoId }` derived from the video's `VideoStudy` rows; `[]` when `videoId` is absent or the video has no rows.

- [ ] **Step 1: Write the failing test**

Create `backend/src/__tests__/unit/resolvers.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// The resolvers module reads Prisma at import time, so the module mock must
// exist before `resolvers.ts` is evaluated.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    videoStudy: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../../lib/prisma.js", () => ({
  default: prismaMock,
}));

import { annotations, clips, sequences } from "../../lib/resolvers.js";

function reqWithQuery(query: Record<string, unknown>) {
  return { query } as any;
}

describe("ResourceResolver.fromQuery (video-derived authorization)", () => {
  beforeEach(() => {
    prismaMock.videoStudy.findMany.mockReset();
  });

  it("derives one context per VideoStudy row for the requested video", async () => {
    prismaMock.videoStudy.findMany.mockResolvedValue([
      { studyId: "study-1", siteId: "site-1" },
      { studyId: "study-2", siteId: "site-2" },
    ]);

    const contexts = await annotations.fromQuery(reqWithQuery({ videoId: "vid-1" }));

    expect(prismaMock.videoStudy.findMany).toHaveBeenCalledWith({
      where: { videoId: "vid-1" },
      select: { studyId: true, siteId: true },
    });
    expect(contexts).toEqual([
      { studyId: "study-1", siteId: "site-1", videoId: "vid-1" },
      { studyId: "study-2", siteId: "site-2", videoId: "vid-1" },
    ]);
  });

  it("ignores client-supplied studyId/siteId in the query", async () => {
    prismaMock.videoStudy.findMany.mockResolvedValue([
      { studyId: "real-study", siteId: "real-site" },
    ]);

    const contexts = await clips.fromQuery(
      reqWithQuery({ videoId: "vid-1", studyId: "attacker-study", siteId: "attacker-site" }),
    );

    expect(prismaMock.videoStudy.findMany).toHaveBeenCalledWith({
      where: { videoId: "vid-1" },
      select: { studyId: true, siteId: true },
    });
    expect(contexts).toEqual([
      { studyId: "real-study", siteId: "real-site", videoId: "vid-1" },
    ]);
  });

  it("returns [] when the video has no VideoStudy rows", async () => {
    prismaMock.videoStudy.findMany.mockResolvedValue([]);
    const contexts = await sequences.fromQuery(reqWithQuery({ videoId: "vid-x" }));
    expect(contexts).toEqual([]);
  });

  it("returns [] without querying when videoId is missing", async () => {
    const contexts = await annotations.fromQuery(reqWithQuery({}));
    expect(contexts).toEqual([]);
    expect(prismaMock.videoStudy.findMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — expect RED**

Run: `npx vitest run src/__tests__/unit/resolvers.test.ts`
Expected: FAILS. Current `fromQuery` is synchronous, never calls `videoStudy.findMany`, and returns `[{ studyId: null, siteId: null, videoId }]` — so the `findMany`/context assertions fail.

- [ ] **Step 3: Implement video-derived `fromQuery`**

In `backend/src/lib/resolvers.ts`, replace the `ResourceResolver.fromQuery` method:
```ts
  /**
   * @description Resolves context from `req.query`. Used for GET list routes
   * that list a resource by `videoId`. Authorization is derived from the
   * video's own `VideoStudy` links (studyId/siteId) rather than trusting
   * client-supplied `studyId`/`siteId` params, so study- and site-scoped
   * grants match. Mirrors `videos.fromParams`. Returns `[]` when no videoId
   * is supplied or the video has no study links (→ 403 via checkPermission).
   */
  fromQuery: ContextResolver = async (req) => {
    const videoId = (req.query.videoId as string) ?? null;
    if (!videoId) return [];

    const videoStudies = await prisma.videoStudy.findMany({
      where: { videoId },
      select: { studyId: true, siteId: true },
    });

    return videoStudies.map((vs) => ({
      studyId: vs.studyId,
      siteId: vs.siteId,
      videoId,
    }));
  };
```
Leave `fromParams`, `fromBody`, and `resolveOwnerId` unchanged.

- [ ] **Step 4: Run test — expect GREEN**

Run: `npx vitest run src/__tests__/unit/resolvers.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/resolvers.ts backend/src/__tests__/unit/resolvers.test.ts
git commit -m "VMP-170: derive list-endpoint authorization scope from the video's VideoStudy rows"
```

---

### Task 2: Verify no regressions & ship

- [ ] **Step 1: Full backend suite + build**

Run (from `backend/`): `npm test` then `npm run build`.
Expected: all tests pass (note any pre-existing failures unrelated to this change), build green.

- [ ] **Step 2: Manual verification in local dev**

Ensure `docker compose up -d postgres localstack` is running and DB is seeded. Start backend + frontend dev servers.
- Log in as `reviewer@local.dev` → open a video in the Seizure study → confirm Notes/Clips/Draw tabs load with **no** "Failed to fetch" errors.
- Log in as the site coordinator (`coordinator@local.dev`, Boston site) → open a Boston video → confirm all three tabs load cleanly.

- [ ] **Step 3: Push + PR**

```bash
git push -u origin vmp-170-review-page-scope-authz
gh pr create --base develop --title "VMP-170: authorize review list endpoints by video scope" --body "<summary + test notes + on-device verification>"
```
