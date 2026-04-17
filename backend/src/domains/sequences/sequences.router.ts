import { Router } from "express";
import * as sequencesService from "./sequences.service.js";
import { AppError } from "../../middleware/errors.js";
import { requireSession } from "../../middleware/auth.js";
import {
  createSequenceSchema,
  addClipToSequenceSchema,
  reorderSequenceSchema,
} from "./sequences.types.js";

const router = Router();

// All sequence routes require session authentication
router.use(requireSession);

/**
 * POST /domain/sequences - create a new stitched sequence
 *
 * A sequence is an ordered collection of clips from a source video.
 * The authenticated user is recorded as the sequence creator.
 *
 * @body studyId - uuid of the study this sequence belongs to
 * @body siteId - uuid of the site this sequence belongs to
 * @body videoId - uuid of the source video this sequence is based on
 * @body title - descriptive name for the sequence
 *
 * @returns 201 with the created sequence
 * @returns 400 if validation fails
 * @returns 404 if source video not found
 */
router.post("/", async (req, res) => {
  const parsed = createSequenceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest(parsed.error.issues[0].message);
  }

  const sequence = await sequencesService.createSequence(parsed.data, req.authSession.user.id);
  res.status(201).json(sequence);
});

/**
 * POST /domain/sequences/:id - add a clip to a sequence
 *
 * Each clip is assigned a play order position within the sequence.
 * A clip can only appear once per sequence.
 *
 * @param id - uuid of the sequence
 * @body clipId - uuid of the video clip to add
 * @body playOrder - position of this clip in the sequence (1-based)
 *
 * @returns 201 with the created sequence item
 * @returns 400 if validation fails
 * @returns 404 if sequence or clip not found
 * @returns 409 if clip is already in this sequence
 */
router.post("/:id", async (req, res) => {
  const parsed = addClipToSequenceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest(parsed.error.issues[0].message);
  }

  const item = await sequencesService.addClipToSequence(req.params.id, parsed.data);
  res.status(201).json(item);
});

/**
 * PUT /domain/sequences/:id - reorder clips within a sequence
 *
 * Replaces all clip positions with the new ordering.
 * Send the full list of clips with their new play order values.
 *
 * @param id - uuid of the sequence
 * @body items - array of { clipId, playOrder } defining the new order
 *
 * @returns 200 with the updated sequence including reordered items
 * @returns 400 if validation fails
 * @returns 404 if sequence not found
 */
router.put("/:id", async (req, res) => {
  const parsed = reorderSequenceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest(parsed.error.issues[0].message);
  }

  const sequence = await sequencesService.reorderSequenceClips(req.params.id, parsed.data);
  res.json(sequence);
});

/**
 * DELETE /domain/sequences/:id/clip/:clipId - remove a clip from a sequence
 *
 * Removes the clip from the sequence without deleting the clip itself.
 *
 * @param id - uuid of the sequence
 * @param clipId - uuid of the clip to remove
 *
 * @returns 204 No Content on success
 * @returns 404 if clip is not in this sequence
 */
router.delete("/:id/clip/:clipId", async (req, res) => {
  await sequencesService.removeClipFromSequence(req.params.id, req.params.clipId);
  res.status(204).send();
});

/**
 * DELETE /domain/sequences/:id - permanently delete a sequence
 *
 * Deletes the sequence and all its sequence items (via cascade).
 * Does not delete the underlying clips.
 *
 * @param id - uuid of the sequence to delete
 *
 * @returns 204 No Content on success
 * @returns 404 if no sequence with that id exists
 */
router.delete("/:id", async (req, res) => {
  await sequencesService.deleteSequence(req.params.id);
  res.status(204).send();
});

export default router;