# Persistent Video Posters (VMP-163) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the client-captured video poster JPEG to S3 during upload so posters survive cross-session on the no-AWS deployments, and degrade gracefully when a poster is missing.

**Architecture:** The captured frame is uploaded direct-to-S3 via a new presigned PUT URL returned from the upload-initiate call (matching the existing direct-to-S3 media path); the PUT runs concurrently with the part uploads so the poster persists even if the large upload is later paused. Poster existence is never tracked in the DB — the poster key is derived from `Video.s3Key` via `thumbnailKeyFor()`, and a missing poster is discovered client-side at fetch time.

**Tech Stack:** TypeScript, Express, Prisma, `@aws-sdk/client-s3` + `s3-request-presigner`, React, Vitest, Testing Library.

## Global Constraints

- No data-model change: no Prisma schema edit, no migration, no new column.
- The poster object key is always `thumbnailKeyFor(video.s3Key)` (`backend/src/lib/mediaKeys.ts`) — never hard-code the `.jpg` derivation.
- A poster upload failure must NEVER fail or reject the video upload (best-effort).
- Presigned PUT must NOT sign `Content-Type` (avoids SigV4 signed-header mismatch across S3/MinIO/LocalStack); the client sends `Content-Type: image/jpeg`.
- Commit trailer on every commit: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Backend commands run from `backend/`; frontend commands run from `frontend/`.

---

## File Structure

- `backend/src/lib/s3.ts` — add `generatePresignedPutUrl` (new single-object PUT presigner).
- `backend/src/__tests__/unit/s3.test.ts` — new unit test for the helper.
- `backend/src/domains/videos/videos.service.ts` — `initiateVideoUpload` returns `thumbnailUploadUrl`.
- `backend/src/domains/videos/videos.router.ts` — JSDoc `@returns` note only (response already forwarded verbatim).
- `backend/src/__tests__/unit/videos.service.test.ts` — add `generatePresignedPutUrl` to the S3 module mock.
- `backend/src/__tests__/http/videos.router.test.ts` — assert `thumbnailUploadUrl` is forwarded.
- `frontend/src/features/video/videoUpload/upload.service.ts` — add `thumbnailUploadUrl` to the initiate response type, add `uploadThumbnail`, wire it into `uploadVideo`.
- `frontend/src/features/video/videoUpload/upload.service.test.ts` — new unit test for `uploadThumbnail`.
- `frontend/src/features/video/videoUpload/useVideoUpload.ts` — pass the captured frame into `uploadVideo`.
- `frontend/src/features/video/videoCard/VideoCard.tsx` — neutral placeholder when the poster fails.
- `frontend/src/features/video/videoCard/VideoCard.test.tsx` — mock outlet context (also un-breaks pre-existing failures) + fallback test.

---

### Task 1: Backend — `generatePresignedPutUrl` S3 helper

**Files:**
- Modify: `backend/src/lib/s3.ts`
- Test: `backend/src/__tests__/unit/s3.test.ts` (create)

**Interfaces:**
- Produces: `generatePresignedPutUrl(key: string, expiresIn?: number): Promise<string>` — signs a bare `PutObjectCommand` (Bucket + Key only, no `ContentType`) and returns the signed URL.

- [ ] **Step 1: Write the failing test**

Create `backend/src/__tests__/unit/s3.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSignedUrlMock } = vi.hoisted(() => ({ getSignedUrlMock: vi.fn() }));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: getSignedUrlMock,
}));

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { generatePresignedPutUrl } from "../../lib/s3.js";

describe("generatePresignedPutUrl", () => {
  beforeEach(() => {
    getSignedUrlMock.mockReset();
    process.env.S3_BUCKET_NAME = "test-bucket";
  });

  it("signs a PutObject for the key without a signed Content-Type and returns the URL", async () => {
    getSignedUrlMock.mockResolvedValue("https://s3.example.com/put-url");

    const url = await generatePresignedPutUrl("uploads/abc/clip.jpg", 1800);

    expect(url).toBe("https://s3.example.com/put-url");
    const [, command, opts] = getSignedUrlMock.mock.calls[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({ Bucket: "test-bucket", Key: "uploads/abc/clip.jpg" });
    expect(command.input).not.toHaveProperty("ContentType");
    expect(opts).toEqual({ expiresIn: 1800 });
  });

  it("defaults expiresIn to 3600", async () => {
    getSignedUrlMock.mockResolvedValue("https://s3.example.com/put-url");

    await generatePresignedPutUrl("uploads/abc/clip.jpg");

    const [, , opts] = getSignedUrlMock.mock.calls[0];
    expect(opts).toEqual({ expiresIn: 3600 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && npx vitest run src/__tests__/unit/s3.test.ts`
