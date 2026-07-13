# VMP-163 — Persistent video posters (no MediaConvert)

**Linear:** [VMP-163](https://linear.app/next-consulting/issue/VMP-163) · follow-up to VMP-162
**Date:** 2026-07-13
**Status:** Approved

## Problem

There is no server-side thumbnail/poster generation. The app was designed
around an AWS MediaConvert post-processing step that would emit `<base>.jpg`
alongside each upload, but that pipeline was never built.

Today `captureVideoFrame()` produces a poster during upload, but it is only
cached **client-side** (`thumbnailCache`, `useVideoUpload.ts`) — never uploaded
to S3. On the no-AWS deployments (local + Coolify) this means:

- Real uploads have **no persistent poster**: the reviewer (and any other
  session) sees a broken/empty poster after refresh.
- `getVideoStreamUrl` and the video list derive the thumbnail key via
  `thumbnailKeyFor(s3Key)` (extension → `.jpg`). The presigned GET URL is
  always produced (presigning does not check existence), so the URL simply
  **404s at fetch time** for real uploads because no `.jpg` object exists.

Seeded videos are unaffected — the seed already uploads matching `.jpg`
posters.

## Goal

Persist the `captureVideoFrame()` JPEG to S3 at `thumbnailKeyFor(video.s3Key)`
during the upload flow, so the poster survives cross-session for real uploads,
and degrade gracefully in the UI when a poster is still missing.

## Non-goals / data model

- **No data-model change.** The poster's key is *derived* from the existing
  `Video.s3Key` column via `thumbnailKeyFor()` on both write and read. No new
  column, no migration, no `hasThumbnail` flag. Poster existence is discovered
  client-side at fetch time (see UI fallback), not tracked in the DB.
- **Deferred (out of scope):** orphaned-poster cleanup when an in-progress
  upload is cancelled (`cancelVideoUpload` deletes the video record but would
  leave the early-PUT `.jpg` behind — harmless, never referenced); explicit
  poster backfill on the resume path (redundant because the poster is PUT
  early, on the first attempt — see below).

## Approach

Upload the captured frame **direct to S3 via a presigned PUT**, matching the
existing architecture where all media bytes go direct to S3 via presigned URLs
and never through the app server. The PUT is issued **early** (right after
`initiate`, concurrently with the part uploads), so the poster persists even if
the large upload is later paused — which is why the resume path needs no
special handling.

```
capture frame
  │ (data:image/jpeg URL)
initiate upload ──► returns part URLs + thumbnailUploadUrl
  │
  ├─ PUT jpeg ─────► S3 (thumbnailKeyFor)   [best-effort, concurrent, early]
  └─ upload parts ─► S3
  │
complete-upload
```

### Backend

1. **`backend/src/lib/s3.ts` — new `generatePresignedPutUrl(key, expiresIn = 3600)`.**
   Signs a bare `PutObjectCommand` (Bucket + Key only). **Content-Type is not
   part of the signature** — this avoids the SigV4 signed-header-mismatch
   failure mode across S3 / MinIO / LocalStack. The client still sends
   `Content-Type: image/jpeg` (inferred from the Blob), so the stored object
   gets the correct content type.

2. **`initiateVideoUpload` (`videos.service.ts`) returns `thumbnailUploadUrl`** —
   a presigned PUT for `thumbnailKeyFor(video.s3Key)`, generated alongside the
   existing part URLs. Threaded through the router response and the response
   type.

### Frontend

3. **`upload.service.ts` — new `uploadThumbnail(url, dataUrl)`.**
   Converts the `data:image/jpeg` URL → Blob (`fetch(dataUrl).then(r => r.blob())`)
   and PUTs it to the presigned URL. `uploadVideo` gains a `frameDataUrl` param;
   right after `initiateUpload` it kicks off the thumbnail PUT **concurrently
   with the part uploads** and awaits it (best-effort, errors swallowed) before
   reporting success. A poster PUT failure must **never** fail the video upload.

4. **`useVideoUpload.ts`** — pass the already-captured `frameDataUrl` into
   `uploadVideo`. Keep the existing `thumbnailCache.setThumbnail` call for
   instant in-session display before the list refetches.

### UI fallback (in scope)

5. **`VideoCard.tsx`** — extend the existing `onError` handler: it already
   falls back to the in-memory cache; when there is no usable cache entry, flip
   a `posterFailed` state and render the neutral placeholder instead of a broken
   `<img>`. The thumbnail wrapper is already `bg-black` with a `CirclePlay`
   overlay, so hiding the failed image leaves a clean placeholder.

   The two players (`video-view.tsx`, `VideoReview.tsx`) pass `imgUrl` as a
   native `<video poster>`; browsers already ignore a failed poster silently
   (no broken-image icon), so they need no change.

## Testing

**Backend**
- Unit: `generatePresignedPutUrl` returns a signed URL (mock `getSignedUrl`).
- Unit: `initiateVideoUpload` includes `thumbnailUploadUrl` for
  `thumbnailKeyFor(s3Key)`.
- HTTP: the initiate response body carries `thumbnailUploadUrl`.

**Frontend**
- `uploadThumbnail` converts the data URL and issues a PUT with the blob.
- `uploadVideo` invokes the thumbnail PUT with the returned URL, and a PUT
  failure does **not** reject the upload.
- `VideoCard` renders the neutral placeholder (not a broken image) when the
  poster fails and no cache entry exists.

## Risks / notes

- **Content-Type on presigned PUT:** intentionally unsigned to avoid mismatch
  failures; the Blob's `image/jpeg` type is sent by the browser and stored by
  S3/MinIO/LocalStack.
- **CORS:** the video part uploads already PUT direct to the storage endpoint
  via presigned URLs, so the required CORS `PUT` config is already in place; the
  poster PUT uses the same path.
- **Orphaned posters** from cancelled uploads are possible (early PUT) but
  harmless and explicitly deferred.
