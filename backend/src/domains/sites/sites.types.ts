import { z } from "zod";

/**
 * @description Validation schema for `POST /domain/sites`.
 * @field name - Human-readable site name (required, non-empty).
 */
export const createSiteSchema = z.object({
    name: z.string().min(1, "Site name is required"),
});

/**
 * @description Validation schema for listing sites.
 *
 * @field name - Optional name filter (case-insensitive contains).
 * @field limit - Page size.
 * @field offset - Page offset.
 */
export const listSitesQuerySchema = z.object({
    name: z.string().optional(),
    limit: z.coerce.number().int().positive().optional().default(20),
    offset: z.coerce.number().int().nonnegative().optional().default(0),
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type ListSitesQuery = z.infer<typeof listSitesQuerySchema>;
