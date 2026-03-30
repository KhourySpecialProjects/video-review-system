import { z } from "zod";

/**
 * validation schema for creating a new video
 * only includes fields the client is allowed to send
 *
 * @field patientId - uuid of the associated patient (required)
 * @field durationSeconds - (optional) video length in seconds, must be positive
 * @field takenAt - (optional) ISO 8601 datetime string of when the video was recorded
 */
export const createVideoSchema = z.object({
  patientId: z.uuid("patient_id must be a valid UUID"),
  durationSeconds: z.number().int().positive().optional(),
  takenAt: z.iso.datetime().optional(),
});

/**
 * validation schema for updating an existing video
 * all fields are optional — only include what needs to change
 *
 * @field status - new processing status (UPLOADING, PROCESSING, READY, or FAILED)
 * @field durationSeconds - updated video length in seconds
 * @field takenAt - updated ISO 8601 recording timestamp
 */
export const updateVideoSchema = z.object({
  status: z.enum(["UPLOADING", "PROCESSING", "READY", "FAILED"]).optional(),
  durationSeconds: z.number().int().positive().optional(),
  takenAt: z.iso.datetime().optional(),
});

// Inferred types from the validation schemas for use in the service layer
export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;

