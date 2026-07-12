import { apiFetch } from "@/lib/api"
import { typedVideoBlob } from "./videoBlob"

const PART_SIZE = 10 * 1024 * 1024 // 10 MB — must match backend
const MAX_PART_RETRIES = 4
const RETRY_BASE_DELAY_MS = 500

type InitiateUploadResponse = {
  video: { id: string; s3Key: string }
  parts: { partNumber: number; url: string }[]
  partSize: number
  totalParts: number
  expiresIn: number
}

type UploadedPart = {
  partNumber: number
  etag: string
}

type PresignedPart = {
  partNumber: number
  url: string
}

/**
 * @description Detects mobile user agents so we can lower upload concurrency.
 * Mobile radios and memory budgets can't sustain as many parallel PUTs as desktop.
 * @returns True when the current device looks like a phone or tablet
 */
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/**
 * @description Picks how many S3 part uploads should run in parallel. Mobile
 * gets a lower cap to avoid saturating the radio and triggering memory-pressure
 * page kills on iOS Safari; desktop matches the typical 6-per-host browser cap.
 * @returns Maximum concurrent part uploads
 */
function getUploadConcurrency(): number {
  return isMobileDevice() ? 3 : 6
}

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

    // Re-type the blob when its MIME is empty (iOS Photos picker) so the
    // <video> element will actually load it via the object URL.
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

/**
 * Initiates a multipart upload by creating a video record on the backend.
 *
 * @param metadata - Video metadata required by the backend
 * @returns The video record, presigned part URLs, and upload details
 */
async function initiateUpload(metadata: {
  videoTitle: string
  videoDescription?: string
  videoName: string
  fileSize: number
  durationSeconds: number
  createdAt: string
  takenAt: string
  contentType: string
  studyId?: string
}): Promise<InitiateUploadResponse> {
  const res = await apiFetch("/videos/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Failed to initiate upload (${res.status})`)
  }

  return res.json()
}

/**
 * @description Uploads a single part to S3 using a presigned URL via
 * `XMLHttpRequest` so we can emit byte-level upload progress (which `fetch`
 * does not expose). The abort signal is wired to `xhr.abort()`.
 * @param url - Presigned PUT URL for the part
 * @param body - The chunk of the file to upload
 * @param onBytes - Called with cumulative bytes uploaded for this attempt
 * @param signal - Abort signal used to cancel the in-flight request
 * @returns The ETag header returned by S3
 */
function uploadPart(
  url: string,
  body: Blob,
  onBytes?: (bytes: number) => void,
  signal?: AbortSignal
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }

    const xhr = new XMLHttpRequest()
    const abort = () => xhr.abort()
    signal?.addEventListener("abort", abort)

    /**
     * @description Detaches the signal listener once the request settles.
     */
    const cleanup = () => signal?.removeEventListener("abort", abort)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onBytes?.(e.loaded)
    }
    xhr.onload = () => {
      cleanup()
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`S3 part upload failed (${xhr.status})`))
        return
      }
      const etag = xhr.getResponseHeader("ETag")
      if (!etag) reject(new Error("S3 did not return an ETag"))
      else resolve(etag)
    }
    xhr.onerror = () => {
      cleanup()
      reject(new Error("S3 part upload network error"))
    }
    xhr.onabort = () => {
      cleanup()
      reject(new DOMException("Aborted", "AbortError"))
    }

    xhr.open("PUT", url)
    xhr.send(body)
  })
}

/**
 * @description Uploads a single part with exponential-backoff retry on
 * transient failures. Aborts propagate immediately without retry so that
 * user-initiated pause still cancels fast. On retry the byte counter is
 * reset to zero so callers aggregating per-part bytes don't double-count.
 * @param url - Presigned PUT URL for the part
 * @param body - The chunk of the file to upload
 * @param onBytes - Called with cumulative bytes uploaded for the current attempt
 * @param signal - Abort signal used to cancel the in-flight request
 * @returns The ETag header returned by S3
 */
