import { z } from "zod";

/**
 * Validation schema for creating a new video and initiating a multipart upload.
 * Only includes fields the client is allowed to send.
 *
 * @field patientId - uuid of the associated patient
 * @field videoName - original filename for reference
 * @field fileSize - file size in bytes, used to calculate the number of upload parts
 * @field durationSeconds - video length in seconds, must be positive
 * @field createdAt - when the video record was created, must be a valid ISO datetime string
 * @field takenAt - (optional) ISO 8601 datetime string of when the video was recorded
 * @field contentType - MIME type of the uploaded file, must be video/mp4 for now
 */
export const createVideoSchema = z.object({
  videoTitle: z.string().min(1, "title is required"),
  videoDescription: z.string().optional(),
  videoName: z.string().min(1, "videoName is required"),
  fileSize: z.number().int().positive("fileSize must be a positive integer"),
  durationSeconds: z.number().int().positive(),
  takenAt: z.iso.datetime(),
  contentType: z.enum(["video/mp4"], {
    message: "contentType must be video/mp4",
  }),
});

/**
 * Validation schema for completing a multipart upload.
 * The client sends the ETag returned by S3 for each uploaded part.
 *
 * @field parts - array of { partNumber, etag } for every uploaded part
 */
export const completeUploadSchema = z.object({
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().positive(),
        etag: z.string().min(1, "etag is required"),
      })
    )
    .min(1, "At least one part is required"),
});

/**
 * Validation schema for updating a video's metadata or status.
 * All fields are optional — only include what needs to change.
 *
 * @field status - new processing status
 * @field durationSeconds - updated video length in seconds, must be positive
 * @field takenAt - updated timestamp of when the video was recorded, must be a valid ISO datetime string
 */
export const updateVideoSchema = z.object({
    status: z.enum(["UPLOADING", "UPLOADED", "FAILED"]).optional(),
    durationSeconds: z.number().int().positive().optional(),
    takenAt: z.iso.datetime().optional(),
    s3Key: z.string().optional(),
  })
  // Keep fields optional individually, but require at least one change.
  // If you change nothing, it should be invalid.
  .refine(
    (data) =>
      data.status !== undefined ||
      data.durationSeconds !== undefined ||
      data.takenAt !== undefined,
    {
      message: "At least one field must be provided",
    },
  );

/**
 * Validation schema for searching and filtering videos.
 * All fields are optional query parameters.
 *
 * @field q - free-text search across title and notes
 * @field uploadedAfter - ISO datetime lower bound for upload date
 * @field uploadedBefore - ISO datetime upper bound for upload date
 * @field filmedAfter - ISO datetime lower bound for filmed date
 * @field filmedBefore - ISO datetime upper bound for filmed date
 * @field limit - max results to return (default: 50)
 * @field offset - number of results to skip (default: 0)
 */
export const searchVideosSchema = z.object({
  q: z.string().optional(),
  uploadedAfter: z.iso.datetime().optional(),
  uploadedBefore: z.iso.datetime().optional(),
  filmedAfter: z.iso.datetime().optional(),
  filmedBefore: z.iso.datetime().optional(),
  limit: z.coerce.number().int().positive().optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

export type { VideoListItem } from "@shared/video.js";

/**
 * Validation schema for updating a video's S3 key (internal use only).
 *
 * @field s3Key - the new S3 object key
 */
export const updateS3KeySchema = z.object({
  s3Key: z.string().min(1, "s3Key is required"),
});

// Inferred types from the validation schemas for use in the service layer
export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
export type SearchVideosInput = z.infer<typeof searchVideosSchema>;
