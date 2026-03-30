import prisma from "../../lib/prisma";
//import type { Video } from "@prisma/client";
import type { CreateVideoInput, UpdateVideoInput } from "./videos.types";

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
 * Finds a single video by its uuid.
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

// Extends the validated input with the authenticated user's id
interface CreateVideoParams extends CreateVideoInput {
  uploadedByUserId: string;
}


/**
 * creates a new video record with an initial status of UPLOADING
 *
 * @param data.patientId - UUID of the associated patient
 * @param data.uploadedByUserId - UUID of the user creating the video
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
  // primsa will throw if video doesn't exist, can handle in the controller
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

// multi-parallal uploads 