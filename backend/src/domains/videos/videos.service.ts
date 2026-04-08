import prisma from "../../lib/prisma";
import type { Video } from "../../generated/prisma/client";
import { AppError } from "../../middleware/errors";
import type { CreateVideoInput, CompleteUploadInput, UpdateVideoInput, SearchVideosInput, VideoListItem } from "./videos.types";
import {
  generatePresignedGetUrl,
  generatePresignedPartUrls,
  initiateMultipartUpload,
  completeMultipartUpload,
  abortMultipartUpload,
  listUploadedParts,
  PART_SIZE,
} from "../../lib/s3.js";

/**
 * Shared Prisma include clause used by list and detail queries
 * to eagerly load caregiver metadata and uploader info in a single query.
 * Prisma translates this into JOINs / batched subqueries, not N+1.
 *
 * @param userId - The authenticated user's ID, used to scope caregiver metadata
 * @returns Prisma include object
 */
function videoInclude(userId: string) {
  return {
    caregiverMetadata: {
      where: { caregiverUserId: userId },
      select: { privateTitle: true, privateNotes: true },
    },
    uploadedBy: { select: { name: true } },
  } as const;
}

/**
 * Maps a Prisma video (with included relations) to the frontend-friendly
 * VideoListItem shape. Falls back to the s3Key filename when no caregiver
 * metadata exists yet.
 *
 * @param video - Prisma video record with caregiverMetadata and uploadedBy included
 * @returns A flattened VideoListItem
 */
function toVideoListItem(
  video: Video & {
    caregiverMetadata: { privateTitle: string; privateNotes: string | null }[];
    uploadedBy: { name: string };
  }
): VideoListItem {
  const meta = video.caregiverMetadata[0];
  const fileName = video.s3Key.includes("/")
    ? video.s3Key.split("/").pop()!
    : video.s3Key;

  return {
    id: video.id,
    title: meta?.privateTitle ?? fileName,
    description: meta?.privateNotes ?? "",
    durationSeconds: video.durationSeconds,
    status: video.status,
    fileSize: Number(video.fileSize),
    createdAt: video.createdAt.toISOString(),
    takenAt: video.takenAt?.toISOString() ?? null,
    uploadedBy: video.uploadedBy.name,
  };
}

/**
 * Retrieves a paginated list of uploaded videos, ordered by most recent first.
 * Joins caregiver metadata (title/notes) and uploader name via Prisma include
 * (resolved as batched subqueries — 3 SQL statements total, not N+1).
 *
 * @param options.userId - The authenticated user's ID for scoping metadata
 * @param options.limit - max number of videos to return (default: 20)
 * @param options.offset - number of videos to skip (default: 0)
 *
 * @returns videos array and total count for pagination
 */
export async function listVideos({
  userId,
  limit = 20,
  offset = 0,
}: {
  userId: string;
  limit?: number;
  offset?: number;
}) {
  const where = { status: "UPLOADED" as const };

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: videoInclude(userId),
    }),
    prisma.video.count({ where }),
  ]);

  return { videos: videos.map(toVideoListItem), total, limit, offset };
}

/**
 * Searches and filters uploaded videos with optional text search and date ranges.
 * Uses a single Prisma query with relation filters — Prisma translates the
 * caregiverMetadata `some` clause into an EXISTS subquery, avoiding N+1.
 * Total count uses the same WHERE clause in a parallel query (2 SQL statements).
 *
 * @param params - Search filters, pagination, and the authenticated user's ID
 * @returns Matching videos and total count
 */
export async function searchVideos(
  params: SearchVideosInput & { userId: string }
) {
  const { q, uploadedAfter, uploadedBefore, filmedAfter, filmedBefore, limit, offset, userId } = params;

  const where: any = { status: "UPLOADED" as const };

  if (uploadedAfter || uploadedBefore) {
    where.createdAt = {};
    if (uploadedAfter) where.createdAt.gte = new Date(uploadedAfter);
    if (uploadedBefore) where.createdAt.lte = new Date(uploadedBefore);
  }

  if (filmedAfter || filmedBefore) {
    where.takenAt = {};
    if (filmedAfter) where.takenAt.gte = new Date(filmedAfter);
    if (filmedBefore) where.takenAt.lte = new Date(filmedBefore);
  }

  if (q) {
    where.caregiverMetadata = {
      some: {
        OR: [
          { privateTitle: { contains: q, mode: "insensitive" } },
          { privateNotes: { contains: q, mode: "insensitive" } },
        ],
      },
    };
  }

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: videoInclude(userId),
    }),
    prisma.video.count({ where }),
  ]);

  return { videos: videos.map(toVideoListItem), total, limit, offset };
}

