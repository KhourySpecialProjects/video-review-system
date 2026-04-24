import prisma from "../../lib/prisma.js";
import { createDirectContextResolver, type ResourceContext } from "../../lib/auth.js";
import { AppError } from "../../middleware/errors.js";
import type { Request } from "express";

export const resolveAnnotationContexts = createDirectContextResolver("annotation");

/**
 * Resolves the permission context for an annotation POST by validating
 * the client-supplied studyId/siteId against the video's VideoStudy rows.
 * Rejects with 400 if the supplied scope is not associated with the video.
 */
export async function resolveAnnotationContextsFromBody(req: Request): Promise<ResourceContext[]> {
  const { videoId, studyId, siteId } = req.body;

  if (!videoId || !studyId || !siteId) {
    return [{ studyId: studyId ?? null, siteId: siteId ?? null, videoId: videoId ?? null }];
  }

  const videoStudy = await prisma.videoStudy.findFirst({
    where: { videoId, studyId, siteId },
    select: { studyId: true, siteId: true, videoId: true },
  });

  if (!videoStudy) {
    throw AppError.badRequest(
      "The provided studyId/siteId combination is not associated with the given video."
    );
  }

  return [{ studyId: videoStudy.studyId, siteId: videoStudy.siteId, videoId: videoStudy.videoId }];
}

/**
 * Resolves the author ID of an annotation for ownership checks.
 */
export async function resolveAnnotationOwnerId(req: Request): Promise<string | null> {
  const annotation = await prisma.annotation.findUnique({
    where: { id: req.params.id as string },
    select: { authorUserId: true },
  });
  return annotation?.authorUserId ?? null;
}
