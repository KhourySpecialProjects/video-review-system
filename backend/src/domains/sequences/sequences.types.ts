import { z } from "zod";

// ────────────────────────────────────────────────────────────
// SEQUENCE SCHEMAS
// ────────────────────────────────────────────────────────────

/**
 * Validation schema for creating a new stitched sequence.
 * A sequence is an ordered collection of clips from a source video.
 * The authenticated user's ID is set server-side as createdByUserId.
 *
 * @field studyId - uuid of the study this sequence belongs to
 * @field siteId - uuid of the site this sequence belongs to
 * @field videoId - uuid of the source video this sequence is based on
 * @field title - descriptive name for the sequence
 */
export const createSequenceSchema = z.object({
  studyId: z.uuid("Invalid study ID"),
  siteId: z.uuid("Invalid site ID"),
  videoId: z.uuid("Invalid video ID"),
  title: z.string().min(1, "Title is required"),
});

/**
 * Validation schema for adding a clip to a sequence.
 * Each clip is assigned a play order position within the sequence.
 *
 * @field clipId - uuid of the video clip to add
 * @field playOrder - position of this clip in the sequence (1-based), must be positive
 */
export const addClipToSequenceSchema = z.object({
  clipId: z.uuid("Invalid clip ID"),
  playOrder: z.number().int().positive("Play order must be a positive integer"),
});

/**
 * Validation schema for reordering clips within a sequence.
 * Accepts a full list of clip positions to allow bulk reordering.
 * Each item maps a clip to its new position.
 *
 * @field items - array of { clipId, playOrder } defining the new ordering
 */
export const reorderSequenceSchema = z.object({
  items: z
    .array(
      z.object({
        clipId: z.uuid("Invalid clip ID"),
        playOrder: z.number().int().positive("Play order must be a positive integer"),
      })
    )
    .min(1, "At least one item is required"),
});

/** Input type for creating a sequence, inferred from createSequenceSchema */
export type CreateSequenceInput = z.infer<typeof createSequenceSchema>;

/** Input type for adding a clip to a sequence, inferred from addClipToSequenceSchema */
export type AddClipToSequenceInput = z.infer<typeof addClipToSequenceSchema>;

/** Input type for reordering clips in a sequence, inferred from reorderSequenceSchema */
export type ReorderSequenceInput = z.infer<typeof reorderSequenceSchema>;