/**
 * Retrieves a single video by ID with caregiver metadata and uploader info.
 * Single Prisma query with included relations (no N+1).
 *
 * @param videoId - The video UUID
 * @param userId - The authenticated user's ID for scoping metadata
 *
 * @returns The video as a VideoListItem
 * @throws {AppError} 404 if no video with that id exists
 */
export async function getVideoDetail(videoId: string, userId: string): Promise<VideoListItem> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: videoInclude(userId),
  });

  if (!video) {
    throw AppError.notFound("Video not found");
  }

  return toVideoListItem(video);
}

/**
 * Generates a temporary presigned URL for streaming/downloading
 * a video file from S3.
 *
 * @param videoId - The video uuid
 *
 * @returns Object with the presigned URL and expiration
 * @throws {AppError} 404 if no video with that id exists
 * @throws {AppError} 409 if the video status is not UPLOADED
 */
export async function getVideoStreamUrl(
  videoId: string
): Promise<{ video: Video; url: string; expiresIn: number }> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
  });

  if (!video) {
    throw AppError.notFound("Video not found");
  }

  if (video.status !== "UPLOADED") {
    throw AppError.conflict(`Video cannot be streamed — current status is ${video.status}`);
  }

  const expiresIn = 3600;
  const url = await generatePresignedGetUrl(video.s3Key, expiresIn);

  return { video, url, expiresIn };
}

// Extends the validated input with the authenticated user's id
type CreateVideoParams = CreateVideoInput & {
  uploadedByUserId: string;
};

/**
 * Creates a video record and initiates an S3 multipart upload inside
 * a transaction. If S3 initiation fails, the video record is rolled back.
 *
 * The s3Key is initially set to the videoName, then updated to
 * {videoId}/{videoName} once the record is created.
 *
 * Flow:
 *  1. Client calls POST /domain/videos/upload with metadata + fileSize
 *  2. This function creates a video record (status: UPLOADING),
 *     initiates a multipart upload, and returns presigned part URLs
 *  3. Client uploads chunks in parallel directly to S3
 *  4. Client calls POST /domain/videos/:id/complete-upload with ETags
 *
 * @param params.patientId - The patient this video belongs to
 * @param params.uploadedByUserId - The authenticated user uploading
 * @param params.videoName - Original filename for reference
 * @param params.fileSize - Total file size in bytes
 * @param params.durationSeconds - Duration of the video in seconds
 * @param params.createdAt - When the video record was created
 * @param params.takenAt - Timestamp of when video was recorded
 * @param params.contentType - MIME type of the file
 *
 * @returns The created video, presigned part URLs, partSize, and expiration
 */
export async function initiateVideoUpload({

  uploadedByUserId,
  videoTitle,
  videoDescription,
  videoName,
  fileSize,
  durationSeconds,
  createdAt,
  takenAt,
  contentType,
}: CreateVideoParams): Promise<{
  video: Video;
  parts: { partNumber: number; url: string }[];
  partSize: number;
  totalParts: number;
  expiresIn: number;
}> {
  const totalParts = Math.ceil(fileSize / PART_SIZE);
  const expiresIn = 3600;

  // Transaction: create record → initiate S3 upload → update with s3 details
  // If any step fails the video record is rolled back
  const video = await prisma.$transaction(async (tx) => {
    const created = await tx.video.create({
      data: {
        uploadedByUserId,
        s3Key: videoName,
        status: "UPLOADING",
        fileSize,
        totalParts,
        durationSeconds: durationSeconds ?? null,
        createdAt: createdAt ? new Date(createdAt) : new Date(),
        takenAt: takenAt ? new Date(takenAt) : null,
      },
    });

    // Build the final s3Key using the generated uuid
    await tx.caregiverVideoMetadata.create({
      data: {
        videoId: created.id,
        caregiverUserId: uploadedByUserId,
        privateTitle: videoTitle,
        privateNotes: videoDescription,
      },
    });
    const s3Key = `${created.id}/${videoName}`;
    const s3UploadId = await initiateMultipartUpload(s3Key, contentType);

    return await tx.video.update({
      where: { id: created.id },
      data: { s3Key, s3UploadId },
    });
  });

  const allPartNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);
  const parts = await generatePresignedPartUrls(
    video.s3Key,
    video.s3UploadId!,
    allPartNumbers,
    expiresIn
  );

  return { video, parts, partSize: PART_SIZE, totalParts, expiresIn };
}

/**
 * Returns the current upload status for a video that is still uploading.
 * Lists which parts S3 has already received and generates fresh presigned
 * URLs for the remaining parts so the frontend can resume.
 *
 * The response includes bytesUploaded so the frontend can immediately
 * show accurate progress without re-scanning locally.
 *
 * @param videoId - The video uuid
 *
 * @returns Upload progress info with fresh URLs for remaining parts
 * @throws {AppError} 404 if no video with that id exists
 * @throws {AppError} 409 if the video is not in UPLOADING status
 */
