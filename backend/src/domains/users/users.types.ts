import { z } from "zod";

/**
 * Schema for validating a UUID path parameter.
 * Used for endpoints that accept a user ID or site ID in the URL.
 *
 * @property {string} id - Must be a valid UUID
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

/**
 * Input type for endpoints that take a UUID path parameter.
 */
export type UuidParam = z.infer<typeof uuidParamSchema>;