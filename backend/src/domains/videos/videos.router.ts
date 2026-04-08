import { Router } from "express";
import * as videosService from "./videos.service";
import { AppError } from "../../middleware/errors";
import { requireSession } from "../../middleware/auth";
import { createVideoSchema, completeUploadSchema, updateVideoSchema, searchVideosSchema } from "./videos.types";

const router = Router();

// All video routes require authentication
router.use(requireSession);

/**
 * GET /domain/videos?limit=20&offset=0 - list uploaded videos with pagination
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

  const result = await videosService.listVideos({
    userId: req.authSession.user.id,
    limit,
    offset,
  });
  res.json(result);
});

/**
 * GET /domain/videos/search - search and filter uploaded videos
 *
 * @query q - free-text search across title and notes
 * @query uploadedAfter - ISO datetime lower bound for upload date
 * @query uploadedBefore - ISO datetime upper bound for upload date
 * @query filmedAfter - ISO datetime lower bound for filmed date
 * @query filmedBefore - ISO datetime upper bound for filmed date
 * @query limit - max results (default: 50)
 * @query offset - results to skip (default: 0)
 *
 * @returns 200 with { videos, total, limit, offset }
 */
router.get("/search", async (req, res) => {
  const parsed = searchVideosSchema.safeParse(req.query);
  if (!parsed.success) {
    throw AppError.badRequest(parsed.error.issues[0].message);
  }

  const result = await videosService.searchVideos({
    ...parsed.data,
    userId: req.authSession.user.id,
  });
  res.json(result);
});

/**
 * GET /domain/videos/:id/detail - get a single video with metadata
 *
 * @param id - uuid of the video
 *
 * @returns 200 with VideoListItem
 * @returns 404 if no video with that id exists
 */
router.get("/:id/detail", async (req, res) => {
  const result = await videosService.getVideoDetail(
    req.params.id,
    req.authSession.user.id,
  );
  res.json(result);
});

/**
 * GET /domain/videos/:id/stream - generates a presigned URL for streaming a video
 *
 * @param id - uuid of the video
 *
 * @returns 200 with { url, expiresIn }
 * @returns 404 if no video with that id exists
 * @returns 409 if the video is not yet UPLOADED
 */
router.get("/:id/stream", async (req, res) => {
  const result = await videosService.getVideoStreamUrl(req.params.id);
  res.json(result);
});

/**
 * POST /domain/videos/upload - creates a video record and initiates a multipart upload
 *
 * Returns presigned URLs for each part so the client can upload chunks
 * directly to S3 in parallel. The client tracks per-chunk progress via
 * XHR/fetch upload progress events and aggregates them for total progress.
 *
 * @body patientId - uuid of the patient (required)
 * @body videoName - original filename (required)
 * @body fileSize - total file size in bytes (required)
 * @body durationSeconds - video length in seconds (required)
 * @body createdAt - ISO datetime (required)
 * @body takenAt - ISO datetime (required)
 * @body contentType - MIME type, must be video/mp4 (required)
 *
 * @returns 201 with { video, parts, partSize, totalParts, expiresIn }
 * @returns 400 if request body fails validation
 */
router.post("/upload", async (req, res) => {
  const parsed = createVideoSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest(parsed.error.issues[0].message);
  }

  const result = await videosService.initiateVideoUpload({
    ...parsed.data,
    uploadedByUserId: req.authSession.user.id,
  });

  res.status(201).json(result);
});

/**
 * GET /domain/videos/incomplete - list the current user's incomplete uploads with progress
 *
 * @returns 200 with array of { videoId, fileName, fileSize, bytesUploaded, totalParts, uploadedPartCount, createdAt }
 * @returns 401 if no valid session exists
 */
router.get("/incomplete", async (req, res) => {
  const result = await videosService.listIncompleteUploads(req.authSession.user.id);
  res.json(result);
});

/**
 * GET /domain/videos/:id/upload-status - get current upload progress for resuming
 *
 * Returns which parts S3 already has, fresh presigned URLs for remaining
 * parts, and bytesUploaded so the frontend can show accurate resume progress.
 *
 * @param id - uuid of the video
 *
 * @returns 200 with { video, uploadedParts, remainingParts, bytesUploaded, partSize, totalParts, expiresIn }
 * @returns 404 if no video with that id exists
 * @returns 409 if the video is not in UPLOADING status
 */
router.get("/:id/upload-status", async (req, res) => {
  const result = await videosService.getUploadStatus(req.params.id);
  res.json(result);
});

/**
 * POST /domain/videos/:id/complete-upload - finalize a multipart upload
 *
 * The client calls this after all parts have been uploaded to S3.
 * Assembles the parts in S3 and updates the video status to UPLOADED.
 *
 * @param id - uuid of the video
 * @body parts - array of { partNumber, etag } for every uploaded part
 *
 * @returns 200 with the updated video record
 * @returns 400 if request body fails validation (handled by error middleware)
 * @returns 404 if no video with that id exists
 * @returns 409 if the video is not in UPLOADING status
 */
router.post("/:id/complete-upload", async (req, res) => {
  const data = completeUploadSchema.parse(req.body);
  const video = await videosService.completeVideoUpload(req.params.id, data);
  res.json(video);
});

/**
 * POST /domain/videos/:id/cancel-upload - abort an in-progress upload
 *
 * Aborts the S3 multipart upload (discarding uploaded parts) and deletes
 * the video record.
 *
 * @param id - uuid of the video
 *
 * @returns 204 No Content on success
 * @returns 404 if no video with that id exists
 * @returns 409 if the video is not in UPLOADING status
 */
router.post("/:id/cancel-upload", async (req, res) => {
  await videosService.cancelVideoUpload(req.params.id);
  res.status(204).send();
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
