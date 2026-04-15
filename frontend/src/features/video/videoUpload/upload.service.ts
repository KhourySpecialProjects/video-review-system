import { apiFetch } from "@/lib/api"

const PART_SIZE = 10 * 1024 * 1024 // 10 MB — must match backend

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

/**
 * Extracts duration and last-modified date from a video Blob using
 * a temporary `<video>` element.
 *
 * @param file - The video Blob (or File) to inspect
 * @returns The duration in seconds and the takenAt ISO string
 */
export function extractVideoMetadata(
  file: Blob | File
): Promise<{ durationSeconds: number; takenAt: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    video.preload = "metadata"

    const url = URL.createObjectURL(file)
    video.src = url

    video.onloadedmetadata = () => {
      const durationSeconds = Math.round(video.duration)
      // Use File.lastModified when available (date the file was last written
      // on the device, which on mobile is typically when the video was recorded).
      // Falls back to "now" for plain Blobs.
      const takenAt =
        file instanceof File
          ? new Date(file.lastModified).toISOString()
          : new Date().toISOString()

      URL.revokeObjectURL(url)
      resolve({ durationSeconds, takenAt })
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Could not read video metadata"))
    }
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
 * Uploads a single part to S3 using a presigned URL.
 *
 * @param url - Presigned PUT URL for the part
 * @param body - The chunk of the file to upload
 * @returns The ETag header returned by S3
 */
async function uploadPart(url: string, body: Blob): Promise<string> {
  const res = await fetch(url, {
    method: "PUT",
    body,
  })

  if (!res.ok) {
    throw new Error(`S3 part upload failed (${res.status})`)
  }

  const etag = res.headers.get("ETag")
  if (!etag) throw new Error("S3 did not return an ETag")
  return etag
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
  },
  onProgress?: (percent: number) => void
): Promise<string> {
  const { video, parts } = await initiateUpload({
    ...metadata,
    fileSize: file.size,
    contentType: "video/mp4",
  })

  // Upload all parts in parallel, tracking progress per-part
  const partProgress = new Array(parts.length).fill(0)
  const uploadedParts: UploadedPart[] = await Promise.all(
    parts.map(async ({ partNumber, url }) => {
      const start = (partNumber - 1) * PART_SIZE
      const end = Math.min(start + PART_SIZE, file.size)
      const chunk = file.slice(start, end)

      const etag = await uploadPart(url, chunk)

      partProgress[partNumber - 1] = 1
      const totalDone = partProgress.reduce((sum, v) => sum + v, 0)
      onProgress?.(Math.round((totalDone / parts.length) * 100))

      return { partNumber, etag }
    })
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

  const alreadyDone = status.uploadedParts.length
  const totalParts = status.totalParts

  const partProgress = new Array(totalParts).fill(0)
  // Mark already-uploaded parts as done
  for (let i = 0; i < alreadyDone; i++) {
    partProgress[status.uploadedParts[i].partNumber - 1] = 1
  }
  onProgress?.(Math.round((alreadyDone / totalParts) * 100))

  const uploadedParts: { partNumber: number; etag: string }[] = [
    ...status.uploadedParts.map((p: { partNumber: number; etag: string }) => ({
      partNumber: p.partNumber,
      etag: p.etag,
    })),
  ]

  // Upload remaining parts in parallel
  const newParts = await Promise.all(
    status.remainingParts.map(async ({ partNumber, url }: { partNumber: number; url: string }) => {
      const start = (partNumber - 1) * PART_SIZE
      const end = Math.min(start + PART_SIZE, file.size)
      const chunk = file.slice(start, end)

      const etag = await uploadPart(url, chunk)

      partProgress[partNumber - 1] = 1
      const totalDone = partProgress.reduce((sum: number, v: number) => sum + v, 0)
      onProgress?.(Math.round((totalDone / totalParts) * 100))

      return { partNumber, etag }
    })
  )

  uploadedParts.push(...newParts)

  await completeUpload(videoId, uploadedParts)

  return videoId
}

