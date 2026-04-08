import { z } from "zod";

/**
 * Schema for creating any user account.
 * Uses a discriminated union to enforce that siteId is required
 * for SITE_COORDINATOR and forbidden for all other roles.
 */
export const createAccountWithRoleSchema = z.discriminatedUnion("role", [
  z.object({
    email: z.email("Invalid email format"),
    role: z.literal("SITE_COORDINATOR"),
    siteId: z.uuid("Invalid site ID format"),
  }),
  z.object({
    email: z.email("Invalid email format"),
    role: z.enum(["CAREGIVER", "CLINICAL_REVIEWER", "SYSADMIN"]),
    siteId: z.uuid(),
  }),
]);

/**
 * Input type for creating an account with a role.
 */
export type CreateAccountWithRoleInput = z.infer<typeof createAccountWithRoleSchema>;