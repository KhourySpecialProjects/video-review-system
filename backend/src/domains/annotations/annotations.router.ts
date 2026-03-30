import { Router } from "express";
import * as annotationsService from "./annotations.service";
import { Prisma } from "../../generated/prisma/client";
import { createAnnotationSchema, updateAnnotationSchema } from "./annotations.types";

const router = Router();

/**
 * GET /domain/annotations - lists annotations for a specific video with pagination.
 *
 * @query videoId - uuid of the video to filter by
 * @query limit - max number of annotations to return (default: 20)
 * @query offset - number of annotations to skip (default: 0)
 * 
 * @returns 200 with { annotations, total, limit, offset }
 * @returns 500 if listing fails
 */
router.get("/", async (req, res) => {
  try {
    // parse limit and offset from query, with defaults
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // call service to get annotations and total count
    const result = await annotationsService.listAnnotationsByVideo(req.query.videoId as string, { limit, offset });
    res.json(result); 
  } catch (error) {
    console.error("Error listing annotations:", error);
    res.status(500).json({ error: "Failed to list annotations" });
  }
});

/**
 * GET /domain/annotations/:id - retrieves a single annotation by its uuid.
 *
 * @param id - uuid of the annotation
 * 
 * @returns 200 with the annotation object
 * @returns 404 if no annotation with that id exists
 * @returns 500 if fetch fails
 */
router.get("/:id", async (req, res) => {
  try {
    // call service to get annotation by id
    const annotation = await annotationsService.getAnnotationById(req.params.id);

    // if not found, return 404
    if (!annotation) {
      return res.status(404).json({ error: "Annotation not found" });
    }

    // return annotation data
    res.json(annotation);
  } catch (error) {
    console.error("Error fetching annotation:", error);
    res.status(500).json({ error: "Failed to fetch annotation" });
  }
});

/**
 * POST /domain/annotations - creates a new annotation on a video.
 *
 * @body videoId - uuid of the video to annotate
 * @body type - annotation type (text_comment, drawing_box, or freehand_drawing)
 * @body timestampMs - position in the video in milliseconds
 * @body durationMs - (optional) how long the annotation spans in ms
 * @body payload - (optional) JSON object with type-specific data
 * 
 * @returns 201 with the created annotation
 * @returns 400 if request body fails validation
 * @returns 500 if creation fails
 */
router.post("/", async (req, res) => {
  try {
    // validate request body with zod schema
    const parsed = createAnnotationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    // for now, hardcode uploadedByUserId since we don't have auth yet
    const uploadedByUserId = "00000000-0000-0000-0000-000000000000"; // placeholder uuid

    // call service to create annotation with parsed data and uploadedByUserId

    const annotation = await annotationsService.createAnnotation({
      type: parsed.data.type,
      timestampMs: parsed.data.timestampMs,
      durationMs: parsed.data.durationMs,
      payload: parsed.data.payload as Prisma.JsonValue ?? undefined,
      videoId: parsed.data.videoId,
      authorUserId: uploadedByUserId,
    });
    
    res.status(201).json(annotation);
  } catch (error) {
    console.error("Error creating annotation:", error);
    res.status(500).json({ error: "Failed to create annotation" });
  }
});

/**
 * PUT /domain/annotations/:id - updates an existing annotation's timestamp, duration, or payload.
 *
 * @param id - uuid of the annotation to update
 * 
 * @body timestampMs - (optional) updated position in ms
 * @body durationMs - (optional) updated duration in ms
 * @body payload - (optional) updated JSON payload
 * 
 * @returns 200 with the updated annotation
 * @returns 400 if request body fails validation
 * @returns 404 if no annotation with that id exists
 * @returns 500 if update fails
 */
router.put("/:id", async (req, res) => {
  try {
    // validate request body with zod schema
    const parsed = updateAnnotationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    // call service to update annotation with parsed data
    const annotation = await annotationsService.updateAnnotation(req.params.id, parsed.data);

    res.json(annotation);
  } catch (error) {
    console.error("Error updating annotation:", error);
    // if error is from prisma not finding the annotation, return 404
    if (isPrismaNotFound(error)) {
      return res.status(404).json({ error: "Annotation not found" });
    }
    res.status(500).json({ error: "Failed to update annotation" });
  }
});

/**
 * DELETE /domain/annotations/:id - permanently deletes an annotation by its uuid.
 *
 * @param id - uuid of the annotation to delete
 * 
 * @returns 204 No Content on success
 * @returns 404 if no annotation with that id exists
 * @returns 500 if deletion fails
 */
router.delete("/:id", async (req, res) => {
  try {
    // call service to delete annotation
    await annotationsService.deleteAnnotation(req.params.id);

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting annotation:", error);
    // if error is from prisma not finding the annotation, return 404
    if (isPrismaNotFound(error)) {
      return res.status(404).json({ error: "Annotation not found" });
    }
    res.status(500).json({ error: "Failed to delete annotation" });
  }
});

export default router;

/**
 * checks whether an error is a Prisma "record not found" error (P2025)
 *
 * @param error - the caught error to check
 * 
 * @returns true if the error has code P2025
 */
function isPrismaNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as any).code === "P2025"
  );
}