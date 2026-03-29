import { z } from "zod";

export const createSiteSchema = z.object({
  name: z.string().trim().min(1, "Site name is required"),
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
