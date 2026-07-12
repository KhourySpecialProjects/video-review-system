# VMP-167 — iOS Photos-picker upload hang: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop caregiver video uploads from silently hanging on iOS Safari when the file comes from the Photos picker, so the upload always proceeds (or fails visibly).

**Architecture:** The pre-upload metadata/thumbnail helpers (`extractVideoMetadata`, `captureVideoFrame`) build a detached `<video>` from `URL.createObjectURL(file)` and await media events. iOS Photos files carry an empty MIME `type`, so the `<video>` never loads and those un-timed-out promises hang before `uploadVideo` is ever called. Fix: (1) load the `<video>` from a correctly-typed blob (infer MIME from the filename when `file.type` is empty), and (2) make both helpers best-effort with a timeout so they can never block the upload. Bytes still upload via `file.slice()` (works for Photos files), and the player reads the real duration at playback (VMP-162), so fallback metadata is harmless.

**Tech Stack:** React 19, Vite, TypeScript, Vitest. Spec: Linear VMP-167.

## Global Constraints

- Branch `vmp-167-ios-caregiver-video-upload-from-photos-picker-hangs-empty` (already created off `develop`); one PR back into `develop`.
- Helpers must never `reject`/hang the upload path — on error or timeout they resolve with a fallback.
- Do NOT change the multipart upload logic (`uploadVideo`) — it already reads bytes via `file.slice()`.
- HEVC→H.264 transcoding is explicitly out of scope (separate future issue).
- Run frontend commands from `frontend/`. Test: `npx vitest run <path>`. Typecheck/build: `npm run build`.
- Known pre-existing test failures (VideoCard, ClipCard, DrawingCard, TimestampAnnotation) are unrelated — don't fix, don't add new ones.

## File Structure

- `frontend/src/features/video/videoUpload/videoBlob.ts` (new) — pure helpers `inferVideoMimeType`, `typedVideoBlob`.
- `frontend/src/features/video/videoUpload/videoBlob.test.ts` (new) — unit tests for the helpers.
- `frontend/src/features/video/videoUpload/upload.service.ts` (modify) — `extractVideoMetadata`, `captureVideoFrame`.
- `frontend/src/features/video/videoUpload/useVideoUpload.ts` (modify, minor) — accommodate `captureVideoFrame`'s `string | null` return.

---

### Task 1: Pure blob-typing helpers

**Files:**
- Create: `frontend/src/features/video/videoUpload/videoBlob.ts`
- Test: `frontend/src/features/video/videoUpload/videoBlob.test.ts`

