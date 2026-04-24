import { Router, type Request, type Response } from "express";
import * as videosService from "./videos.service.js";
import { AppError } from "../../middleware/errors.js";
import { createVideoSchema, completeUploadSchema, updateVideoSchema, updateVideoMetadataSchema, searchVideosSchema, updateS3KeySchema } from "./videos.types.js";
import { requireInternalAuth, requireSession, requirePermission } from "../../middleware/auth.js";
import { buildVideoAccessFilter } from "../../lib/auth.js";
import { resolveVideoContexts, checkCaregiverVideoOwnership } from "./videos.perms.js";
import type { user_role } from "../../generated/prisma/client.js";

const router = Router();

/**
 * PUT /domain/videos/:id/update-key - update the S3 key for a video (internal only)
 */
router.put("/:id/update-key", requireInternalAuth, async (req: Request<{ id: string }>, res: Response) => {
  const { s3Key } = updateS3KeySchema.parse(req.body);
  const video = await videosService.updateVideo(req.params.id, { s3Key });
  res.json(video);
});

// All remaining video routes require session authentication
router.use(requireSession);

/**
 * GET /domain/videos - list uploaded videos with pagination
 *
 * Access is enforced by building a Prisma where-clause filter from the
 * user's permission rows, then passing it into the service layer.
 * Caregivers see only their own uploads; all other roles see what their
 * permission grants allow.
 */
router.get("/", async (req, res) => {
  const parsedLimit = Number.parseInt(String(req.query.limit), 10);
  const parsedOffset = Number.parseInt(String(req.query.offset), 10);

  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
  const offset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  const { id: userId, role } = req.authSession.user;
  const accessFilter = await buildVideoAccessFilter(userId, role as user_role, "READ");

  const result = await videosService.listVideos({ limit, offset, accessFilter, userId });

  res.json(result);
});

/**
 * GET /domain/videos/search - search and filter uploaded videos
 */
router.get("/search", async (req, res) => {
  const parsed = searchVideosSchema.safeParse(req.query);
  if (!parsed.success) {
    throw AppError.badRequest(parsed.error.issues[0].message);
  }

  const { id: userId, role } = req.authSession.user;
  const accessFilter = await buildVideoAccessFilter(userId, role as user_role, "READ");

  const result = await videosService.searchVideos({
    ...parsed.data,
    accessFilter,
    userId,
  });
  res.json(result);
});

/**
 * POST /domain/videos/upload - creates a video record and initiates multipart upload
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
  const result = await videosService.getVideoStreamUrl(
    req.params.id,
    req.authSession.user.id,
  );
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
 * GET /domain/videos/incomplete - list the current user's incomplete uploads
 * Already scoped to the authenticated user — no permission check needed.
 */
router.get("/incomplete", async (req, res) => {
  const result = await videosService.listIncompleteUploads(req.authSession.user.id);
  res.json(result);
});

/**
 * GET /domain/videos/:id/detail - get a single video with metadata
 */
router.get("/:id/detail",
  requirePermission("READ", resolveVideoContexts, checkCaregiverVideoOwnership),
  async (req, res) => {
    const result = await videosService.getVideoDetail(
      req.params.id as string,
      req.authSession.user.id,
    );
    res.json(result);
  }
);

/**
 * GET /domain/videos/:id/stream - generates a presigned URL for streaming
 */
router.get("/:id/stream",
  requirePermission("READ", resolveVideoContexts, checkCaregiverVideoOwnership),
  async (req, res) => {
    const result = await videosService.getVideoStreamUrl(req.params.id as string);
    if (!result) throw AppError.notFound("Video not found");
    res.json(result);
  }
);

/**
 * GET /domain/videos/:id/upload-status - get upload progress for resuming
 * Caregiver ownership check — only the uploader can check status.
 */
router.get("/:id/upload-status",
  requirePermission("READ", resolveVideoContexts, checkCaregiverVideoOwnership),
  async (req, res) => {
    const result = await videosService.getUploadStatus(req.params.id as string);
    res.json(result);
  }
);

/**
 * POST /domain/videos/:id/complete-upload - finalize a multipart upload
 */
router.post("/:id/complete-upload",
  requirePermission("WRITE", resolveVideoContexts, checkCaregiverVideoOwnership),
  async (req, res) => {
    const data = completeUploadSchema.parse(req.body);
    const video = await videosService.completeVideoUpload(req.params.id as string, data);
    res.json(video);
  }
);

/**
 * POST /domain/videos/:id/cancel-upload - abort an in-progress upload
 */
router.post("/:id/cancel-upload",
  requirePermission("WRITE", resolveVideoContexts, checkCaregiverVideoOwnership),
  async (req, res) => {
    await videosService.cancelVideoUpload(req.params.id as string);
    res.status(204).send();
  }
);

/**
 * PUT /domain/videos/:id/metadata - update the current user's private
 * title and description for a video. Title/description live on
 * CaregiverVideoMetadata (per-user), not on the Video row itself.
 *
 * @param id - uuid of the video
 *
 * @body title - new private title (required)
 * @body description - new private notes (optional)
 *
 * @returns 200 with the updated metadata row
 * @returns 400 if request body fails validation
 * @returns 404 if no metadata row exists for this (video, user)
 */
router.put("/:id/metadata", async (req, res) => {
  const parsed = updateVideoMetadataSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest(parsed.error.issues[0].message);
  }

  const metadata = await videosService.updateVideoMetadata(
    req.params.id,
    req.authSession.user.id,
    parsed.data,
  );
  res.json(metadata);
});

/**
 * DELETE /domain/videos/:id - permanently deletes a video by its uuid
 *
 * @param id - uuid of the video to delete
 *
 * @returns 204 No Content on success
 * @returns 404 if no video with that id exists (Prisma P2025 → errorHandler)
 */
router.put("/:id",
  requirePermission("WRITE", resolveVideoContexts, checkCaregiverVideoOwnership),
  async (req, res) => {
    const parsed = updateVideoSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest(parsed.error.issues[0].message);
    }
    const video = await videosService.updateVideo(req.params.id as string, parsed.data);
    res.json(video);
  }
);

/**
 * DELETE /domain/videos/:id - permanently delete a video
 */
router.delete("/:id",
  requirePermission("ADMIN", resolveVideoContexts, checkCaregiverVideoOwnership),
  async (req, res) => {
    await videosService.deleteVideo(req.params.id as string);
    res.status(204).send();
  }
);

export default router;