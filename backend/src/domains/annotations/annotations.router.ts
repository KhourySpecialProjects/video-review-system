import { Router } from "express";
import * as annotationsService from "./annotations.service";
import { createAnnotationSchema, updateAnnotationSchema } from "./annotations.types";

const router = Router();

// GET /domain/annotations?limit=20&offset=0 - list annotations with pagination
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

// GET /domain/annotations/:id - get annotation by id
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

// POST /domain/annotations - create annotation
router.post("/", async (req, res) => {
  try {
    // validate request body with zod schema
    const parsed = createAnnotationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    // for now, hardcode uploadedByUserId since we don't have auth yet
    const uploadedByUserId = "00000000-0000-0000-0000-000000000000"; // placeholder UUID

    // call service to create annotation with parsed data and uploadedByUserId
    const annotation = await annotationsService.createAnnotation({ 
      ...parsed.data, 
      videoId: req.params.videoId, 
      authorUserId: uploadedByUserId 
    });
    
    res.status(201).json(annotation);
  } catch (error) {
    console.error("Error creating annotation:", error);
    res.status(500).json({ error: "Failed to create annotation" });
  }
});

// PUT /domain/annotations/:id - update annotation status or metadata
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

// DELETE /domain/annotations/:id - delete annotation
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

// helper function to check if error is a Prisma "not found" error
function isPrismaNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as any).code === "P2025"
  );
}