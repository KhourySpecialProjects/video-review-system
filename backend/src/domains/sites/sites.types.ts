import { z } from "zod";

/**
 * @description Validation schema for `POST /domain/sites`.
 * @field name - Human-readable site name (required, non-empty).
 */
export const createSiteSchema = z.object({
    name: z.string().min(1, "Site name is required"),
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
