import { z } from "zod";

/**
 * Zod schema for valid user roles in the system.
 * This is the single source of truth for role validation.
 *
 * @example
 * roleSchema.parse("CAREGIVER"); // OK
 * roleSchema.parse("INVALID");   // throws ZodError
 */
export const roleSchema = z.enum([
  "CAREGIVER",
  "CLINICAL_REVIEWER",
  "SITE_COORDINATOR",
  "SYSADMIN",
]);

/**
 * Zod schema for invite creation requests.
 *
 * @property {string} email - Must be a valid email format (RFC 5322)
 * @property {Role} role - Must be one of the valid roles from roleSchema
 *
 * @example
 * createInviteSchema.parse({
 *   email: "user@example.com",
 *   role: "CAREGIVER"
 * });
 */
export const createInviteSchema = z.object({
  email: z.string().email("Invalid email format"),
  role: roleSchema,
});

/**
 * Zod schema for account activation requests.
 *
 * @property {string} token - The invitation token (min 1 character)
 * @property {string} name - User's display name (trimmed, min 1 character)
 * @property {string} email - Must be a valid email format
 * @property {string} password - Must be at least 8 characters
 *
 * @example
 * activateInviteSchema.parse({
 *   token: "abc123...",
 *   name: "John Doe",
 *   email: "john@example.com",
 *   password: "securepassword"
 * });
 */
export const activateInviteSchema = z.object({
  token: z.string().min(1, "Token is required"),
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Valid user roles in the system.
 * Inferred from roleSchema to keep types in sync with validation.
 */
export type Role = z.infer<typeof roleSchema>;

/**
 * Input type for creating an invitation.
 * Inferred from createInviteSchema.
 */
export type CreateInviteInput = z.infer<typeof createInviteSchema>;

/**
 * Input type for activating an invitation.
 * Inferred from activateInviteSchema.
 */
export type ActivateInviteInput = z.infer<typeof activateInviteSchema>;
