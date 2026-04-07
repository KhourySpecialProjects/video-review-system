import { z } from "zod";
import { Prisma } from "../../generated/prisma";

/**
 * Zod schemas for annotation request validation.
 * Payload is flexible JSONB whose shape depends on the annotation type:
 *   - text_comment:     { "text": "Patient smiled here" }
 *   - drawing_box:      { "x": 10, "y": 20, "width": 100, "height": 50 }
 *   - freehand_drawing: { "points": [[0,0], [10,5], [20,15]] }
 * @module annotations.types
 */


/**
 * validation schema for creating a new annotation
 *
 * @field videoId - UUID of the video to annotate (required)
 * @field authorUserId - UUID of the user creating the annotation (required)
 * @field studyId - UUID of the associated study (required)
 * @field siteId - UUID of the associated site (required)
 * @field type - annotation type (text_comment, drawing_box, drawing_circle, freehand_drawing or tag) (required)
 * @field timestampSeconds - position in the video in seconds, must be non-negative (required)
 * @field durationSeconds - how long the annotation spans in seconds (required, must be positive)
 * @field payload - JSON object with type-specific data
 */
export const createAnnotationSchema = z.object({
  videoId: z.uuid(),
  authorUserId: z.uuid(),
  studyId: z.uuid(),
  siteId: z.uuid(),
  type: z.enum(["text_comment", "drawing_box", "drawing_circle", "freehand_drawing", "tag"]),
  timestampSeconds: z.number().int().min(0, "timestampSeconds cannot be negative"),
  durationSeconds: z.number().int().positive(),
  payload: z.record(z.string(), z.unknown()), // accepts any JSON object
});

/**
 * validation schema for updating an existing annotation
 * all fields are optional — only include what needs to change
 *
 * @field timestampSeconds - updated position in seconds
 * @field durationSeconds - updated duration in seconds
 * @field payload - updated JSON payload
 */
export const updateAnnotationSchema = z.object({
  timestampSeconds: z.number().int().min(0),
  durationSeconds: z.number().int().positive(),
  payload: z.record(z.string(), z.unknown()),
});

/**
 * Service-layer params for creating an annotation.
 * Uses Prisma.JsonValue for payload to match the database column type.
 */
export interface CreateAnnotationParams {
  videoId: string;
  authorUserId: string;
  studyId: string;
  siteId: string;
  type: "text_comment" | "drawing_box" | "drawing_circle" | "freehand_drawing" | "tag";
  timestampSeconds: number;
  durationSeconds: number;
  payload?: Prisma.InputJsonValue;
}


/**
 * Service-layer params for updating an annotation.
 * Uses Prisma.JsonValue for payload to match the database column type.
 */
export interface UpdateAnnotationParams {
  timestampSeconds: number;
  durationSeconds: number;
  payload?: Prisma.InputJsonValue;
}

// Inferred types from the validation schemas for use in the service layer
export type CreateAnnotationInput = z.infer<typeof createAnnotationSchema>;
export type UpdateAnnotationInput = z.infer<typeof updateAnnotationSchema>;