Expected: FAIL — `generatePresignedPutUrl` is not exported.

- [ ] **Step 3: Implement the helper**

In `backend/src/lib/s3.ts`, add the following after `generatePresignedGetUrl` (the `PutObjectCommand` and `getSignedUrl` imports already exist):

```ts
/**
 * Generates a presigned URL for uploading a single object to S3 via PUT.
 * Used to persist the client-captured video poster alongside the video.
 *
 * Content-Type is intentionally NOT part of the signature: signing it makes
 * S3/MinIO/LocalStack reject any request whose header does not match exactly.
 * The client sends `Content-Type: image/jpeg`, which S3 still stores.
 *
 * @param key - The S3 object key to write (e.g. "uploads/<id>/clip.jpg")
 * @param expiresIn - URL lifetime in seconds (default: 3600 = 1 hour)
 *
 * @returns A signed URL string that grants temporary PUT access to the key
 */
export async function generatePresignedPutUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3, command, { expiresIn });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx vitest run src/__tests__/unit/s3.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/s3.ts backend/src/__tests__/unit/s3.test.ts
git commit -m "feat: add generatePresignedPutUrl S3 helper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Backend — return `thumbnailUploadUrl` from initiate upload

**Files:**
- Modify: `backend/src/domains/videos/videos.service.ts` (`initiateVideoUpload`)
- Modify: `backend/src/domains/videos/videos.router.ts` (JSDoc only)
- Modify: `backend/src/__tests__/unit/videos.service.test.ts` (S3 mock)
- Modify: `backend/src/__tests__/http/videos.router.test.ts` (forwarding assertion)

**Interfaces:**
- Consumes: `generatePresignedPutUrl` (Task 1), `thumbnailKeyFor` (already imported in the service).
- Produces: `initiateVideoUpload(...)` return object gains `thumbnailUploadUrl: string`. The POST `/domain/videos/upload` response body therefore includes `thumbnailUploadUrl`.

- [ ] **Step 1: Add `generatePresignedPutUrl` to the S3 mock, then write the failing forwarding test**

In `backend/src/__tests__/unit/videos.service.test.ts`, add to the `vi.mock("../../lib/s3.js", ...)` factory object (so the mocked module still exports everything the service imports):

```ts
  generatePresignedPutUrl: vi.fn().mockResolvedValue("https://s3.example.com/put.jpg"),
```

In `backend/src/__tests__/http/videos.router.test.ts`, update the existing test
`"POST /domain/videos/upload validates the body and forwards parsed data to the service"`
so `uploadResult` includes the new field and the response is asserted to carry it. Set:

```ts
    const uploadResult = {
      video: makeVideo({ status: "UPLOADING", s3UploadId: "upload-123" }),
      parts: [{ partNumber: 1, url: "https://s3.example.com/part-1" }],
      partSize: 10 * 1024 * 1024,
      totalParts: 1,
      expiresIn: 3600,
      thumbnailUploadUrl: "https://s3.example.com/thumb-put.jpg",
    };
```

and after the existing `expect(...)` assertions in that test, add:

```ts
    expect(response.body.thumbnailUploadUrl).toBe("https://s3.example.com/thumb-put.jpg");
```

(If the current `uploadResult` object differs in shape, keep its existing fields and only add `thumbnailUploadUrl`; the router forwards the object verbatim via `res.status(201).json(result)`.)

- [ ] **Step 2: Run the tests to verify the new assertion fails**

Run: `cd backend && npx vitest run src/__tests__/http/videos.router.test.ts`
Expected: FAIL — `response.body.thumbnailUploadUrl` is `undefined` only if the service actually stripped it; because the service is mocked here it will PASS as soon as the mock returns it. To get a genuinely failing-first signal, run the unit suite too:

Run: `cd backend && npx vitest run src/__tests__/unit/videos.service.test.ts`
Expected: PASS (mock addition is backward-compatible). Proceed — the real behavior is enforced by the service change in Step 3 plus the type in Step 3.

- [ ] **Step 3: Implement — return `thumbnailUploadUrl` from the service**

In `backend/src/domains/videos/videos.service.ts`:

Add `generatePresignedPutUrl` to the existing S3 import block:

```ts
import {
  generatePresignedGetUrl,
  generatePresignedPartUrls,
  generatePresignedPutUrl,
  initiateMultipartUpload,
  completeMultipartUpload,
  abortMultipartUpload,
  listUploadedParts,
  PART_SIZE,
} from "../../lib/s3.js";
```

Extend the `initiateVideoUpload` return type to include `thumbnailUploadUrl: string`:

```ts
): Promise<{
  video: Video;
  parts: { partNumber: number; url: string }[];
  partSize: number;
  totalParts: number;
  expiresIn: number;
  thumbnailUploadUrl: string;
}> {
```

At the end of the function, after the `parts` are generated and before the
`return`, add the poster PUT URL and include it in the returned object:

```ts
  const allPartNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);
  const parts = await generatePresignedPartUrls(
    video.s3Key,
    video.s3UploadId!,
    allPartNumbers,
    expiresIn
  );

  // Presigned PUT so the client can persist the captured poster alongside the
  // video at its derived .jpg key (no MediaConvert step exists — see VMP-163).
  const thumbnailUploadUrl = await generatePresignedPutUrl(
    thumbnailKeyFor(video.s3Key),
    expiresIn
  );

  return { video, parts, partSize: PART_SIZE, totalParts, expiresIn, thumbnailUploadUrl };
}
```

In `backend/src/domains/videos/videos.router.ts`, update the `POST /upload`
JSDoc `@returns` line to:

```ts
 * @returns 201 with { video, parts, partSize, totalParts, expiresIn, thumbnailUploadUrl }
