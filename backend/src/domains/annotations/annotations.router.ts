import { Router } from "express";
import * as annotationsService from "./annotations.service.js";
import { AppError } from "../../middleware/errors.js";
import { Prisma } from "../../generated/prisma/client.js";
import { createAnnotationSchema, updateAnnotationSchema } from "./annotations.types.js";
import { requireSession } from "../../middleware/auth.js";
import { requirePermission, requirePermissionWithOwnership } from "../../middleware/auth.js";
import { requireAuditActorContext } from "../../middleware/audit.js";
import { buildDirectAccessFilter } from "../../lib/auth.js";
import {
  resolveAnnotationContexts,
  resolveAnnotationContextsFromBody,
  resolveAnnotationOwnerId,
} from "./annotations.perms.js";
import type { user_role } from "../../generated/prisma/client.js";

const router = Router();

// All annotation routes require authentication
router.use(requireSession);

/**
 * GET /domain/annotations - lists annotations for a specific video with pagination.
 *
 * Access filtered by the user's permission grants.
 * Caregivers cannot access annotations.
 */
router.get("/", async (req, res) => {
  const parsedLimit = Number.parseInt(String(req.query.limit), 10);
  const parsedOffset = Number.parseInt(String(req.query.offset), 10);

  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
  const offset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  const { id: userId, role } = req.authSession.user;
  const accessFilter = await buildDirectAccessFilter(userId, role as user_role, "READ");
  
  const videoId = req.query.videoId;
  if (typeof videoId !== "string" || videoId.length === 0) {
    throw AppError.badRequest("videoId query parameter is required");
  }

  const result = await annotationsService.listAnnotationsByVideo(
    videoId,
    { limit, offset, accessFilter }
  );
  res.json(result);
});

/**
 * GET /domain/annotations/:id - retrieves a single annotation by its uuid.
 */
router.get("/:id",
  requirePermission("READ", resolveAnnotationContexts),
  async (req, res) => {
    const annotation = await annotationsService.getAnnotationById(req.params.id as string);
    if (!annotation) throw AppError.notFound("Annotation not found");
    res.json(annotation);
  }
);

/**
 * POST /domain/annotations - creates a new annotation on a video.
 *
 * Requires WRITE permission in the annotation's scope.
 * Uses the authenticated user's ID as the author.
 */
router.post("/",
  requirePermission("WRITE", resolveAnnotationContextsFromBody),
  async (req, res) => {
    const parsed = createAnnotationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest(parsed.error.issues[0].message);
    }

    const annotation = await annotationsService.createAnnotation({
      videoId: parsed.data.videoId,
      authorUserId: req.authSession.user.id,
      studyId: parsed.data.studyId,
      siteId: parsed.data.siteId,
      type: parsed.data.type,
      timestampSeconds: parsed.data.timestampSeconds,
      durationSeconds: parsed.data.durationSeconds,
      payload: parsed.data.payload as Prisma.InputJsonValue,
    }, requireAuditActorContext(req));

    res.status(201).json(annotation);
  }
);

/**
 * PUT /domain/annotations/:id - updates an existing annotation.
 *
 * WRITE: can only update your own annotations.
 * ADMIN: can update anyone's annotations.
 */
router.put("/:id",
  requirePermissionWithOwnership("WRITE", {
    resolveContexts: resolveAnnotationContexts,
    resolveOwnerId: resolveAnnotationOwnerId,
  }),
  async (req, res) => {
    const parsed = updateAnnotationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest(parsed.error.issues[0].message);
    }

    const annotation = await annotationsService.updateAnnotation(
      req.params.id as string,
      parsed.data,
      requireAuditActorContext(req),
    );
    res.json(annotation);
  }
);

/**
 * DELETE /domain/annotations/:id - permanently deletes an annotation.
 *
 * WRITE: can only delete your own annotations.
 * ADMIN: can delete anyone's annotations.
 */
router.delete("/:id",
  requirePermissionWithOwnership("WRITE", {
    resolveContexts: resolveAnnotationContexts,
    resolveOwnerId: resolveAnnotationOwnerId,
  }),
  async (req, res) => {
    await annotationsService.deleteAnnotation(
      req.params.id as string,
      requireAuditActorContext(req),
    );
    res.status(204).send();
  }
);

export default router;
