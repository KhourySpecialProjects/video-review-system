import { z } from "zod";

// ============================================================
// ROLE SCHEMA
// ============================================================
// This Zod enum defines all valid roles in the system.
// By defining it here, we avoid hardcoding role strings in multiple places.
// z.enum() creates a schema that only accepts these exact string values.
export const roleSchema = z.enum([
  "CAREGIVER",
  "CLINICAL_REVIEWER",
  "SITE_COORDINATOR",
  "SYSADMIN",
]);

// ============================================================
// CREATE INVITE SCHEMA
// ============================================================
// Schema for validating invite creation requests.
// - email: Uses Zod's built-in email() validator which handles RFC 5322 validation
// - role: References roleSchema so we don't duplicate the valid roles list
export const createInviteSchema = z.object({
  email: z.string().email("Invalid email format"),
  role: roleSchema,
});

// ============================================================
// ACTIVATE INVITE SCHEMA
// ============================================================
// Schema for validating account activation requests.
// - token: Required string, must have at least 1 character
// - name: Required string, trimmed, must have at least 1 character after trimming
// - email: Uses the same email validation as createInviteSchema
// - password: Required string with minimum 8 characters for security
export const activateInviteSchema = z.object({
  token: z.string().min(1, "Token is required"),
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// ============================================================
// INFERRED TYPES
// ============================================================
// z.infer extracts the TypeScript type from a Zod schema.
// This means our types are always in sync with our validation logic.
// If we change the schema, the types update automatically.
export type Role = z.infer<typeof roleSchema>;
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type ActivateInviteInput = z.infer<typeof activateInviteSchema>;
