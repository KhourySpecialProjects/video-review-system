import { Router, type Request, type Response } from "express";
import * as videosService from "./videos.service.js";
import { AppError } from "../../middleware/errors.js";
import { requireInternalAuth, requireSession, authorize } from "../../middleware/auth.js";
import { createVideoSchema, completeUploadSchema, updateVideoSchema, searchVideosSchema, updateS3KeySchema } from "./videos.types.js";
import prisma from "../../lib/prisma";

// ── Auth: swap devAuthenticate for authenticate when going to production ──
//import { devAuthenticate } from "../../middleware/dev_auth.js";

const router = Router();

/**
 * PUT /domain/videos/:id/update-key - update the S3 key for a video (internal only)
 *
 * @param id - uuid of the video
 * @body s3Key - the new S3 object key
 *
 * @returns 200 with the updated video
 * @returns 400 if s3Key is missing or invalid
 * @returns 404 if no video with that id exists (Prisma P2025 → errorHandler)
 */
router.put("/:id/update-key", requireInternalAuth, async (req: Request<{ id: string }>, res: Response) => {
  const { s3Key } = updateS3KeySchema.parse(req.body);
  const video = await videosService.updateVideo(req.params.id, { s3Key });
  res.json(video);
});

// All remaining video routes require session authentication
router.use(requireSession);

/**
 * GET /domain/videos?limit=20&offset=0 - list uploaded videos with pagination
 * 
 * NOTE: access control is handled in the service layer using the user's role and associations for listing routes
 * 
 * Access:
 *   CAREGIVER - own videos only
 *   CLINICAL_REVIEWER - videos in their site & enrolled studies
 *   SITE_COORDINATOR - videos in their site
 *   SYSADMIN - all videos
 * 
 * @query limit - number of videos to return (default: 20)
 * @query offset - number of videos to skip for pagination (default: 0)
 *
 * @returns 200 with { videos, total, limit, offset }
 */
router.get(
  "/",
  authorize({
    action: "read",
    resource: "video",
  }),
  async (req, res) => {
    const parsedLimit = Number.parseInt(String(req.query.limit), 10);
    const parsedOffset = Number.parseInt(String(req.query.offset), 10);

    const limit =
      Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
    const offset =
      Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

    const result = await videosService.listVideos({ 
      limit, 
      offset, 
      user: req.user! });
    res.json(result);
  }
);

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
 * Access:
 *   CAREGIVER - own videos only
 *   CLINICAL_REVIEWER - videos in their site & enrolled studies
 *   SITE_COORDINATOR - videos in their site
 *   SYSADMIN - all videos
 * 
 * @param id - uuid of the video
 *
 * @returns 200 with { url, expiresIn }
 * @returns 404 if no video with that id exists
 * @returns 409 if the video is not yet UPLOADED
 */
router.get(
  "/:id/stream",
  authorize({
    action: "read",
    resource: "video",
    getResourceOwnerId: async(req) => {
      const video = await prisma.video.findUnique({ where: { id: req.params.id as string } });
      return video?.uploadedByUserId || null;
    },
    getStudyId: async (req) => {
      const vs = await prisma.videoStudy.findFirst({ where: { videoId: req.params.id as string } });
      return vs?.studyId ?? null;
    }
  }),
  async (req, res) => {
    const result = await videosService.getVideoStreamUrl(req.params.id as string);
    if (!result) {
      throw AppError.notFound("Video not found");
    }
    res.json(result);
  }
);

/**
 * POST /domain/videos/upload - creates a video record and initiates a multipart upload
 *
 * Flow: client receives the presigned URL and PUTs the file directly to S3,
 * then calls PUT /domain/videos/:id to update the status when done.
 * 
 * Access:
 *   CAREGIVER - can upload (they become the owner)
 *   CLINICAL_REVIEWER - cannot upload videos
 *   SITE_COORDINATOR - can upload on behalf of site
 *   SYSADMIN - unrestricted
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
router.post(
  "/upload",
  authorize({
    action: "write",
    resource: "video",
  }), 
  async (req, res) => {
    const parsed = createVideoSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest(parsed.error.issues[0].message);
    }

    console.log("Initiating video upload with data:", parsed.data);

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
 * Access:
 *   CAREGIVER - own videos only
 *   CLINICAL_REVIEWER - cannot update videos
 *   SITE_COORDINATOR - videos in their site
 *   SYSADMIN - unrestricted
 * 
 * @param id - uuid of the video to update
 *
 * @body status - (optional) new processing status
 * @body durationSeconds - (optional) updated video length
 * @body takenAt - (optional) updated recording timestamp
 * @body s3Key - (optional) S3 object key if the video file was replaced
 *
 * @returns 200 with the updated video
 * @returns 400 if request body fails validation
 * @returns 404 if no video with that id exists (Prisma P2025 → errorHandler)
 */
router.put(
  "/:id",
  authorize({
    action: "write",
    resource: "video",
    getResourceOwnerId: async (req) => {
      const video = await prisma.video.findUnique({ where: { id: req.params.id as string } });
      return video?.uploadedByUserId ?? null;
    },
    getStudyId: async (req) => {
      const vs = await prisma.videoStudy.findFirst({ where: { videoId: req.params.id as string } });
      return vs?.studyId ?? null;
    },
  }), 
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
 * DELETE /domain/videos/:id - permanently deletes a video by its uuid
 *
 * Access:
 *   CAREGIVER - own videos only
 *   CLINICAL_REVIEWER - cannot delete videos
 *   SITE_COORDINATOR - videos in their site
 *   SYSADMIN - unrestricted
 * 
 * @param id - uuid of the video to delete
 *
 * @returns 204 No Content on success
 * @returns 404 if no video with that id exists (Prisma P2025 → errorHandler)
 */
router.delete(
  "/:id",
  authorize({
    action: "delete",
    resource: "video",
    getResourceOwnerId: async (req) => {
      const video = await prisma.video.findUnique({ where: { id: req.params.id as string } });
      return video?.uploadedByUserId ?? null;
    },
    getStudyId: async (req) => {
      const vs = await prisma.videoStudy.findFirst({ where: { videoId: req.params.id as string } });
      return vs?.studyId ?? null;
    },
  }), 
  async (req, res) => {
    // Prisma throws P2025 if not found — caught by errorHandler as 404
    await videosService.deleteVideo(req.params.id as string);
    res.status(204).send();
  }
);

export default router;