async function uploadPartWithRetry(
  url: string,
  body: Blob,
  onBytes?: (bytes: number) => void,
  signal?: AbortSignal
): Promise<string> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= MAX_PART_RETRIES; attempt++) {
    try {
      return await uploadPart(url, body, onBytes, signal)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err
      lastErr = err
      onBytes?.(0)
      if (attempt === MAX_PART_RETRIES) break
      const delay = RETRY_BASE_DELAY_MS * 2 ** attempt + Math.random() * 200
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastErr
}

/**
 * @description Uploads every presigned part with a bounded concurrency pool.
 * Workers pull parts off a shared cursor so slower parts don't block faster
 * ones, and the pool size is sized for the device (mobile: 3, desktop: 6) to
 * avoid saturating the mobile radio / memory. Byte counts per part are
 * tracked live so `onBytes` can emit smooth sub-part progress.
 * @param parts - Presigned parts still to upload
 * @param file - The source video Blob to slice chunks from
 * @param onBytes - Called with total bytes uploaded across all parts
 * @param signal - Abort signal used to cancel in-flight PUTs
 * @returns Uploaded parts in original presigned-part order
 */
async function uploadPartsWithConcurrency(
  parts: PresignedPart[],
  file: Blob,
  onBytes: (bytesUploaded: number) => void,
  signal?: AbortSignal
): Promise<UploadedPart[]> {
  const results = new Array<UploadedPart>(parts.length)
  const partBytes = new Array<number>(parts.length).fill(0)
  let cursor = 0

  /**
   * @description Sums per-part byte counters and emits a total.
   */
  const emit = () => {
    let total = 0
    for (let i = 0; i < partBytes.length; i++) total += partBytes[i]
    onBytes(total)
  }

  /**
   * @description Worker loop that drains the shared part cursor until empty.
   */
  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++
      if (i >= parts.length) return
      const { partNumber, url } = parts[i]
      const start = (partNumber - 1) * PART_SIZE
      const end = Math.min(start + PART_SIZE, file.size)
      const chunk = file.slice(start, end)
      const etag = await uploadPartWithRetry(
        url,
        chunk,
        (bytes) => {
          partBytes[i] = bytes
          emit()
        },
        signal
      )
      results[i] = { partNumber, etag }
      partBytes[i] = chunk.size
      emit()
    }
  }

  const poolSize = Math.min(getUploadConcurrency(), parts.length)
  await Promise.all(Array.from({ length: poolSize }, () => worker()))
  return results
}

/**
 * Completes a multipart upload by sending part ETags to the backend.
 *
 * @param videoId - The video uuid
 * @param parts - Array of { partNumber, etag } for all uploaded parts
 */
async function completeUpload(videoId: string, parts: UploadedPart[]): Promise<void> {
  const res = await apiFetch(`/videos/${videoId}/complete-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parts }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Failed to complete upload (${res.status})`)
  }
}

/**
 * Orchestrates the full multipart upload flow:
 * 1. Initiates upload on the backend (creates video record + S3 multipart)
 * 2. Uploads each part to S3 in parallel using presigned URLs
 * 3. Completes the upload on the backend
 *
 * @param file - The video file Blob to upload
 * @param metadata - Video metadata for the backend
 * @param onProgress - Callback with upload progress (0–100)
 * @returns The created video ID
 */
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
  signal?: AbortSignal
): Promise<string> {
  const { video, parts } = await initiateUpload({
    ...metadata,
    fileSize: file.size,
    contentType: "video/mp4",
  })

  const uploadedParts = await uploadPartsWithConcurrency(
    parts,
    file,
    (bytes) => {
      onProgress?.(Math.round((bytes / file.size) * 100))
    },
    signal
  )

  await completeUpload(video.id, uploadedParts)

  return video.id
}

/**
 * Cancels an in-progress upload on the backend, aborting the S3
 * multipart upload and deleting the video record.
 *
 * @param videoId - The video uuid to cancel
 */
export async function cancelUpload(videoId: string): Promise<void> {
  const res = await apiFetch(`/videos/${videoId}/cancel-upload`, {
    method: "POST",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Failed to cancel upload (${res.status})`)
  }
}

/**
 * Fetches the upload status for a video and resumes uploading
 * the remaining parts. Validates that the provided file matches
 * the expected size before resuming.
 *
 * @param videoId - The video uuid to resume
 * @param file - The same video file the user originally selected
 * @param onProgress - Callback with upload progress (0–100), starting from where it left off
 * @returns The video ID on success
 */
export async function resumeUpload(
  videoId: string,
  file: Blob,
  onProgress?: (percent: number) => void
): Promise<string> {
  const statusRes = await apiFetch(`/videos/${videoId}/upload-status`)
  if (!statusRes.ok) {
    const body = await statusRes.json().catch(() => null)
    throw new Error(body?.message ?? `Failed to fetch upload status (${statusRes.status})`)
  }

  const status = await statusRes.json()

  if (file.size !== status.video.fileSize) {
    throw new Error(
      `File size mismatch: expected ${status.video.fileSize} bytes but got ${file.size} bytes. Please select the same file.`
    )
  }

  const totalParts: number = status.totalParts
  const lastPartSize = file.size - (totalParts - 1) * PART_SIZE

  /**
   * @description Returns the byte size of a given part, accounting for the
   * smaller final part.
   * @param partNumber - 1-based part index
   */
  const sizeOf = (partNumber: number): number =>
    partNumber === totalParts ? lastPartSize : PART_SIZE

  const resumedBytes = status.uploadedParts.reduce(
    (sum: number, p: UploadedPart) => sum + sizeOf(p.partNumber),
    0
  )
  onProgress?.(Math.round((resumedBytes / file.size) * 100))

  const uploadedParts: UploadedPart[] = status.uploadedParts.map(
    (p: UploadedPart) => ({ partNumber: p.partNumber, etag: p.etag })
  )

  const newParts = await uploadPartsWithConcurrency(
    status.remainingParts as PresignedPart[],
    file,
    (bytes) => {
      onProgress?.(Math.round(((resumedBytes + bytes) / file.size) * 100))
    }
  )

  uploadedParts.push(...newParts)

  await completeUpload(videoId, uploadedParts)

  return videoId
}

