import { z } from "zod";

/**
 * @description Validation schema for the admin chart query params.
 *
 * @field tab - Which tab's chart data to return.
 * @field months - How many months of history to include.
 */
export const adminChartQuerySchema = z.object({
  tab: z.enum(["users", "sites", "studies", "audits"]),
  months: z.coerce.number().int().positive().optional().default(6),
});

export type AdminChartQuery = z.infer<typeof adminChartQuerySchema>;
