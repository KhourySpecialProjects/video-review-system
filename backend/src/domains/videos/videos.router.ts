import { Router } from "express";
import * as videosService from "./videos.service.js";
import { createVideoSchema, updateVideoSchema } from "./videos.types.js";
import { AppError } from "../../middleware/errors.js";

const router = Router();

// GET /domain/videos?limit=20&offset=0 - list videos with pagination
router.get("/", async (req, res) => {
  // Parse the raw query string values into integers.
  const parsedLimit = Number.parseInt(String(req.query.limit), 10);
  const parsedOffset = Number.parseInt(String(req.query.offset), 10);

  // Fall back to safe defaults when pagination values are missing or invalid.
  const limit =
    Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
  const offset =
    Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  // call service to get videos and total count
  const result = await videosService.listVideos({ limit, offset });
  res.json(result);
});

// GET /domain/videos/:id - get video by id
router.get("/:id", async (req, res) => {
  // call service to get video by id
  const video = await videosService.getVideoById(req.params.id);

  // if not found, throw 404 — caught by errorHandler
  if (!video) {
    throw AppError.notFound("Video not found");
  }

  // return video data
  res.json(video);
});

// POST /domain/videos - create video
router.post("/", async (req, res) => {
  // validate request body with zod schema — throws ZodError on failure
  const parsed = createVideoSchema.parse(req.body);

  // for now, hardcode uploadedByUserId since we don't have auth yet
  const uploadedByUserId = "00000000-0000-0000-0000-000000000000"; // placeholder UUID

  // call service to create video with parsed data and uploadedByUserId
  const video = await videosService.createVideo({
    ...parsed,
    uploadedByUserId,
  });

  res.status(201).json(video);
});

// PUT /domain/videos/:id - update video status or metadata
router.put("/:id", async (req, res) => {
  // validate request body with zod schema — throws ZodError on failure
  const parsed = updateVideoSchema.parse(req.body);

  // call service to update video with parsed data
  // prisma throws P2025 if not found — caught by errorHandler as 404
  const video = await videosService.updateVideo(req.params.id, parsed);

  res.json(video);
});

// DELETE /domain/videos/:id - delete video
router.delete("/:id", async (req, res) => {
  // call service to delete video
  // prisma throws P2025 if not found — caught by errorHandler as 404
  await videosService.deleteVideo(req.params.id);

  res.status(204).send();
});

export default router;