**Interfaces:**
- Produces:
  - `inferVideoMimeType(fileName: string): string` — MIME from extension; default `video/mp4`.
  - `typedVideoBlob(file: Blob): Blob` — returns `file` unchanged when its `type` already starts with `video/`; otherwise a `new Blob([file], { type })` with an inferred type (from `file.name` when it's a `File`).

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/video/videoUpload/videoBlob.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { inferVideoMimeType, typedVideoBlob } from "./videoBlob";

describe("inferVideoMimeType", () => {
  it("maps .mov to video/quicktime (case-insensitive)", () => {
    expect(inferVideoMimeType("IMG_1234.MOV")).toBe("video/quicktime");
  });
  it("maps .mp4/.m4v to video/mp4", () => {
    expect(inferVideoMimeType("clip.mp4")).toBe("video/mp4");
    expect(inferVideoMimeType("clip.m4v")).toBe("video/mp4");
  });
  it("maps .avi to video/x-msvideo", () => {
    expect(inferVideoMimeType("clip.avi")).toBe("video/x-msvideo");
  });
  it("defaults to video/mp4 for unknown/missing extensions", () => {
    expect(inferVideoMimeType("noext")).toBe("video/mp4");
    expect(inferVideoMimeType("")).toBe("video/mp4");
  });
});

describe("typedVideoBlob", () => {
  it("returns the same file when it already has a video/* type", () => {
    const f = new File(["x"], "a.mp4", { type: "video/mp4" });
    expect(typedVideoBlob(f)).toBe(f);
  });
  it("re-types a File that has an empty MIME type using its name", () => {
    const f = new File(["x"], "movie.mov", { type: "" });
    const out = typedVideoBlob(f);
    expect(out).not.toBe(f);
    expect(out.type).toBe("video/quicktime");
  });
  it("re-types a bare Blob (no name) to the default video/mp4", () => {
    const b = new Blob(["x"], { type: "" });
    expect(typedVideoBlob(b).type).toBe("video/mp4");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/video/videoUpload/videoBlob.test.ts`
Expected: FAIL — cannot resolve `./videoBlob`.

- [ ] **Step 3: Implement the helpers**

Create `frontend/src/features/video/videoUpload/videoBlob.ts`:
```ts
/**
 * @description Infers a video MIME type from a filename extension. Used when a
 * picked File has an empty `type` (notably the iOS Photos picker), so a
 * temporary `<video>` element can still recognise the blob as video.
 * @param fileName - The file name (may be empty)
 * @returns A `video/*` MIME type; defaults to `video/mp4`
 */
export function inferVideoMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "mov":
    case "qt":
      return "video/quicktime";
    case "avi":
      return "video/x-msvideo";
    case "webm":
      return "video/webm";
    case "mp4":
    case "m4v":
    default:
      return "video/mp4";
  }
}

/**
 * @description Returns a blob guaranteed to carry a `video/*` MIME type. Files
 * from the iOS Photos picker often have an empty `type`, which prevents a
 * `<video>` element from loading them via `createObjectURL`. When the type is
 * missing/non-video, wraps the bytes in a new Blob with an inferred type.
 * @param file - The selected File or Blob
 * @returns The original file when already typed, else a re-typed Blob
 */
export function typedVideoBlob(file: Blob): Blob {
  if (file.type && file.type.startsWith("video/")) return file;
  const name = file instanceof File ? file.name : "";
  return new Blob([file], { type: inferVideoMimeType(name) });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/video/videoUpload/videoBlob.test.ts`
Expected: PASS (7 tests). If the run errors with `Blob`/`File is not defined`, add `// @vitest-environment jsdom` as the first line of the test file and re-run.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/video/videoUpload/videoBlob.ts frontend/src/features/video/videoUpload/videoBlob.test.ts
git commit -m "VMP-167: add video MIME inference + blob re-typing helpers"
```

---

### Task 2: Harden metadata + thumbnail extraction (no hang, typed blob)

**Files:**
- Modify: `frontend/src/features/video/videoUpload/upload.service.ts` (`extractVideoMetadata` ~52-81, `captureVideoFrame` ~91-122; add import)
- Modify: `frontend/src/features/video/videoUpload/useVideoUpload.ts` (accommodate `string | null` thumbnail)

**Interfaces:**
- Consumes: `typedVideoBlob` from Task 1.
- Produces (changed signatures):
  - `extractVideoMetadata(file: Blob | File): Promise<{ durationSeconds: number; takenAt: string }>` — now always resolves (fallback `durationSeconds: 0` on error/timeout).
  - `captureVideoFrame(file: Blob): Promise<string | null>` — now resolves `null` on error/timeout instead of rejecting.

> The `<video>` event flow cannot be exercised in jsdom, so this task is verified by typecheck + build + the full suite staying green, and by the on-device manual check in Task 3. The unit-tested logic lives in Task 1's helpers.

- [ ] **Step 1: Add the import**

At the top of `frontend/src/features/video/videoUpload/upload.service.ts`, add:
```ts
import { typedVideoBlob } from "./videoBlob"
```

- [ ] **Step 2: Replace `extractVideoMetadata`**

Replace the whole function (currently ~lines 52-81) with:
```ts
/** Metadata/thumbnail probes must never block the upload; give up after this. */
const MEDIA_PROBE_TIMEOUT_MS = 8000

/**
 * Extracts duration and last-modified date from a video Blob using a temporary
 * `<video>` element. Best-effort: on error or timeout (e.g. iOS Photos files
 * whose metadata never loads) it resolves with a fallback duration of 0 rather
 * than rejecting, so the upload always proceeds. The player reads the true
 * duration from the media at playback time.
 *
 * @param file - The video Blob (or File) to inspect
 * @returns The duration in seconds and the takenAt ISO string
 */
export function extractVideoMetadata(
  file: Blob | File
): Promise<{ durationSeconds: number; takenAt: string }> {
  return new Promise((resolve) => {
    const video = document.createElement("video")
    video.preload = "metadata"
    video.muted = true
    video.playsInline = true

    const url = URL.createObjectURL(typedVideoBlob(file))
    video.src = url

    // Use File.lastModified when available (typically the recording date on
    // mobile); fall back to now for bare Blobs.
    const takenAt =
      file instanceof File
        ? new Date(file.lastModified).toISOString()
        : new Date().toISOString()

    let settled = false
    const finish = (durationSeconds: number) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve({ durationSeconds, takenAt })
    }

    const timer = setTimeout(() => finish(0), MEDIA_PROBE_TIMEOUT_MS)

    video.onloadedmetadata = () => {
      finish(Number.isFinite(video.duration) ? Math.round(video.duration) : 0)
    }
    video.onerror = () => finish(0)
  })
}
```

- [ ] **Step 3: Replace `captureVideoFrame`**

Replace the whole function (currently ~lines 91-122) with:
```ts
/**
 * Captures a single frame from a video file at ~1 second and returns it as a
 * JPEG data URL, or `null` if the frame can't be captured. Best-effort: on
 * error or timeout it resolves `null` (never rejects/hangs) so the upload
 * proceeds without a client-side thumbnail.
 *
 * @param file - The video Blob (or File) to capture a frame from
 * @returns A data:image/jpeg data URL, or null
 */
export function captureVideoFrame(file: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video")
    video.preload = "auto"
    video.muted = true
    video.playsInline = true

    const url = URL.createObjectURL(typedVideoBlob(file))
    video.src = url

    let settled = false
    const finish = (result: string | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(result)
    }

    const timer = setTimeout(() => finish(null), MEDIA_PROBE_TIMEOUT_MS)

    video.onloadedmetadata = () => {
      // Seek to 1s or halfway; guard against non-finite durations.
      video.currentTime = Number.isFinite(video.duration)
        ? Math.min(1, video.duration / 2)
        : 0
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext("2d")
        if (!ctx) return finish(null)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        finish(canvas.toDataURL("image/jpeg", 0.7))
      } catch {
        finish(null)
      }
    }

    video.onerror = () => finish(null)
  })
}
```

- [ ] **Step 4: Simplify the caller in `useVideoUpload.ts`**

`captureVideoFrame` no longer rejects, so the `.catch(() => null)` is redundant. In `frontend/src/features/video/videoUpload/useVideoUpload.ts` (~line 219-222), change:
```ts
      const [meta, frameDataUrl] = await Promise.all([
        extractVideoMetadata(file),
        captureVideoFrame(file).catch(() => null),
      ])
