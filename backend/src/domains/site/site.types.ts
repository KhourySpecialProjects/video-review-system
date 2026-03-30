import { z } from "zod";
import type { Site, Video } from "../../generated/prisma/client.js";
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

/**
 * Zod schema for getting a list of sites.
 * Allows optional filtering by userId.
 */
export const getSitesSchema = z.object({
  userId: z.string().optional(),
});

/**
 * Input type for getting sites.
 * Inferred from getSitesSchema.
 */
export type GetSitesInput = z.infer<typeof getSitesSchema>;

/**
 * Type representing a site that includes its aggregated statistics and flattened videos array.
 */
export type SiteWithVideosAndStats = Site & {
  videos: Video[];
  patientCount: number;
  studyCount: number;
  userCount: number;
};
