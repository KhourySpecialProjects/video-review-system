import { Router } from "express";
import * as videosService from "./videos.service";
import { AppError } from "../../middleware/errors";
import { createVideoSchema, updateVideoSchema } from "./videos.types";

const router = Router();

/**
 * GET /domain/videos?limit=20&offset=0 - list videos with pagination
 *
 * @query limit - number of videos to return (default: 20)
 * @query offset - number of videos to skip for pagination (default: 0)
 *
 * @returns 200 with { videos, total, limit, offset }
 */
router.get("/", async (req, res) => {
  const parsedLimit = Number.parseInt(String(req.query.limit), 10);
  const parsedOffset = Number.parseInt(String(req.query.offset), 10);

  const limit =
    Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
  const offset =
    Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  const result = await videosService.listVideos({ limit, offset });
  res.json(result);
});

/**
 * GET /domain/videos/:id - get video by id
 *
 * @param id - uuid of the video to fetch
 *
 * @returns 200 with the video object
 * @returns 404 if no video with that id exists
 */
router.get("/:id", async (req, res) => {
  const video = await videosService.getVideoById(req.params.id);
  if (!video) {
    throw AppError.notFound("Video not found");
  }
  res.json(video);
});

/**
 * GET /domain/videos/:id/stream - generates a presigned URL for streaming a video
 *
 * @param id - uuid of the video
 *
 * @returns 200 with { url, expiresIn }
 * @returns 404 if no video with that id exists
 * @returns 409 if the video is not yet READY
 */
router.get("/:id/stream", async (req, res) => {
  const result = await videosService.getVideoStreamUrl(req.params.id);
  if (!result) {
    throw AppError.notFound("Video not found");
  }
  res.json(result);
});

/**
 * POST /domain/videos/upload - creates a video record and returns a presigned S3 upload URL
 *
 * Flow: client receives the presigned URL and PUTs the file directly to S3,
 * then calls PUT /domain/videos/:id to update the status when done.
 *
 * @body patientId - uuid of the patient (required)
 * @body contentType - MIME type: video/mp4, video/webm, or video/quicktime (required)
 * @body takenAt - ISO datetime of when video was recorded (required)
 *
 * @returns 201 with { video, uploadUrl, expiresIn }
 * @returns 400 if request body fails validation
 */
router.post("/upload", async (req, res) => {
  const parsed = createVideoSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest(parsed.error.issues[0].message);
  }

  // TODO: get real user ID from auth middleware (req.user.id)
  const uploadedByUserId = "00000000-0000-0000-0000-000000000000";

  const result = await videosService.createVideoWithUploadUrl({
    ...parsed.data,
    uploadedByUserId,
  });

  res.status(201).json(result);
});

/**
 * PUT /domain/videos/:id - update video status or metadata
 *
 * @param id - uuid of the video to update
 *
 * @body status - (optional) new processing status
 * @body durationSeconds - (optional) updated video length
 * @body takenAt - (optional) updated recording timestamp
 *
 * @returns 200 with the updated video
 * @returns 400 if request body fails validation
 * @returns 404 if no video with that id exists (Prisma P2025 → errorHandler)
 */
router.put("/:id", async (req, res) => {
  const parsed = updateVideoSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest(parsed.error.issues[0].message);
  }

  // Prisma throws P2025 if not found — caught by errorHandler as 404
  const video = await videosService.updateVideo(req.params.id, parsed.data);
  res.json(video);
});

/**
 * DELETE /domain/videos/:id - permanently deletes a video by its uuid
 *
 * @param id - uuid of the video to delete
 *
 * @returns 204 No Content on success
 * @returns 404 if no video with that id exists (Prisma P2025 → errorHandler)
 */
router.delete("/:id", async (req, res) => {
  // Prisma throws P2025 if not found — caught by errorHandler as 404
  await videosService.deleteVideo(req.params.id);
  res.status(204).send();
});

export default router;
