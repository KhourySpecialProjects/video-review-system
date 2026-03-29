import { Router } from "express";
import * as videosService from "./videos.service";
import { createVideoSchema, updateVideoSchema } from "./videos.types";

const router = Router();

// GET /domain/videos?limit=20&offset=0 - list videos with pagination
router.get("/", async (req, res) => {
  try {
    // parse limit and offset from query, with defaults
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // call service to get videos and total count
    const result = await videosService.listVideos({ limit, offset });
    res.json(result);
  } catch (error) {
    console.error("Error listing videos:", error);
    res.status(500).json({ error: "Failed to list videos" });
  }
});

// GET /domain/videos/:id - get video by id
router.get("/:id", async (req, res) => {
  try {
    // call service to get video by id
    const video = await videosService.getVideoById(req.params.id);

    // if not found, return 404
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // return video data
    res.json(video);
  } catch (error) {
    console.error("Error fetching video:", error);
    res.status(500).json({ error: "Failed to fetch video" });
  }
});

// POST /domain/videos - create video
router.post("/", async (req, res) => {
  try {
    // validate request body with zod schema
    const parsed = createVideoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    // for now, hardcode uploadedByUserId since we don't have auth yet
    const uploadedByUserId = "00000000-0000-0000-0000-000000000000"; // placeholder UUID

    // call service to create video with parsed data and uploadedByUserId
    const video = await videosService.createVideo({ ...parsed.data, uploadedByUserId });

    res.status(201).json(video);
  } catch (error) {
    console.error("Error creating video:", error);
    res.status(500).json({ error: "Failed to create video" });
  }
});

// PUT /domain/videos/:id - update video status or metadata
router.put("/:id", async (req, res) => {
  try {
    // validate request body with zod schema
    const parsed = updateVideoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    // call service to update video with parsed data
    const video = await videosService.updateVideo(req.params.id, parsed.data);

    res.json(video);
  } catch (error) {
    console.error("Error updating video:", error);
    // if error is from prisma not finding the video, return 404
    if (isPrismaNotFound(error)) {
      return res.status(404).json({ error: "Video not found" });
    }
    res.status(500).json({ error: "Failed to update video" });
  }
});

// DELETE /domain/videos/:id - delete video
router.delete("/:id", async (req, res) => {
  try {
    // call service to delete video
    await videosService.deleteVideo(req.params.id);

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting video:", error);
    // if error is from prisma not finding the video, return 404
    if (isPrismaNotFound(error)) {
      return res.status(404).json({ error: "Video not found" });
    }
    res.status(500).json({ error: "Failed to delete video" });
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