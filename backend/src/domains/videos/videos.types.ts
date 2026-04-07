import { z } from "zod";

/**
 * validation schema for creating a new video
 * only includes fields the client is allowed to send
 *
 * @field patientId - uuid of the associated patient 
 * @field videoName - original filename for reference 
 * @field durationSeconds - video length in seconds, must be positive
 * @field createdAt - when the video record was created, must be a valid ISO datetime string
 * @field takenAt - (optional) ISO 8601 datetime string of when the video was recorded
 * @field contentType - MIME type of the uploaded file, must be video/mp4 for now
 */
export const createVideoSchema = z.object({
  patientId: z.uuid("patient_id must be a valid UUID"),
  videoName: z.string().min(1, "videoName is required"),
  durationSeconds: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  takenAt: z.iso.datetime(),
  contentType: z.enum(["video/mp4"], {//, "video/webm", "video/quicktime"], {
    message: "contentType must be video/mp4",//, video/webm, or video/quicktime",
  }),
});

/**
 * validation schema for updating a video's metadata or status
 * all fields are optional — only include what needs to change
 * 
 * @field status - new processing status
 * @field durationSeconds - updated video length in seconds, must be positive
 * @field takenAt - updated timestamp of when the video was recorded, must be a valid ISO datetime string
 */
export const updateVideoSchema = z.object({
    status: z.enum(["UPLOADING", "PROCESSING", "READY", "FAILED"]).optional(),
    durationSeconds: z.number().int().positive().optional(),
    takenAt: z.iso.datetime().optional(),
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

// Inferred types from the validation schemas for use in the service layer
export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;

