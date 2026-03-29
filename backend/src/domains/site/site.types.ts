import { z } from "zod";

export const createSiteSchema = z.object({
  name: z.string().min(1, "Site name is required"),
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
