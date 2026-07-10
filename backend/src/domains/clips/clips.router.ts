import { Router } from "express";
import * as clipsService from "./clips.service.js";
import { requireSession, requirePermission, requirePermissionWithOwnership, denyCaregiver } from "../../middleware/auth.js";
import { clips } from "../../lib/resolvers.js";
import { createClipSchema, updateClipSchema, listClipsQuerySchema } from "./clips.types.js";
import { requireAuditActorContext } from "../../middleware/audit.js";

const router = Router();

router.use(requireSession);
router.use(denyCaregiver);

/**
 * @description GET /domain/clips - list clips for a source video within a study.
 * Requires READ permission for the video's scope.
 */
router.get("/",
  requirePermission("READ", clips.fromQuery),
  async (req, res) => {
    const { videoId, studyId } = listClipsQuerySchema.parse(req.query);
    const result = await clipsService.listClipsByVideo(videoId, studyId);
    res.json({ clips: result });
  }
);


/**
 * @description POST /domain/clips - create a video clip from a source video.
 * Requires WRITE permission in the clip's scope.
 */
router.post("/",
  requirePermission("WRITE", clips.fromBody),
  async (req, res) => {
    const data = createClipSchema.parse(req.body);
    const clip = await clipsService.createClip(data, req.authSession.user.id, requireAuditActorContext(req));
    res.status(201).json(clip);
  }
);

/**
 * @description PUT /domain/clips/:id - update a video clip's title or time range.
 * WRITE: can only update your own. ADMIN: can update anyone's.
 */
router.put("/:id",
  requirePermissionWithOwnership("WRITE", {
    resolveContexts: clips.fromParams,
    resolveOwnerId: clips.resolveOwnerId,
  }),
  async (req, res) => {
    const data = updateClipSchema.parse(req.body);
    const clip = await clipsService.updateClip(req.params.id as string, data, requireAuditActorContext(req));
    res.json(clip);
  }
);

/**
 * @description DELETE /domain/clips/:id - permanently delete a video clip.
 * WRITE: can only delete your own. ADMIN: can delete anyone's.
 */
router.delete("/:id",
  requirePermissionWithOwnership("WRITE", {
    resolveContexts: clips.fromParams,
    resolveOwnerId: clips.resolveOwnerId,
  }),
  async (req, res) => {
    await clipsService.deleteClip(req.params.id as string, requireAuditActorContext(req));
    res.status(204).send();
  }
);


export default router;
