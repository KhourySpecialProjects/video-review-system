import { z } from "zod";

// payload is flexible JSONB — its shape depends on the annotation type.
// For example:
//   text_comment:     { "text": "Patient smiled here" }
//   drawing_box:      { "x": 10, "y": 20, "width": 100, "height": 50 }
//   freehand_drawing: { "points": [[0,0], [10,5], [20,15]] }

export const createAnnotationSchema = z.object({
  type: z.enum(["text_comment", "drawing_box", "freehand_drawing"]),
  timestampMs: z.number().int().min(0, "timestamp_ms cannot be negative"),
  durationMs: z.number().int().positive().optional(),
  payload: z.record(z.string(), z.unknown()).optional(), // accepts any JSON object
});

export const updateAnnotationSchema = z.object({
  timestampMs: z.number().int().min(0).optional(),
  durationMs: z.number().int().positive().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type CreateAnnotationInput = z.infer<typeof createAnnotationSchema>;
export type UpdateAnnotationInput = z.infer<typeof updateAnnotationSchema>;