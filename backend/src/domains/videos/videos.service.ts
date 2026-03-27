import prisma from "../../lib/prisma";
import type { Video } from "@prisma/client";
import type { CreateVideoInput, UpdateVideoInput } from "./videos.types.js";

// service layer for video business logic
interface PaginationParams {
  limit?: number;
  offset?: number;
}

interface PaginatedResult {
  videos: Video[];
  total: number;
  limit: number;
  offset: number;
}

// list videos with pagination
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

// get video by id
export async function getVideoById(id: string) {
  // findUnique returns null if not found, can handle in the controller
  const video = await prisma.video.findUnique({
    where: { id },
  });
  return video;
}

// create video
export async function createVideo({ patientId, uploadedByUserId, durationSeconds, createdAt, takenAt }: CreateVideoInput) {
  const video = await prisma.video.create({
    data: {
      patientId,
      uploadedByUserId,
      status: "UPLOADING",
      // if for some reason upload can't access duration/date, return null
      durationSeconds: durationSeconds ?? null,
      createdAt: createdAt ? new Date(createdAt) : null,
      takenAt: takenAt ? new Date(takenAt) : null,
    },
  });
  return video;
}

// update video status after upload
export async function updateVideo(id: string, data: UpdateVideoInput) {
  // primsa will throw if video doesn't exist, can handle in the controller
  const video = await prisma.video.update({
    where: { id },
    data,
  });
  return video;
}

// delete video
export async function deleteVideo(id: string) {
  await prisma.video.delete({
    where: { id },
  });
}

// multi-parallal uploads 