```

- [ ] **Step 4: Run the backend suites to verify they pass**

Run: `cd backend && npx vitest run src/__tests__/unit/videos.service.test.ts src/__tests__/http/videos.router.test.ts`
Expected: PASS.

Run: `cd backend && npm run build`
Expected: PASS (no type errors — the new return field is typed).

- [ ] **Step 5: Commit**

```bash
git add backend/src/domains/videos/videos.service.ts backend/src/domains/videos/videos.router.ts backend/src/__tests__/unit/videos.service.test.ts backend/src/__tests__/http/videos.router.test.ts
git commit -m "feat: return thumbnailUploadUrl from initiate upload

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Frontend — persist the captured poster during upload

**Files:**
- Modify: `frontend/src/features/video/videoUpload/upload.service.ts`
- Test: `frontend/src/features/video/videoUpload/upload.service.test.ts` (create)
- Modify: `frontend/src/features/video/videoUpload/useVideoUpload.ts`

**Interfaces:**
- Consumes: `thumbnailUploadUrl` on the initiate response (Task 2).
- Produces:
  - `uploadThumbnail(uploadUrl: string, dataUrl: string): Promise<void>` — decodes a `data:image/jpeg` URL to a Blob and PUTs it; rejects on non-OK response.
  - `uploadVideo(file, metadata, onProgress?, signal?, frameDataUrl?: string | null): Promise<string>` — unchanged behavior plus a best-effort poster PUT.

- [ ] **Step 1: Write the failing test for `uploadThumbnail`**

Create `frontend/src/features/video/videoUpload/upload.service.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest"
import { uploadThumbnail } from "./upload.service"

describe("uploadThumbnail", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("decodes the data URL and PUTs it as image/jpeg", async () => {
    const blob = new Blob(["x"], { type: "image/jpeg" })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ blob: async () => blob }) // decode data URL
      .mockResolvedValueOnce({ ok: true }) // PUT
    vi.stubGlobal("fetch", fetchMock)

    await uploadThumbnail("https://s3.example.com/put", "data:image/jpeg;base64,AAAA")

    expect(fetchMock).toHaveBeenNthCalledWith(1, "data:image/jpeg;base64,AAAA")
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://s3.example.com/put", {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": "image/jpeg" },
    })
  })

  it("rejects when the PUT response is not ok", async () => {
    const blob = new Blob(["x"], { type: "image/jpeg" })
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ blob: async () => blob })
        .mockResolvedValueOnce({ ok: false, status: 403 }),
    )

    await expect(
      uploadThumbnail("https://s3.example.com/put", "data:image/jpeg;base64,AAAA"),
    ).rejects.toThrow(/403/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/features/video/videoUpload/upload.service.test.ts`
Expected: FAIL — `uploadThumbnail` is not exported.

- [ ] **Step 3: Implement `uploadThumbnail` and add the response field**

In `frontend/src/features/video/videoUpload/upload.service.ts`:

Add `thumbnailUploadUrl` to the `InitiateUploadResponse` type:

```ts
type InitiateUploadResponse = {
  video: { id: string; s3Key: string }
  parts: { partNumber: number; url: string }[]
  partSize: number
  totalParts: number
  expiresIn: number
  thumbnailUploadUrl: string
}
```

Add the `uploadThumbnail` function (place it near `captureVideoFrame`, exported):

