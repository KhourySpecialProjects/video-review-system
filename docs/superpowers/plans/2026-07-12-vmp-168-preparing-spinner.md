# VMP-168 — "Preparing video" spinner: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give immediate UI feedback during the ~3–4s pre-upload metadata/thumbnail phase by wiring the existing `processing` state and showing an indeterminate spinner + "Preparing video…".

**Architecture:** The upload state machine already has a `processing` status + `PROCESSING_STARTED` action; `handleFileSelected` just never dispatches it, and `SelectStep`'s current `processing` rendering reuses the determinate progress bar. Fix: dispatch `PROCESSING_STARTED` first, and render `processing` as a spinner instead of a 0% bar.

**Tech Stack:** React 19, Vitest + Testing Library. Spec: Linear VMP-168.

## Global Constraints
- Branch `vmp-168-show-a-preparing-video-spinner-during-pre-upload-processing` (already created off `develop`); one PR into `develop`.
- Frontend-only. Run from `frontend/`. Test: `npx vitest run <path>`. Build: `npm run build`.
- `Spinner` is `@/components/ui/spinner` (renders `role="status"`, `aria-label="Loading"`).
- Known pre-existing failing test files (VideoCard/ClipCard/DrawingCard/TimestampAnnotation) — don't touch, don't add new failures.

## File Structure
- `frontend/src/features/video/videoUpload/SelectStep.tsx` (modify) — dedicated `processing` render branch (spinner).
- `frontend/src/features/video/videoUpload/SelectStep.test.tsx` (new) — render tests per status.
- `frontend/src/features/video/videoUpload/useVideoUpload.ts` (modify) — dispatch `PROCESSING_STARTED` at start of `handleFileSelected`.

---

### Task 1: SelectStep shows a spinner for the `processing` status

**Files:**
- Create: `frontend/src/features/video/videoUpload/SelectStep.test.tsx`
- Modify: `frontend/src/features/video/videoUpload/SelectStep.tsx`

**Interfaces:** consumes `UploadStatus` (existing).

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/video/videoUpload/SelectStep.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SelectStep } from "./SelectStep";

describe("SelectStep", () => {
  it("shows a spinner and 'Preparing video' during processing", () => {
    render(
      <SelectStep
        onFileSelected={vi.fn()}
        upload={{ status: "processing", fileName: "clip.mov", progress: 0, eta: 0 }}
      />,
    );
    expect(screen.getByText(/Preparing video/i)).toBeInTheDocument();
    expect(screen.getByText("clip.mov")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument(); // Spinner
    // No pause button and no determinate progress during processing.
    expect(screen.queryByText(/Upload Later/i)).not.toBeInTheDocument();
  });

  it("shows the progress bar while uploading", () => {
    render(
      <SelectStep
        onFileSelected={vi.fn()}
        upload={{ status: "uploading", fileName: "clip.mp4", progress: 42, eta: 0 }}
        onPause={vi.fn()}
      />,
    );
    expect(screen.getByText("clip.mp4")).toBeInTheDocument();
    expect(screen.getByText(/Upload Later/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect the processing test to fail**

Run: `npx vitest run src/features/video/videoUpload/SelectStep.test.tsx`
Expected: the "processing" test FAILS (no spinner / no "Preparing video" text yet); the "uploading" test may already pass.
If it errors with `document is not defined`, add `// @vitest-environment jsdom` as the first line.

- [ ] **Step 3: Implement the processing branch**

In `frontend/src/features/video/videoUpload/SelectStep.tsx`:

Add the import near the top:
```tsx
import { Spinner } from "@/components/ui/spinner"
```

Add a dedicated branch before the shared progress `return` (after the `error` branch, ~line 38):
```tsx
  if (upload.status === "processing") {
    return (
      <section aria-label="Preparing video" aria-live="polite">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
          Preparing video
        </p>

        <Card className="mb-4">
          <CardContent className="flex items-center gap-2 py-2 px-3">
            <Video className="size-4 text-text-muted shrink-0" strokeWidth={1.75} />
            <span className="text-sm truncate">{upload.fileName}</span>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Spinner />
          <span>Preparing video…</span>
        </div>
      </section>
    )
  }
```

Then simplify the remaining shared block to `uploading`-only (it is only reached for `uploading` now). Replace:
```tsx
  const isUploading = upload.status === "uploading"
  const label = upload.status === "processing" ? "Processing video" : "Uploading video"
```
with:
```tsx
  const label = "Uploading video"
```
and change the pause button guard from `{isUploading && onPause && (` to `{onPause && (`.

- [ ] **Step 4: Run test — expect GREEN**

Run: `npx vitest run src/features/video/videoUpload/SelectStep.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/video/videoUpload/SelectStep.tsx frontend/src/features/video/videoUpload/SelectStep.test.tsx
git commit -m "VMP-168: render a spinner + 'Preparing video…' for the processing status"
```

---

### Task 2: Dispatch `PROCESSING_STARTED` before extraction

**Files:** Modify `frontend/src/features/video/videoUpload/useVideoUpload.ts` (`handleFileSelected`, ~line 213).

- [ ] **Step 1: Dispatch processing at the start**

In `handleFileSelected`, immediately after `abortController.current = new AbortController()` and before the `try`/`Promise.all`, add:
```ts
    dispatch({ type: "PROCESSING_STARTED", fileName: file.name })
```
So the status flips to `processing` the instant a file is chosen, before `extractVideoMetadata`/`captureVideoFrame` run.

- [ ] **Step 2: Build + full suite**

Run: `npm run build` (green) and `npx vitest run` (new SelectStep tests pass; no new failures vs baseline).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/video/videoUpload/useVideoUpload.ts
git commit -m "VMP-168: enter processing state immediately on file select"
```

---

### Task 3: Verify & ship

- [ ] **Step 1:** `npm run build` green; `npx vitest run` no new failures.
- [ ] **Step 2:** push branch; `gh pr create --base develop` with summary + on-device note.
- [ ] **Step 3 (operator, after deploy):** on iPhone, pick a video → a spinner + "Preparing video…" appears immediately, then transitions to the upload progress bar.