export async function getUploadStatus(videoId: string): Promise<{
  video: Video;
  uploadedParts: { partNumber: number; etag: string; size: number }[];
  remainingParts: { partNumber: number; url: string }[];
  bytesUploaded: number;
  partSize: number;
  totalParts: number;
  expiresIn: number;
}> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
  });

  if (!video) {
    throw AppError.notFound("Video not found");
  }

  if (video.status !== "UPLOADING") {
    throw AppError.conflict(`Video is not uploading — current status is ${video.status}`);
  }

  if (!video.s3UploadId) {
    throw AppError.conflict("Video has no active multipart upload");
  }

  const expiresIn = 3600;

  const uploadedParts = await listUploadedParts(video.s3Key, video.s3UploadId);
  const uploadedSet = new Set(uploadedParts.map((p) => p.partNumber));
  const bytesUploaded = uploadedParts.reduce((sum, p) => sum + p.size, 0);

  const remainingPartNumbers = Array.from(
    { length: video.totalParts },
    (_, i) => i + 1
  ).filter((n) => !uploadedSet.has(n));

  const remainingParts = await generatePresignedPartUrls(
    video.s3Key,
    video.s3UploadId,
    remainingPartNumbers,
    expiresIn
  );

  return {
    video,
    uploadedParts,
    remainingParts,
    bytesUploaded,
    partSize: PART_SIZE,
    totalParts: video.totalParts,
    expiresIn,
  };
}

/**
 * Completes a multipart upload by telling S3 to assemble the parts,
 * then updates the video status to UPLOADED.
 *
 * @param videoId - The video uuid
 * @param data - The ETags for each uploaded part
 *
 * @returns The updated video record
 * @throws {AppError} 404 if no video with that id exists
 * @throws {AppError} 409 if the video is not in UPLOADING status
 */
export async function completeVideoUpload(
  videoId: string,
  data: CompleteUploadInput
): Promise<Video> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
  });

  if (!video) {
    throw AppError.notFound("Video not found");
  }

  if (video.status !== "UPLOADING") {
    throw AppError.conflict(`Video is not uploading — current status is ${video.status}`);
  }

  if (!video.s3UploadId) {
    throw AppError.conflict("Video has no active multipart upload");
  }

  await completeMultipartUpload(video.s3Key, video.s3UploadId, data.parts);

  return await prisma.video.update({
    where: { id: videoId },
    data: {
      status: "UPLOADED",
      s3UploadId: null,
    },
  });
}

/**
 * Returns all videos that a specific user still has in UPLOADING status,
 * along with each one's upload progress from S3.
 *
 * @param userId - The authenticated user's id
 *
 * @returns Array of incomplete uploads with progress info
 */
export async function listIncompleteUploads(userId: string) {
  const uploading = await prisma.video.findMany({
    where: { uploadedByUserId: userId, status: "UPLOADING" },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    uploading.map(async (video) => {
      const uploadedParts = video.s3UploadId
        ? await listUploadedParts(video.s3Key, video.s3UploadId)
        : [];

      const bytesUploaded = uploadedParts.reduce((sum, p) => sum + p.size, 0);
      const fileName = video.s3Key.includes("/")
        ? video.s3Key.split("/").pop()!
        : video.s3Key;

      return {
        videoId: video.id,
        fileName,
        fileSize: Number(video.fileSize),
        bytesUploaded,
        totalParts: video.totalParts,
        uploadedPartCount: uploadedParts.length,
        createdAt: video.createdAt,
      };
    })
  );
}

/**
 * Cancels an in-progress upload by aborting the S3 multipart upload
 * and deleting the video record.
 *
 * @param videoId - The video uuid
 *
 * @throws {AppError} 404 if no video with that id exists
 * @throws {AppError} 409 if the video is not in UPLOADING status
 */
export async function cancelVideoUpload(videoId: string): Promise<void> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
  });

  if (!video) {
    throw AppError.notFound("Video not found");
  }

  if (video.status !== "UPLOADING") {
    throw AppError.conflict(`Video is not uploading — current status is ${video.status}`);
  }

  if (video.s3UploadId) {
    await abortMultipartUpload(video.s3Key, video.s3UploadId);
  }

  await prisma.video.delete({ where: { id: videoId } });
}

/**
 * Updates an existing video's metadata or status.
 *
 * @param id - uuid of the video to update
 * @param data - partial fields to update
 *
 * @returns the updated video
 *
 * @throws {AppError} if no video with that id exists
 */
export async function updateVideo(id: string, data: UpdateVideoInput) {
  const video = await prisma.video.update({
    where: { id },
    data,
  });
  return video;
}

/**
 * Permanently deletes a video by its uuid.
 *
 * @param id - uuid of the video to delete
 *
 * @throws {AppError} if no video with that id exists
 */
export async function deleteVideo(id: string) {
  await prisma.video.delete({
    where: { id },
  });
}
