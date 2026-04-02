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
 * @field type - annotation type (text_comment, drawing_box, or freehand_drawing)
 * @field timestampMs - position in the video in ms, must be non-negative
 * @field durationMs - (optional) how long the annotation spans in ms
 * @field payload - (optional) JSON object with type-specific data
 */
export const createAnnotationSchema = z.object({
  videoId: z.uuid(),
  type: z.enum(["text_comment", "drawing_box", "freehand_drawing"]),
  timestampMs: z.number().int().min(0, "timestamp_ms cannot be negative"),
  durationMs: z.number().int().positive(),
  payload: z.record(z.string(), z.unknown()), // accepts any JSON object
});

/**
 * validation schema for updating an existing annotation
 * all fields are optional — only include what needs to change
 *
 * @field timestampMs - updated position in ms
 * @field durationMs - updated duration in ms
 * @field payload - updated JSON payload
 */
export const updateAnnotationSchema = z.object({
  timestampMs: z.number().int().min(0),
  durationMs: z.number().int().positive(),
  payload: z.record(z.string(), z.unknown()),
});

// Inferred types from the validation schemas for use in the service layer
export type CreateAnnotationInput = z.infer<typeof createAnnotationSchema>;
export type UpdateAnnotationInput = z.infer<typeof updateAnnotationSchema>;

/**
 * Service-layer params for creating an annotation.
 * Uses Prisma.JsonValue for payload to match the database column type.
 */
export interface CreateAnnotationParams {
  videoId: string;
  authorUserId: string;
  type: "text_comment" | "drawing_box" | "freehand_drawing";
  timestampMs: number;
  durationMs?: number;
  payload?: Prisma.JsonValue;
}


/**
 * Service-layer params for updating an annotation.
 * Uses Prisma.JsonValue for payload to match the database column type.
 */
export interface UpdateAnnotationParams {
  timestampMs?: number;
  durationMs?: number;
  payload?: Prisma.JsonValue;
}