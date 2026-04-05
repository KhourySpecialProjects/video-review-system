// zod catches request validation errors and formats them in a consistent way
import { z } from "zod";

// only need what the client can send, not all video fields
export const createVideoSchema = z.object({
  patientId: z.uuid("patient_id must be a valid UUID"),
  durationSeconds: z.number().int().positive().optional(),
  takenAt: z.iso.datetime().optional(),
});

export const updateVideoSchema = z
  .object({
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

// these can be used in your service layer for type-safe parameters.
export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