```
to:
```ts
      const [meta, frameDataUrl] = await Promise.all([
        extractVideoMetadata(file),
        captureVideoFrame(file),
      ])
```
(`frameDataUrl` is now `string | null`; the existing `if (frameDataUrl) setThumbnail(...)` guard is unchanged and still correct.)

- [ ] **Step 5: Typecheck + build**

Run: `npm run build`
Expected: succeeds (tsc + Vite), no type errors.

- [ ] **Step 6: Full test suite (no new failures)**

Run: `npx vitest run`
Expected: the new `videoBlob` tests pass; total failures no higher than the known baseline (4 files: VideoCard/ClipCard/DrawingCard/TimestampAnnotation).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/video/videoUpload/upload.service.ts frontend/src/features/video/videoUpload/useVideoUpload.ts
git commit -m "VMP-167: load probe <video> from a typed blob + timeout so iOS Photos uploads never hang"
```

---

### Task 3: Verify & ship

**Files:** none (verification only).

- [ ] **Step 1: Final build + suite**

Run: `npm run build` (green) and `npx vitest run` (no new failures vs baseline).

- [ ] **Step 2: Push + open PR**

```bash
git push -u origin vmp-167-ios-caregiver-video-upload-from-photos-picker-hangs-empty
gh pr create --base develop --title "VMP-167: Fix iOS Photos-picker upload hang" --body "<summary + on-device verification checklist>"
```

- [ ] **Step 3: On-device manual verification (operator, after Coolify auto-deploy)**

On an iPhone, as a caregiver:
1. Upload a video via the **Photos/camera-roll** picker → upload now starts (progress shown) and completes; the video appears on the phone and on desktop.
2. Upload a video via the **Files** app → still works (regression check).
3. If a Photos video's metadata can't be read, the upload still succeeds (duration may show 0 on the card; playback still shows the real length).

> Note: HEVC camera-roll videos will upload but may not play in desktop Chrome/Firefox — tracked separately (transcoding), not part of this fix.
