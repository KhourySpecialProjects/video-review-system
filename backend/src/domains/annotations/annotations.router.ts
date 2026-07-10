import { Router } from "express";
import * as annotationsService from "./annotations.service.js";
import { Prisma } from "../../generated/prisma/client.js";
import { createAnnotationSchema, updateAnnotationSchema } from "./annotations.types.js";
import { requireSession, requirePermission, requirePermissionWithOwnership, denyCaregiver } from "../../middleware/auth.js";
import { annotations, resolveAnnotationContextsFromBody } from "../../lib/resolvers.js";
import { requireAuditActorContext } from "../../middleware/audit.js";


const router = Router();

router.use(requireSession);
router.use(denyCaregiver);

/**
 * @description GET /domain/annotations - lists annotations for a specific video.
 * Requires READ permission for the video's scope.
 */
router.get("/",
  requirePermission("READ", annotations.fromQuery),
  async (req, res) => {
    const parsedLimit = Number.parseInt(String(req.query.limit), 10);
    const parsedOffset = Number.parseInt(String(req.query.offset), 10);

    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
    const offset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

    const result = await annotationsService.listAnnotationsByVideo(
      req.query.videoId as string,
      { limit, offset }
    );
    res.json(result);
  }
);

/**
 * @description GET /domain/annotations/:id - retrieves a single annotation.
 */
router.get("/:id",
  requirePermission("READ", annotations.fromParams),
  async (req, res) => {
    const annotation = await annotationsService.getAnnotationById(req.params.id as string);
    res.json(annotation);
  }
);

/**
 * @description POST /domain/annotations - creates a new annotation on a video.
 * Requires WRITE permission in the annotation's scope.
 */
router.post("/",
  requirePermission("WRITE", resolveAnnotationContextsFromBody),
  async (req, res) => {
    const data = createAnnotationSchema.parse(req.body);

    const annotation = await annotationsService.createAnnotation({
      videoId: data.videoId,
      authorUserId: req.authSession.user.id,
      studyId: data.studyId,
      siteId: data.siteId,
      type: data.type,
      timestampSeconds: data.timestampSeconds,
      durationSeconds: data.durationSeconds,
      payload: data.payload as Prisma.InputJsonValue,
    }, requireAuditActorContext(req));

    res.status(201).json(annotation);
  }
);

/**
 * @description PUT /domain/annotations/:id - updates an existing annotation.
 * WRITE: can only update your own. ADMIN: can update anyone's.
 */
router.put("/:id",
  requirePermissionWithOwnership("WRITE", {
    resolveContexts: annotations.fromParams,
    resolveOwnerId: annotations.resolveOwnerId,
  }),
  async (req, res) => {
    const data = updateAnnotationSchema.parse(req.body);
    const annotation = await annotationsService.updateAnnotation(
      req.params.id as string,
      data,
      requireAuditActorContext(req),
    );
    res.json(annotation);
  }
);

/**
 * @description DELETE /domain/annotations/:id - permanently deletes an annotation.
 * WRITE: can only delete your own. ADMIN: can delete anyone's.
 */
router.delete("/:id",
  requirePermissionWithOwnership("WRITE", {
    resolveContexts: annotations.fromParams,
    resolveOwnerId: annotations.resolveOwnerId,
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
