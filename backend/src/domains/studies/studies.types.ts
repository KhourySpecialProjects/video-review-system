import { z } from "zod";

/**
 * @description Validation schema for creating a new study.
 *
 * @field name - The study's display name
 * @field siteId - The site to attach the study to
 */
export const createStudySchema = z.object({
  name: z.string().min(1, "Study name is required"),
  siteId: z.uuid("Invalid site ID"),
});

export type CreateStudyInput = z.infer<typeof createStudySchema>;
