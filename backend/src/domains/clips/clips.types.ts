import { z } from "zod";

// ────────────────────────────────────────────────────────────
// CLIP SCHEMAS
// ────────────────────────────────────────────────────────────

/**
 * Validation schema for creating a new video clip from a source video.
 * The clip defines a time range (startTimeS to endTimeS) within the source video.
 * The authenticated user's ID is set server-side as createdByUserId.
 *
 * @field sourceVideoId - uuid of the video this clip is carved from
 * @field studyId - uuid of the study this clip belongs to
 * @field siteId - uuid of the site this clip belongs to
 * @field title - descriptive name for the clip
 * @field startTimeS - start time in seconds within the source video, must be non-negative
 * @field endTimeS - end time in seconds within the source video, must be positive
 */
export const createClipSchema = z
  .object({
    sourceVideoId: z.uuid("Invalid source video ID"),
    studyId: z.uuid("Invalid study ID"),
    siteId: z.uuid("Invalid site ID"),
    title: z.string().min(1, "Title is required"),
    startTimeS: z.number().int().nonnegative("Start time must be non-negative"),
    endTimeS: z.number().int().positive("End time must be positive"),
  })
  .refine((data) => data.endTimeS > data.startTimeS, {
    message: "End time must be after start time",
    path: ["endTimeS"],
  });

/** Input type for creating a clip, inferred from createClipSchema */
export type CreateClipInput = z.infer<typeof createClipSchema>;

/**
 * Validation schema for updating an existing video clip.
 * All fields are optional — only include what needs to change.
 *
 * @field title - updated descriptive name
 * @field startTimeS - updated start time in seconds
 * @field endTimeS - updated end time in seconds
 */
export const updateClipSchema = z
  .object({
    title: z.string().min(1, "Title is required").optional(),
    startTimeS: z.number().int().nonnegative("Start time must be non-negative").optional(),
    endTimeS: z.number().int().positive("End time must be positive").optional(),
  })
  .refine(
    (data) => {
      if (data.startTimeS !== undefined && data.endTimeS !== undefined) {
        return data.endTimeS > data.startTimeS;
      }
      return true;
    },
    { message: "End time must be after start time", path: ["endTimeS"] },
  );

/** Input type for updating a clip, inferred from updateClipSchema */
export type UpdateClipInput = z.infer<typeof updateClipSchema>;