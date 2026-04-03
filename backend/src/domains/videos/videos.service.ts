import prisma from "../../lib/prisma";
import type { Video } from "../../generated/prisma/client";
import { AppError } from "../../middleware/errors";
import type { CreateVideoInput, UpdateVideoInput } from "./videos.types";
import { generatePresignedGetUrl, generatePresignedUploadUrl } from "../../lib/s3.js";

/**
 * retrieves a paginated list of videos, ordered by most recent first
 *
 * @param options.limit - max number of videos to return (default: 20)
 * @param options.offset - number of videos to skip (default: 0)
 * 
 * @returns videos array and total count for pagination
 */
export async function listVideos({limit = 20, offset = 0}) {
  // creates efficient query for videos and total with one call
  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.video.count(),
  ]);
  return { videos, total, limit, offset };
};

/**
 * finds a single video by its uuid.
 *
 * @param id - uuid of the video
 * 
 * @returns the video object, or null if not found
 */
export async function getVideoById(id: string) {
  // findUnique returns null if not found, can handle in the controller
  const video = await prisma.video.findUnique({
    where: { id },
  });
  return video;
}

/**
 * generates a temporary presigned URL for streaming/downloading
 * a video file from S3.
 *
 * @param videoId - The video uuid
 * 
 * @returns Object with the presigned URL and expiration, or null if video not found
 */
export async function getVideoStreamUrl(
  videoId: string
): Promise<{ url: string; expiresIn: number } | null> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
  });

  if (!video) {
    return null;
  }

  if (video.status !== "READY") {
    throw AppError.conflict(`Video cannot be streamed — current status is ${video.status}`);
  }

  // Generate the S3 key from the video ID.
  // If you add a storage_key column later, use video.storageKey instead.
  const s3Key = `videos/${videoId}/original.mp4`;
  const expiresIn = 3600; // 1 hour

  const url = await generatePresignedGetUrl(s3Key, expiresIn);

  return { url, expiresIn };
}

// Extends the validated input with the authenticated user's id
interface CreateVideoParams extends CreateVideoInput {
  uploadedByUserId: string;
}

/**
 * creates a new video record with an initial status of UPLOADING
 *
 * @param data.patientId - uuid of the associated patient
 * @param data.uploadedByUserId - uuid of the user creating the video
 * @param data.durationSeconds - (optional) video length, defaults to null
 * @param data.takenAt - (optional) ISO 8601 string, converted to Date
 * 
 * @returns the newly created video
 * 
 * @throws Prisma error if patientId references a nonexistent patient
 */
export async function createVideo({ patientId, uploadedByUserId, durationSeconds, takenAt }: CreateVideoParams) {
  const video = await prisma.video.create({
    data: {
      patientId,
      uploadedByUserId,
      status: "UPLOADING",
      // if for some reason upload can't access duration/date, return null
      durationSeconds: durationSeconds ?? null,
      takenAt: takenAt ? new Date(takenAt) : null,
    },
  });
  return video;
}

/**
 * Creates a video record and generates a presigned URL for the client
 * to upload the file directly to S3.
 *
 * Flow:
 *  1. Client calls POST /api/videos/upload with metadata
 *  2. This function creates a video record (status: UPLOADING)
 *     and returns a presigned PUT URL
 *  3. Client uploads the file directly to S3 using that URL
 *  4. Once upload completes, client (or a processing pipeline)
 *     calls PUT /api/videos/:id to update status to PROCESSING/READY
 *
 * @param params.patientId - The patient this video belongs to
 * @param params.uploadedByUserId - The authenticated user uploading
 * @param params.contentType - MIME type of the file (e.g., "video/mp4")
 * @param params.takenAt - Optional timestamp of when video was recorded
 * 
 * @returns The created video record plus a presigned upload URL
 */
export async function createVideoWithUploadUrl({
  patientId,
  uploadedByUserId,
  contentType,
  takenAt,
}: {
  patientId: string;
  uploadedByUserId: string;
  contentType: string;
  takenAt?: string;
}): Promise<{ video: Video; uploadUrl: string; expiresIn: number }> {
  // Create the video record first so we have an ID for the S3 key
  const video = await prisma.video.create({
    data: {
      patientId,
      uploadedByUserId,
      status: "UPLOADING",
      takenAt: takenAt ? new Date(takenAt) : null,
    },
  });

  // S3 key uses the video ID so each file has a unique path
  const s3Key = `videos/${video.id}/original.mp4`;
  const expiresIn = 3600; // 1 hour to complete the upload

  const uploadUrl = await generatePresignedUploadUrl(s3Key, contentType, expiresIn);

  return { video, uploadUrl, expiresIn };
}

/**
 * updates an existing video's metadata or status
 *
 * @param id - uuid of the video to update
 * @param data - partial fields to update
 * 
 * @returns the updated video
 * 
 * @throws {P2025} if no video with that id exists
 */
export async function updateVideo(id: string, data: UpdateVideoInput) {
  // prisma will throw if video doesn't exist, can handle in the controller
  const video = await prisma.video.update({
    where: { id },
    data,
  });
  return video;
}

/**
 * permanently deletes a video by its uuid.
 *
 * @param id - uuid of the video to delete
 * 
 * @throws {P2025} if no video with that id exists
 */
export async function deleteVideo(id: string) {
  await prisma.video.delete({
    where: { id },
  });
}

// TODO: implement multi-parallel uploads