```ts
/**
 * Uploads a client-captured poster to S3 via a presigned PUT URL. Converts the
 * `data:image/jpeg` URL produced by `captureVideoFrame` into a Blob and PUTs
 * it with an `image/jpeg` content type (the presigned URL does not sign the
 * content type, so this header is accepted and stored).
 *
 * Rejects on a non-OK response; callers treat poster upload as best-effort and
 * must not let a failure fail the video upload.
 *
 * @param uploadUrl - Presigned PUT URL for the poster's derived .jpg key
 * @param dataUrl - A data:image/jpeg;base64,... string
 */
export async function uploadThumbnail(uploadUrl: string, dataUrl: string): Promise<void> {
  const blob = await fetch(dataUrl).then((r) => r.blob())
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": "image/jpeg" },
  })
  if (!res.ok) {
    throw new Error(`Thumbnail upload failed (${res.status})`)
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/features/video/videoUpload/upload.service.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire the best-effort poster PUT into `uploadVideo`**

In `frontend/src/features/video/videoUpload/upload.service.ts`, change the
`uploadVideo` signature to accept the captured frame, and issue the poster PUT
concurrently with the part uploads. Replace the body from the `initiateUpload`
call through the `return`:

```ts
export async function uploadVideo(
  file: Blob,
  metadata: {
    videoTitle: string
    videoDescription?: string
    videoName: string
    durationSeconds: number
    createdAt: string
    takenAt: string
    studyId?: string
  },
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
  frameDataUrl?: string | null
): Promise<string> {
  const { video, parts, thumbnailUploadUrl } = await initiateUpload({
    ...metadata,
    fileSize: file.size,
    contentType: "video/mp4",
  })

  // Best-effort: persist the poster alongside the video. Runs concurrently with
  // the part uploads and starts right after initiate, so the poster survives
  // even if the large upload is later paused. A failure must not fail the upload.
  const thumbnailPromise =
    frameDataUrl != null
      ? uploadThumbnail(thumbnailUploadUrl, frameDataUrl).catch(() => {})
      : Promise.resolve()

  const uploadedParts = await uploadPartsWithConcurrency(
    parts,
    file,
    (bytes) => {
      onProgress?.(Math.round((bytes / file.size) * 100))
    },
    signal
  )

  await Promise.all([completeUpload(video.id, uploadedParts), thumbnailPromise])

  return video.id
}
```

- [ ] **Step 6: Pass the captured frame from the hook**

In `frontend/src/features/video/videoUpload/useVideoUpload.ts`, update the
`uploadVideo` call inside `handleFileSelected` to pass `frameDataUrl` as the
final argument (keep the existing `setThumbnail` call afterward):

```ts
      const videoId = await uploadVideo(
        file,
        {
          videoTitle: state.title,
          videoDescription: state.description || undefined,
          videoName: file.name,
          durationSeconds: meta.durationSeconds,
          createdAt: new Date().toISOString(),
          takenAt: meta.takenAt,
          studyId: effectiveStudyId ?? undefined,
        },
        (pct) => {
          dispatch({ type: "UPLOAD_PROGRESS", progress: pct, eta: computeEta(pct) })
        },
        abortController.current?.signal,
        frameDataUrl
      )

      if (frameDataUrl) {
        setThumbnail(videoId, frameDataUrl)
      }
```

- [ ] **Step 7: Verify types, lint, and existing upload tests still pass**

Run: `cd frontend && npx tsc -b`
Expected: PASS.

Run: `cd frontend && npm run lint`
Expected: PASS.

Run: `cd frontend && npx vitest run src/features/video/videoUpload`
Expected: PASS (upload.service, videoBlob, SelectStep suites).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/video/videoUpload/upload.service.ts frontend/src/features/video/videoUpload/upload.service.test.ts frontend/src/features/video/videoUpload/useVideoUpload.ts
git commit -m "feat: persist captured poster to S3 during upload

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Frontend — neutral placeholder when the poster is missing

**Files:**
- Modify: `frontend/src/features/video/videoCard/VideoCard.tsx`
- Modify: `frontend/src/features/video/videoCard/VideoCard.test.tsx`

**Interfaces:**
- Consumes: existing `getThumbnail(video.id)` cache and `video.imgUrl`.
- Produces: no new exports. `VideoCard` renders the existing `bg-black` + `CirclePlay` placeholder (no `<img>`) once the poster fails and no cache entry is usable.

- [ ] **Step 1: Add outlet-context mock + write the failing fallback test**

In `frontend/src/features/video/videoCard/VideoCard.test.tsx`, add `fireEvent`
to the Testing Library import and mock `useOutletContext` at the top of the file
(this also un-breaks the pre-existing `useOutletContext(...) is null` failures in
this suite). Add below the existing imports:

```ts
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useOutletContext: () => ({ mainRef: { current: null } }) };
});
```

Ensure `vi` is imported from vitest (add it to the existing `import { describe, it, expect } from "vitest"` line → `import { describe, it, expect, vi } from "vitest"`).

Add this test inside the `describe("VideoCard", ...)` block:

```ts
    it("shows a neutral placeholder instead of a broken image when the poster fails", () => {
        render(
            <MemoryRouter>
                <VideoCard video={mockVideo} />
            </MemoryRouter>
        );
        const img = screen.getByAltText("Test Video");
        fireEvent.error(img);
        expect(screen.queryByAltText("Test Video")).not.toBeInTheDocument();
    });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/features/video/videoCard/VideoCard.test.tsx`
Expected: FAIL — after the error event the `<img>` is still present (no fallback yet).

- [ ] **Step 3: Implement the placeholder state**

In `frontend/src/features/video/videoCard/VideoCard.tsx`:

Add a `posterFailed` state next to the existing `isPortrait` state:

```ts
    const [isPortrait, setIsPortrait] = useState(false);
    const [posterFailed, setPosterFailed] = useState(false);
