import { Router } from "express";
import * as clipsService from "./clips.service.js";
import { AppError } from "../../middleware/errors.js";
import { requireSession } from "../../middleware/auth.js";
import { createClipSchema } from "./clips.types.js";

const router = Router();

// All clip routes require session authentication
router.use(requireSession);

/**
 * POST /domain/clips - create a video clip from a source video
 *
 * The clip defines a time range (startTimeS to endTimeS) within the source video.
 * The authenticated user is recorded as the clip creator.
 *
 * @body sourceVideoId - uuid of the source video
 * @body studyId - uuid of the study this clip belongs to
 * @body siteId - uuid of the site this clip belongs to
 * @body title - descriptive name for the clip
 * @body startTimeS - start time in seconds within the source video
 * @body endTimeS - end time in seconds within the source video
 *
 * @returns 201 with the created clip
 * @returns 400 if validation fails or end time exceeds video duration
 * @returns 404 if source video not found
 */
router.post("/", async (req, res) => {
  const parsed = createClipSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest(parsed.error.issues[0].message);
  }

  const clip = await clipsService.createClip(parsed.data, req.authSession.user.id);
  res.status(201).json(clip);
});

/**
 * DELETE /domain/clips/:id - permanently delete a video clip
 *
 * Also removes any sequence items that reference this clip.
 *
 * @param id - uuid of the clip to delete
 *
 * @returns 204 No Content on success
 * @returns 404 if no clip with that id exists
 */
router.delete("/:id", async (req, res) => {
  await clipsService.deleteClip(req.params.id);
  res.status(204).send();
});

export default router;