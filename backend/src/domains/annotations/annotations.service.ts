import { Prisma } from "../../generated/prisma/index.js";
import prisma from "../../lib/prisma.js";
//import type { Annotation } from "../../generated/prisma/client";
import type { CreateAnnotationInput, CreateAnnotationParams, UpdateAnnotationInput } from "./annotations.types";
import { timeStamp } from "console";

// list annotations for a specific video with pagination
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

// get annotation by id
export async function getAnnotationById(id: string) {
  // findUnique returns null if not found, can handle in the controller
  const annotation = await prisma.annotation.findUnique({
    where: { id },
  });
  return annotation;
}

// create annotation for a video
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

// update annotation status after upload
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

// delete annotation
export async function deleteAnnotation(id: string) {
  await prisma.annotation.delete({
    where: { id },
  });
}

