import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/errors.js";
import type {
  CreateClipInput,
  UpdateClipInput,
} from "./clips.types.js";

// ────────────────────────────────────────────────────────────
// CLIPS
// ────────────────────────────────────────────────────────────

/**
 * Creates a new video clip from a source video.
 * Validates that the source video exists before creating.
 *
 * @param input - clip fields from the validated request body
 * @param createdByUserId - the authenticated user's ID (set server-side)
 *
 * @returns the created video clip record
 *
 * @throws {AppError} 404 if the source video does not exist
 */
export async function createClip(input: CreateClipInput, createdByUserId: string) {
  const video = await prisma.video.findUnique({
    where: { id: input.sourceVideoId },
  });

  if (!video) {
    throw AppError.notFound("Source video not found");
  }

  if (input.endTimeS > video.durationSeconds) {
    throw AppError.badRequest("End time exceeds video duration");
  }
  if (input.startTimeS >= video.durationSeconds) {
    throw AppError.badRequest("Start time exceeds video duration");
  }

  const clip = await prisma.videoClip.create({
    data: {
      sourceVideoId: input.sourceVideoId,
      createdByUserId,
      studyId: input.studyId,
      siteId: input.siteId,
      title: input.title,
      startTimeS: input.startTimeS,
      endTimeS: input.endTimeS,
    },
    include: { createdBy: { select: { name: true } } },
  });

  return clip;
}

/**
 * Lists all clips for a given source video within a study.
 *
 * @param videoId - uuid of the source video
 * @param studyId - uuid of the study to scope clips to
 * @returns array of clip records ordered by startTimeS ascending
 */
export async function listClipsByVideo(videoId: string, studyId: string) {
  return prisma.videoClip.findMany({
    where: { sourceVideoId: videoId, studyId },
    orderBy: { startTimeS: "asc" },
    include: { createdBy: { select: { name: true } } },
  });
}

/**
 * Retrieves a single video clip by its ID.
 *
 * @param clipId - uuid of the clip
 *
 * @returns the video clip record
 *
 * @throws {AppError} 404 if no clip with that id exists
 */
export async function getClip(clipId: string) {
  const clip = await prisma.videoClip.findUnique({
    where: { id: clipId },
    include: { createdBy: { select: { name: true } } },
  });

  if (!clip) {
    throw AppError.notFound("Clip not found");
  }

  return clip;
}

/**
 * Updates an existing video clip's title or time range.
 *
 * @param clipId - uuid of the clip to update
 * @param input - fields to update (title, startTimeS, endTimeS)
 * @returns the updated clip record
 * @throws {AppError} 404 if no clip with that id exists
 */
export async function updateClip(clipId: string, input: UpdateClipInput) {
  const clip = await prisma.videoClip.findUnique({ where: { id: clipId } });
  if (!clip) throw AppError.notFound("Clip not found");

  return prisma.videoClip.update({
    where: { id: clipId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.startTimeS !== undefined && { startTimeS: input.startTimeS }),
      ...(input.endTimeS !== undefined && { endTimeS: input.endTimeS }),
    },
    include: { createdBy: { select: { name: true } } },
  });
}

/**
 * Permanently deletes a video clip by its ID.
 * Also removes any sequence_items that reference this clip.
 *
 * @param clipId - uuid of the clip to delete
 *
 * @throws {AppError} 404 if no clip with that id exists (Prisma P2025)
 */
export async function deleteClip(clipId: string) {
  const clip = await prisma.videoClip.findUnique({
    where: { id: clipId },
  });

  await prisma.videoClip.delete({
    where: { id: clipId },
  });
}