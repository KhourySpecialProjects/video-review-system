import prisma from "./prisma.js";
import { AppError } from "../middleware/errors.js";
import type { ResourceContext } from "./auth.js";
import type { Request } from "express";

type ContextResolver =
  | ((req: Request) => Promise<ResourceContext[]>)
  | ((req: Request) => ResourceContext[]);

type OwnershipResolver = (req: Request) => Promise<string | null>;

/**
 * @description Bundles all permission resolution strategies for a Prisma model
 * that has `studyId`, `siteId`, and `videoId` columns directly on it.
 */
class ResourceResolver {
  constructor(
    private model: "annotation" | "videoClip" | "stitchedSequence",
    private ownerField: string = "createdByUserId",
  ) {}

  /**
   * @description Resolves context by looking up the resource by `req.params.id`.
   * Used for GET/PUT/DELETE /:id routes.
   */
  fromParams: ContextResolver = async (req) => {
    const record = await (prisma[this.model] as any).findUniqueOrThrow({
      where: { id: req.params.id },
      select: { studyId: true, siteId: true, videoId: true },
    });
    return [{ studyId: record.studyId, siteId: record.siteId, videoId: record.videoId }];
  };

  /**
   * @description Resolves context from `req.body`. Used for POST routes.
   */
  fromBody: ContextResolver = (req) => [{
    studyId: req.body.studyId ?? null,
    siteId: req.body.siteId ?? null,
    videoId: req.body.videoId ?? null,
  }];

  /**
   * @description Resolves context from `req.query`. Used for GET list routes
   * that list a resource by `videoId`. Authorization is derived from the
   * video's own `VideoStudy` links (studyId/siteId) rather than trusting
   * client-supplied `studyId`/`siteId` params, so study- and site-scoped
   * grants match. Mirrors `videos.fromParams`. Returns `[]` when no videoId
   * is supplied or the video has no study links (→ 403 via checkPermission).
   */
  fromQuery: ContextResolver = async (req) => {
    const videoId = (req.query.videoId as string) ?? null;
    if (!videoId) return [];

    const videoStudies = await prisma.videoStudy.findMany({
      where: { videoId },
      select: { studyId: true, siteId: true },
    });

    return videoStudies.map((vs) => ({
      studyId: vs.studyId,
      siteId: vs.siteId,
      videoId,
    }));
  };

  /**
   * @description Resolves the owner's user ID by looking up the resource by `req.params.id`.
   */
  resolveOwnerId: OwnershipResolver = async (req) => {
    const record = await (prisma[this.model] as any).findUnique({
      where: { id: req.params.id },
      select: { [this.ownerField]: true },
    });
    return record?.[this.ownerField] ?? null;
  };
}

export const annotations = new ResourceResolver("annotation", "authorUserId");
export const clips = new ResourceResolver("videoClip");
export const sequences = new ResourceResolver("stitchedSequence");

/**
 * @description Video resolver — custom because videos link to studies/sites
 * through the VideoStudy junction table, not directly on the model.
 */
export const videos = {
  fromParams: async (req: Request): Promise<ResourceContext[]> => {
    const videoId = req.params.id as string;

    const videoStudies = await prisma.videoStudy.findMany({
      where: { videoId },
      select: { studyId: true, siteId: true },
    });

    if (videoStudies.length === 0) return [];

    return videoStudies.map((vs) => ({
      studyId: vs.studyId,
      siteId: vs.siteId,
      videoId,
    }));
  },

  resolveOwnerId: async (req: Request): Promise<string | null> => {
    const record = await prisma.video.findUnique({
      where: { id: req.params.id as string },
      select: { uploadedByUserId: true },
    });
    return record?.uploadedByUserId ?? null;
  },
};

/**
 * @description Custom body resolver for annotation POST. Validates the
 * client-supplied studyId/siteId against the video's VideoStudy rows.
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