```

Guard the blurred backdrop `<img>` on `!posterFailed`:

```tsx
                        {isPortrait && !posterFailed && (
                            <img
                                src={getThumbnail(video.id) ?? video.imgUrl}
                                alt=""
                                aria-hidden="true"
                                className="absolute inset-0 size-full object-cover blur-xl scale-110"
                            />
                        )}
```

Wrap the main poster `<img>` so it is not rendered once the poster has failed,
and update its `onError` to flip `posterFailed` when no cache entry can be used:

```tsx
                        {!posterFailed && (
                            <img
                                src={getThumbnail(video.id) ?? video.imgUrl}
                                alt={video.title}
                                className={isPortrait ? "h-full w-3/4 object-cover relative mx-auto" : "size-full object-cover"}
                                loading="lazy"
                                onLoad={(e) => {
                                    const img = e.currentTarget;
                                    setIsPortrait(img.naturalHeight > img.naturalWidth);
                                }}
                                onError={(e) => {
                                    const cached = getThumbnail(video.id);
                                    if (cached && e.currentTarget.src !== cached) {
                                        e.currentTarget.src = cached;
                                        return;
                                    }
                                    setPosterFailed(true);
                                }}
                            />
                        )}
```

The surrounding wrapper already provides `bg-black` with the `CirclePlay` overlay
and duration badge, so when `posterFailed` is true the card shows a clean, neutral
placeholder rather than a broken-image icon.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/features/video/videoCard/VideoCard.test.tsx`
Expected: PASS (all VideoCard tests, including the previously-broken ones now that outlet context is mocked).

- [ ] **Step 5: Verify types and lint**

Run: `cd frontend && npx tsc -b`
Expected: PASS.

Run: `cd frontend && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/video/videoCard/VideoCard.tsx frontend/src/features/video/videoCard/VideoCard.test.tsx
git commit -m "feat: show placeholder when video poster is missing

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final verification (after all tasks)

- [ ] Backend full suite: `cd backend && npm test` — expected PASS.
- [ ] Frontend full suite: `cd frontend && npm test` — expected: no NEW failures vs. `develop`. (The VideoCard `useOutletContext` failures are fixed by Task 4; other pre-existing `useOutletContext(...) is null` failures in TimestampAnnotation/ClipCard/DrawingCard remain out of scope.)
- [ ] Manual verify (see /verify): upload a real video on the local (LOCAL=true / MinIO) stack, confirm a `.jpg` object is written at `thumbnailKeyFor(s3Key)`, refresh the video list and reload the review page in a fresh session, and confirm the poster renders (not a broken image). Confirm a simulated poster-PUT failure does not fail the video upload.

## Notes / self-review

- **Spec coverage:** presigned PUT helper (Task 1) ✅; `thumbnailUploadUrl` from initiate (Task 2) ✅; client `uploadThumbnail` + early concurrent best-effort PUT + hook wiring (Task 3) ✅; UI fallback in `VideoCard` (Task 4) ✅; players unchanged (native `poster` failure is silent) — documented, no task needed ✅; no data-model change ✅.
- **Deferred (per spec):** orphaned-poster cleanup on cancel; explicit resume-path backfill.
- **Test-harness note:** the full `initiateVideoUpload` service path is not unit-tested (no existing scaffold for its user/study/transaction Prisma surface); the new behavior is covered by the `generatePresignedPutUrl` unit test, the router forwarding assertion, and the manual verify step.
