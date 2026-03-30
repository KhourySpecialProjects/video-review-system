import { Prisma } from "../../generated/prisma/index.js";
import prisma from "../../lib/prisma.js";
//import type { Annotation } from "../../generated/prisma/client";
import type { CreateAnnotationInput, CreateAnnotationParams, UpdateAnnotationInput } from "./annotations.types";
import { timeStamp } from "console";

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
      orderBy: { timestampMs: "asc" },
      skip: offset,
      take: limit,
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
  });
  return annotation;
}

/**
 * creates a new annotation on a video - verifies the video exists before creating.
 *
 * @param data.videoId - uuid of the video to annotate
 * @param data.authorUserId - uuid of the user creating the annotation
 * @param data.type - annotation type (text_comment, drawing_box, freehand_drawing)
 * @param data.timestampMs - position in the video in milliseconds
 * @param data.durationMs - (optional) how long the annotation spans
 * @param data.payload - (optional) type-specific JSON data
 * 
 * @returns the newly created annotation
 * 
 * @throws Error if the referenced video does not exist
 */
export async function createAnnotation({   
  videoId, 
  authorUserId,
  type,
  timestampMs,
  durationMs,
  payload, }: CreateAnnotationParams) {

    // verify the video exists before creating an annotation
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new Error("Video not found");
    }
  
  const annotation = await prisma.annotation.create({
    data: {
      videoId,
      authorUserId,
      type,
      timestampMs,
      durationMs,
      payload: payload as Prisma.JsonValue ?? undefined, // cast to Prisma.JsonValue for storage
    },
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
  // primsa will throw if video doesn't exist, can handle in the controller
  const annotation  = await prisma.annotation .update({
    where: { id },
      data: {
      ...data,
      payload: data.payload as Prisma.JsonValue ?? undefined,
    },
  });
  return annotation ;
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

