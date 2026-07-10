import { Router, type Request, type Response } from "express";
import * as videosService from "./videos.service.js";
import { AppError } from "../../middleware/errors.js";
import { createVideoSchema, completeUploadSchema, updateVideoSchema, updateVideoMetadataSchema, searchVideosSchema, updateS3KeySchema } from "./videos.types.js";
import { requireInternalAuth, requireSession, requirePermission, requireRole, requireCaregiverOwnership } from "../../middleware/auth.js";
import { requireAuditActorContext } from "../../middleware/audit.js";
import { videos } from "../../lib/resolvers.js";

const router = Router();

/**
 * @description PUT /domain/videos/:id/update-key - update the S3 key for a video (internal only).
 * Not audited: infrastructure operation with no user session (API key auth only).
 */
router.put("/:id/update-key", requireInternalAuth, async (req: Request<{ id: string }>, res: Response) => {
  const { s3Key } = updateS3KeySchema.parse(req.body);
  const video = await videosService.updateVideo(req.params.id, { s3Key });
  res.json(video);
});

// All remaining video routes require session authentication
router.use(requireSession);

/**
 * @description GET /domain/videos - list uploaded videos with pagination.
 * Caregiver-only — scoped to the authenticated user's own uploads.
 */
router.get("/",
  requireRole("CAREGIVER"),
  async (req, res) => {
    const parsedLimit = Number.parseInt(String(req.query.limit), 10);
    const parsedOffset = Number.parseInt(String(req.query.offset), 10);

    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
    const offset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

    const result = await videosService.listVideos({
      limit,
      offset,
      userId: req.authSession.user.id,
    });
    res.json(result);
  }
);

/**
 * @description GET /domain/videos/search - search and filter uploaded videos.
 * Caregiver-only — scoped to the authenticated user's own uploads.
 */
router.get("/search",
  requireRole("CAREGIVER"),
  async (req, res) => {
    const data = searchVideosSchema.parse(req.query);
    const result = await videosService.searchVideos({
      ...data,
      userId: req.authSession.user.id,
    });
    res.json(result);
  }
);

/**
 * @description POST /domain/videos/upload - creates a video record and initiates a multipart upload.
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
router.post("/upload",
  requireRole("CAREGIVER"),
  async (req, res) => {
    const data = createVideoSchema.parse(req.body);

    const result = await videosService.initiateVideoUpload({
      ...data,
      uploadedByUserId: req.authSession.user.id,
    }, requireAuditActorContext(req));
  
    res.status(201).json(result);
  });

  

/**
 * @description GET /domain/videos/incomplete - list the current user's incomplete uploads.
 * Caregiver-only — scoped to the authenticated user.
 */
router.get("/incomplete",
  requireRole("CAREGIVER"),
  async (req, res) => {
    const result = await videosService.listIncompleteUploads(req.authSession.user.id);
    res.json(result);
  }
);

/**
 * @description GET /domain/videos/:id/detail - get a single video with metadata.
 */
router.get("/:id/detail",
  requireCaregiverOwnership(videos.resolveOwnerId),
  requirePermission("READ", videos.fromParams),
  async (req, res) => {
    const result = await videosService.getVideoDetail(
      req.params.id as string,
      req.authSession.user.id,
    );
    res.json(result);
  }
);

/**
 * @description GET /domain/videos/:id/stream - generates a presigned URL for streaming.
 */
router.get("/:id/stream",
  requireCaregiverOwnership(videos.resolveOwnerId),
  requirePermission("READ", videos.fromParams),
  async (req, res) => {
    const result = await videosService.getVideoStreamUrl(
      req.params.id as string,
      req.authSession.user.id,
      requireAuditActorContext(req),
    );
    if (!result) throw AppError.notFound("Video not found");
    res.json(result);
  }
);

/**
 * @description GET /domain/videos/:id/upload-status - get upload progress for resuming.
 * Caregiver-only — only the uploader can check status.
 */
router.get("/:id/upload-status",
  requireRole("CAREGIVER"),
  requireCaregiverOwnership(videos.resolveOwnerId),
  async (req, res) => {
    const result = await videosService.getUploadStatus(req.params.id as string);
    res.json(result);
  }
);

/**
 * @description POST /domain/videos/:id/complete-upload - finalize a multipart upload.
 * Caregiver-only — only the uploader can complete their upload.
 */
router.post("/:id/complete-upload",
  requireRole("CAREGIVER"),
  requireCaregiverOwnership(videos.resolveOwnerId),
  async (req, res) => {
    const data = completeUploadSchema.parse(req.body);
    const video = await videosService.completeVideoUpload(
      req.params.id as string,
      data,
      requireAuditActorContext(req),
    );
    res.json(video);
  }
);

/**
 * @description POST /domain/videos/:id/cancel-upload - abort an in-progress upload.
 * Caregiver-only — only the uploader can cancel their upload.
 */
router.post("/:id/cancel-upload",
  requireRole("CAREGIVER"),
  requireCaregiverOwnership(videos.resolveOwnerId),
  async (req, res) => {
    await videosService.cancelVideoUpload(
      req.params.id as string,
      requireAuditActorContext(req),
    );
    res.status(204).send();
  }
);

/**
 * @description PUT /domain/videos/:id/metadata - update the current user's private
 * title and description for a video.
 * Caregiver-only — only the uploader can edit their metadata.
 */
router.put("/:id/metadata",
  requireRole("CAREGIVER"),
  requireCaregiverOwnership(videos.resolveOwnerId),
  async (req, res) => {
    const data = updateVideoMetadataSchema.parse(req.body);

    const metadata = await videosService.updateVideoMetadata(
      req.params.id as string,
      req.authSession.user.id,
      data,
      requireAuditActorContext(req),
    );
    res.json(metadata);
  }
);

/**
 * @description PUT /domain/videos/:id - update a video's fields.
 */
router.put("/:id",
  requireCaregiverOwnership(videos.resolveOwnerId),
  requirePermission("WRITE", videos.fromParams),
  async (req, res) => {
    const data = updateVideoSchema.parse(req.body);
    const video = await videosService.updateVideo(
      req.params.id as string,
      data,
      requireAuditActorContext(req),
    );
    res.json(video);
    
  }
);

/**
 * @description DELETE /domain/videos/:id - permanently delete a video.
 */
router.delete("/:id",
  requirePermission("ADMIN", videos.fromParams),
  async (req, res) => {
    await videosService.deleteVideo(
      req.params.id as string,
      requireAuditActorContext(req),
    );
    res.status(204).send();
  }
);

export default router;
