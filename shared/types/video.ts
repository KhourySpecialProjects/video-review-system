import { z } from "zod";

/** Possible statuses for a video in the system. */
export const videoStatusSchema = z.enum(["UPLOADING", "UPLOADED", "FAILED"]);

/** Video record as stored in the database (Prisma shape). */
export const videoSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  uploadedByUserId: z.string(),
  s3Key: z.string(),
  s3UploadId: z.string().nullable(),
  status: videoStatusSchema,
  fileSize: z.number(),
  totalParts: z.number().int(),
  durationSeconds: z.number().int(),
  createdAt: z.string(),
  takenAt: z.string().nullable(),
});

/** Response from GET /domain/videos/:id/upload-status */
export const uploadStatusResponseSchema = z.object({
  video: videoSchema,
  uploadedParts: z.array(
    z.object({
      partNumber: z.number().int(),
      etag: z.string(),
      size: z.number(),
    })
  ),
  remainingParts: z.array(
    z.object({
      partNumber: z.number().int(),
      url: z.string(),
    })
  ),
  bytesUploaded: z.number(),
  partSize: z.number(),
  totalParts: z.number().int(),
  expiresIn: z.number(),
});

/** Summarized info for an incomplete upload shown in the dashboard. */
export const incompleteUploadSchema = z.object({
  videoId: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  bytesUploaded: z.number(),
  totalParts: z.number().int(),
  uploadedPartCount: z.number().int(),
  createdAt: z.string(),
});

export type VideoStatus = z.infer<typeof videoStatusSchema>;
export type Video = z.infer<typeof videoSchema>;
export type UploadStatusResponse = z.infer<typeof uploadStatusResponseSchema>;
export type IncompleteUpload = z.infer<typeof incompleteUploadSchema>;
