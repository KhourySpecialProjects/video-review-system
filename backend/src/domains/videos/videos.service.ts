import prisma from "../../lib/prisma";
import type { Video } from "../../generated/prisma/client";
import { AppError } from "../../middleware/errors";
import type { CreateVideoInput, CompleteUploadInput, UpdateVideoInput } from "./videos.types";
import {
  generatePresignedGetUrl,
  generatePresignedPartUrls,
  initiateMultipartUpload,
  completeMultipartUpload,
  listUploadedParts,
  PART_SIZE,
} from "../../lib/s3.js";

/**
 * Retrieves a paginated list of videos, ordered by most recent first.
 *
 * @param options.limit - max number of videos to return (default: 20)
 * @param options.offset - number of videos to skip (default: 0)
 *
 * @returns videos array and total count for pagination
 */
export async function listVideos({ limit = 20, offset = 0 }) {
  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.video.count(),
  ]);
  return { videos, total, limit, offset };
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
  patientId,
  uploadedByUserId,
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
        patientId,
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
