import { Router } from "express";
import * as videosService from "./videos.service";
import { AppError } from "../../middleware/errors";
import { createVideoSchema, updateVideoSchema, uploadVideoSchema } from "./videos.types";
import { generatePresignedGetUrl, generatePresignedUploadUrl } from "../../lib/s3";
import prisma from "../../lib/prisma";

const router = Router();

/**
 * GET /domain/videos?limit=20&offset=0 - list videos with pagination
 * 
 * @query limit - number of videos to return (default: 20)
 * @query offset - number of videos to skip for pagination (default: 0)
 * 
 * @returns 200 with { videos, total, limit, offset }
 * @returns 500 if listing fails
 */
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

/**
 * GET /domain/videos/:id - get video by id
 * 
 * @param id - the id of the video to fetch
 * 
 * @returns 200 with the video object
 * @returns 404 if no video with that id exists
 * @returns 500 if fetch fails
 */
router.get("/:id", async (req, res) => {
  try {
    // call service to get video by id
    const video = await videosService.getVideoById(req.params.id);

    // if not found, throw 404 — caught by errorHandler
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

/**
 * S3 Bucket GET /domain/videos/:id/stream - generates a presigned URL for streaming/downloading a video file
 *
 * @param videoId - The video uuid
 * 
 * @returns object with the presigned URL and expiration, or null if video not found
 */
export async function getVideoStreamUrl(
  videoId: string
): Promise<{ url: string; expiresIn: number } | null> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
  });

  if (!video) {
    return null;
  }

  if (video.status !== "READY") {
    throw new Error("Video is not ready for streaming");
  }

  // generate the S3 key from the video id
  // if you add a storage_key column later, use video.storageKey instead
  const s3Key = `videos/${videoId}/original.mp4`;
  const expiresIn = 3600; // 1 hour

  const url = await generatePresignedGetUrl(s3Key, expiresIn);

  return { url, expiresIn };
}

/**
 * POST /domain/videos - creates a new video record
 *
 * @body patientId - uuid of the associated patient
 * @body durationSeconds - (optional) video length in seconds
 * @body takenAt - (optional) ISO 8601 recording timestamp
 * 
 * @returns 201 with the created video
 * @returns 400 if request body fails validation
 * @returns 500 if video creation fails
 */
router.post("/", async (req, res) => {
  try {
    // validate request body with zod schema
    const parsed = createVideoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    // for now, hardcode uploadedByUserId since we don't have auth yet
    const uploadedByUserId = "00000000-0000-0000-0000-000000000000"; // placeholder uuid

    // assume site, study, etc knowledge

    // checkperms(uploadedByUserId, needed_perms)

    // call service to create video with parsed data and uploadedByUserId
    const video = await videosService.createVideo({ 
      ...parsed.data, 
      uploadedByUserId 
    });

  res.status(201).json(video);
  } catch (error) {
    console.error("Error creating video:", error);
    res.status(500).json({ error: "Failed to create video" });
  }
});

/**
 * @route   POST /api/videos/upload
 * @desc    Creates a video record and returns a presigned S3 URL
 *          for the client to upload the file directly.
 * @body    {string} patientId - UUID of the patient (required)
 * @body    {string} contentType - MIME type: video/mp4, video/webm, or video/quicktime (required)
 * @body    {string} takenAt - ISO datetime of when video was recorded (optional)
 * 
 * @returns {object} { video, uploadUrl, expiresIn } (201)
 */
router.post("/upload", async (req: Request, res: Response): Promise<void> => {
  const parsed = uploadVideoSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest(parsed.error.errors[0].message);
  }
  // TODO: get real user ID from auth middleware (req.user.id)
  const uploadedByUserId = "00000000-0000-0000-0000-000000000000";

  const result = await videosService.createVideoWithUploadUrl({
    ...parsed.data,
    uploadedByUserId,
  });

  res.writeHead(201, { "Content-Type": "application/json" });
  res.end(JSON.stringify(result));
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
 * @returns 404 if no video with that id exists
 * @returns 500 if update fails
 */
router.put("/:id", async (req, res) => {
  try {
    // validate request body with zod schema
    const parsed = updateVideoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    // call service to update video with parsed data
    // prisma throws P2025 if not found — caught by errorHandler as 404
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

/**
 * DELETE /domain/videos/:id - permanently deletes a video by its uuid
 *
 * @param id - uuid of the video to delete
 * 
 * @returns 204 No Content on success
 * @returns 404 if no video with that id exists
 * @returns 500 if deletion fails
 */
router.delete("/:id", async (req, res) => {
  try {
    // call service to delete video
    // prisma throws P2025 if not found — caught by errorHandler as 404
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
