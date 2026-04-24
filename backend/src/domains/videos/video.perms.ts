// backend/src/domains/videos/videos.perms.ts

import prisma from "../../lib/prisma.js";
import type { ResourceContext } from "../../lib/auth.js";
import type { Request } from "express";

/**
 * Resolves resource contexts for a video by fetching its VideoStudy rows.
 *
 * A video can belong to multiple studies via the junction table, so this
 * returns one ResourceContext per VideoStudy row. If the video has no
 * VideoStudy links yet (e.g. just uploaded), returns a single context
 * with only the videoId set.
 */
export async function resolveVideoContexts(req: Request): Promise<ResourceContext[]> {
  const videoId = req.params.id;

  const videoStudies = await prisma.videoStudy.findMany({
    where: { videoId: videoId as string },
    select: { studyId: true, siteId: true },
  });

  if (videoStudies.length === 0) {
    return [];
  }

  return videoStudies.map((vs) => ({
    studyId: vs.studyId,
    siteId: vs.siteId,
    videoId: videoId as string,
  }));
}

/**
 * Caregiver ownership check: returns true if the authenticated user
 * is the one who uploaded the video.
 */
export async function checkCaregiverVideoOwnership(req: Request): Promise<boolean> {
  const video = await prisma.video.findUnique({
    where: { id: req.params.id as string },
    select: { uploadedByUserId: true },
  });

  return video?.uploadedByUserId === req.authSession.user.id;
}