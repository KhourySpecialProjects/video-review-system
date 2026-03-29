import { z } from "zod";

/**
 * Zod schema for site creation requests.
 *
 * @property {string} name - The name of the site (trimmed, min 1 character)
 *
 * @example
 * createSiteSchema.parse({
 *   name: "Main Site"
 * });
 */
export const createSiteSchema = z.object({
  name: z.string().trim().min(1, "Site name is required"),
});

/**
 * Input type for creating a site.
 * Inferred from createSiteSchema.
 */
export type CreateSiteInput = z.infer<typeof createSiteSchema>;
