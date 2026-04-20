import { Prisma } from "../../generated/prisma/index.js";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/errors.js";
import type { CreateAnnotationParams, UpdateAnnotationInput } from "./annotations.types.js";

/**
 * retrieves a paginated list of annotations for a video, ordered by timestamp
 *
 * @param videoId - uuid of the video to get annotations for
 * @param options.limit - max number of annotations to return (default: 20)
 * @param options.offset - number of annotations to skip (default: 0)
 * 
 * @returns annotations array and total count for pagination
 */
export async function listAnnotationsByVideo(videoId: string, {limit = 20, offset = 0}) {
  // creates efficient query for annotations and total with one call
  const [annotations, total] = await Promise.all([
    prisma.annotation.findMany({
      where: { videoId },
      orderBy: { timestampS: "asc" },
      skip: offset,
      take: limit,
      include: { author: { select: { name: true } } },
    }),
    prisma.annotation.count({
       where: { videoId }
    }),
  ]);
  return { annotations, total, limit, offset };
};

/**
 * finds a single annotation by its uuid
 *
 * @param id - uuid of the annotation
 * 
 * @returns the annotation object, or null if not found
 */
export async function getAnnotationById(id: string) {
  // findUnique returns null if not found, can handle in the controller
  const annotation = await prisma.annotation.findUnique({
    where: { id },
    include: { author: { select: { name: true } } },
  });
  return annotation;
}

/**
 * creates a new annotation on a video - verifies the video exists before creating.
 *
 * @param data.videoId - uuid of the video to annotate
 * @param data.authorUserId - uuid of the user creating the annotation
 * @param data.studyId - uuid of the associated study
 * @param data.siteId - uuid of the associated site
 * @param data.type - annotation type (text_comment, drawing_box, drawing_circle, freehand_drawing, or tag)
 * @param data.timestampSeconds - position in the video in seconds
 * @param data.durationSeconds - how long the annotation spans
 * @param data.payload - (optional) type-specific JSON data
 * 
 * @returns the newly created annotation
 * 
 * @throws Error if the referenced video does not exist
 */
export async function createAnnotation({   
  videoId, 
  authorUserId,
  studyId,
  siteId,
  type,
  timestampSeconds,
  durationSeconds,
  payload, }: CreateAnnotationParams) {

    // verify the video exists before creating an annotation
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw AppError.notFound("Video not found");
    }
  
  const annotation = await prisma.annotation.create({
    data: {
      videoId,
      authorUserId,
      studyId,
      siteId,
      type,
      timestampS: timestampSeconds,
      durationS: durationSeconds,
      payload: payload as Prisma.InputJsonValue,
    },
    include: { author: { select: { name: true } } },
  });
  return annotation;
}

/**
 * updates an existing annotation's timestamp, duration, or payload
 *
 * @param id - uuid of the annotation to update
 * @param data - partial fields to update
 * 
 * @returns the updated annotation
 * 
 * @throws {P2025} if no annotation with that id exists
 */
export async function updateAnnotation(id: string, data: UpdateAnnotationInput) {
  // prisma will throw if annotation doesn't exist, can handle in the controller
  const annotation = await prisma.annotation.update({
    where: { id },
    data: {
      ...(data.timestampSeconds !== undefined && { timestampS: data.timestampSeconds }),
      ...(data.durationSeconds !== undefined && { durationS: data.durationSeconds }),
      ...(data.payload !== undefined && { payload: data.payload as Prisma.InputJsonValue }),
    },
    include: { author: { select: { name: true } } },
  });
  return annotation;
}

/**
 * permanently deletes an annotation by its uuid
 *
 * @param id - uuid of the annotation to delete
 * 
 * @throws {P2025} if no annotation with that id exists
 */
export async function deleteAnnotation(id: string) {
  await prisma.annotation.delete({
    where: { id },
  });
}

