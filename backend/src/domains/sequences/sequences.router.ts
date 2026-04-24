import { Router } from "express";
import * as sequencesService from "./sequences.service.js";
import { requireSession, requirePermission, requirePermissionWithOwnership, denyCaregiver } from "../../middleware/auth.js";
import { sequences } from "../../lib/resolvers.js";
import { requireAuditActorContext } from "../../middleware/audit.js";
import {
  createSequenceSchema,
  addClipToSequenceSchema,
  reorderSequenceSchema,
  updateSequenceSchema,
  listSequencesQuerySchema,
} from "./sequences.types.js";

const router = Router();

router.use(requireSession);
router.use(denyCaregiver);

/**
 * @description GET /domain/sequences - list sequences for a video within a study.
 * Requires READ permission for the video's scope.
 */
router.get("/",
  requirePermission("READ", sequences.fromQuery),
  async (req, res) => {
    const { videoId, studyId } = listSequencesQuerySchema.parse(req.query);
    const result = await sequencesService.listSequencesByVideo(videoId, studyId);
    res.json({ sequences: result });
  }
);


/**
 * @description POST /domain/sequences - create a new stitched sequence.
 * Requires WRITE permission in the sequence's scope.
 */
router.post("/",
  requirePermission("WRITE", sequences.fromBody),
  async (req, res) => {
    const data = createSequenceSchema.parse(req.body);
    const sequence = await sequencesService.createSequence(
      data,
      req.authSession.user.id,
      requireAuditActorContext(req),
    );
    res.status(201).json(sequence);
  });
    

/**
 * @description POST /domain/sequences/:id - add a clip to a sequence.
 * WRITE: must own the sequence. ADMIN: can add to anyone's.
 */
router.post("/:id",
  requirePermissionWithOwnership("WRITE", {
    resolveContexts: sequences.fromParams,
    resolveOwnerId: sequences.resolveOwnerId,
  }),
  async (req, res) => {
    const data = addClipToSequenceSchema.parse(req.body);
    const item = await sequencesService.addClipToSequence(
      req.params.id as string,
      data,
      requireAuditActorContext(req),
    );
    res.status(201).json(item);
  });


/**
 * @description PATCH /domain/sequences/:id - update a sequence's title.
 * WRITE: can only update your own. ADMIN: can update anyone's.
 */
router.patch("/:id",
  requirePermissionWithOwnership("WRITE", {
    resolveContexts: sequences.fromParams,
    resolveOwnerId: sequences.resolveOwnerId,
  }),
  async (req, res) => {
    const data = updateSequenceSchema.parse(req.body);
    const sequence = await sequencesService.updateSequence(
      req.params.id as string,
      data,
      requireAuditActorContext(req),
    );
    res.json(sequence);
  }
);

/**
 * @description PUT /domain/sequences/:id - reorder clips within a sequence.
 * WRITE: must own the sequence. ADMIN: can reorder anyone's.
 */
router.put("/:id",
  requirePermissionWithOwnership("WRITE", {
    resolveContexts: sequences.fromParams,
    resolveOwnerId: sequences.resolveOwnerId,
  }),
  async (req, res) => {
    const data = reorderSequenceSchema.parse(req.body);
    const sequence = await sequencesService.reorderSequenceClips(
      req.params.id as string,
      data,
      requireAuditActorContext(req),
    );
    res.json(sequence);
  });

/**
 * @description DELETE /domain/sequences/:id/clip/:clipId - remove a clip from a sequence.
 * WRITE: must own the sequence. ADMIN: can remove from anyone's.
 */
router.delete("/:id/clip/:clipId",
  requirePermissionWithOwnership("WRITE", {
    resolveContexts: sequences.fromParams,
    resolveOwnerId: sequences.resolveOwnerId,
  }),
  async (req, res) => {
    await sequencesService.removeClipFromSequence(
      req.params.id as string,
      req.params.clipId as string,
      requireAuditActorContext(req),
    );
    res.status(204).send();
  }
);

/**
 * @description DELETE /domain/sequences/:id - permanently delete a sequence.
 * WRITE: can only delete your own. ADMIN: can delete anyone's.
 */
router.delete("/:id",
  requirePermissionWithOwnership("WRITE", {
    resolveContexts: sequences.fromParams,
    resolveOwnerId: sequences.resolveOwnerId,
  }),
  async (req, res) => {
    await sequencesService.deleteSequence(
      req.params.id as string,
      requireAuditActorContext(req),
    );
    res.status(204).send();
  }
);

export default router;
