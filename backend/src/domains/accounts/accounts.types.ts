import { z } from "zod";
import { roleSchema } from "../auth/auth.types.js";

/**
 * Schema for creating any user account.
 * Used by all four account creation endpoints.
 *
 * @property {string} email - Must be a valid email format
 */
export const createAccountSchema = z.object({
  email: z.string().email("Invalid email format"),
});

/**
 * Schema for creating a site coordinator account.
 * Extends base account schema with a required siteId.
 *
 * @property {string} email - Must be a valid email format
 * @property {string} siteId - UUID of the site to associate the coordinator with
 */
export const createSiteCoordinatorSchema = z.object({
  email: z.string().email("Invalid email format"),
  siteId: z.string().uuid("Invalid site ID format"),
});

/**
 * Input type for creating a standard account (caregiver, clinical reviewer, sysadmin).
 */
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

/**
 * Input type for creating a site coordinator account.
 */
export type CreateSiteCoordinatorInput = z.infer<typeof createSiteCoordinatorSchema>;