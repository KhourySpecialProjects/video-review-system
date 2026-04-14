import { Router } from "express";
import * as annotationsService from "./annotations.service.js";
import { AppError } from "../../middleware/errors.js";
import { Prisma } from "../../generated/prisma/client.js";
import { createAnnotationSchema, updateAnnotationSchema } from "./annotations.types.js";

const router = Router();

/**
 * GET /domain/annotations - lists annotations for a specific video with pagination.
 *
 * @query videoId - uuid of the video to filter by
 * @query limit - max number of annotations to return (default: 20)
 * @query offset - number of annotations to skip (default: 0)
 *
 * @returns 200 with { annotations, total, limit, offset }
 */
router.get("/", async (req, res) => {
  const parsedLimit = Number.parseInt(String(req.query.limit), 10);
  const parsedOffset = Number.parseInt(String(req.query.offset), 10);

  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
  const offset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  const result = await annotationsService.listAnnotationsByVideo(req.query.videoId as string, { limit, offset });
  res.json(result);
});

/**
 * GET /domain/annotations/:id - retrieves a single annotation by its uuid.
 *
 * @param id - uuid of the annotation
 *
 * @returns 200 with the annotation object
 * @returns 404 if no annotation with that id exists
 */
router.get("/:id", async (req, res) => {
  const annotation = await annotationsService.getAnnotationById(req.params.id);
  if (!annotation) {
    throw AppError.notFound("Annotation not found");
  }
  res.json(annotation);
});

/**
 * POST /domain/annotations - creates a new annotation on a video.
 *
 * @body videoId - uuid of the video to annotate
 * @body authorUserId - uuid of the user creating the annotation
 * @body studyId - uuid of the associated study
 * @body siteId - uuid of the associated site
 * @body type - annotation type (text_comment, drawing_box, drawing_circle, freehand_drawing, or tag)
 * @body timestampSeconds - position in the video in seconds
 * @body durationSeconds - how long the annotation spans in seconds
 * @body payload - JSON object with type-specific data
 *
 * @returns 201 with the created annotation
 * @returns 400 if request body fails validation
 * @returns 404 if the referenced video does not exist
 */
router.post("/", async (req, res) => {
  const parsed = createAnnotationSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest(parsed.error.issues[0].message);
  }

  // TODO: get real user ID from auth middleware (req.user.id)
  const uploadedByUserId = "00000000-0000-0000-0000-000000000000";

  const annotation = await annotationsService.createAnnotation({
    videoId: parsed.data.videoId,
    authorUserId: uploadedByUserId,
    studyId: parsed.data.studyId,
    siteId: parsed.data.siteId,
    type: parsed.data.type,
    timestampSeconds: parsed.data.timestampSeconds,
    durationSeconds: parsed.data.durationSeconds,
    payload: parsed.data.payload as Prisma.InputJsonValue,
  });

  res.status(201).json(annotation);
});

/**
 * PUT /domain/annotations/:id - updates an existing annotation's timestamp, duration, or payload.
 *
 * @param id - uuid of the annotation to update
 * @body timestampSeconds - updated position in seconds
 * @body durationSeconds - updated duration in seconds
 * @body payload - updated JSON payload
 *
 * @returns 200 with the updated annotation
 * @returns 400 if request body fails validation
 * @returns 404 if no annotation with that id exists (Prisma P2025 → errorHandler)
 */
router.put("/:id", async (req, res) => {
  const parsed = updateAnnotationSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest(parsed.error.issues[0].message);
  }

  // Prisma throws P2025 if not found — caught by errorHandler as 404
  const annotation = await annotationsService.updateAnnotation(req.params.id, parsed.data);
  res.json(annotation);
});

/**
 * DELETE /domain/annotations/:id - permanently deletes an annotation by its uuid.
 *
 * @param id - uuid of the annotation to delete
 *
 * @returns 204 No Content on success
 * @returns 404 if no annotation with that id exists (Prisma P2025 → errorHandler)
 */
router.delete("/:id", async (req, res) => {
  // Prisma throws P2025 if not found — caught by errorHandler as 404
  await annotationsService.deleteAnnotation(req.params.id);
  res.status(204).send();
});

export default router;
