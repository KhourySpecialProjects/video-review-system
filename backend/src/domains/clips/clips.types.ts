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