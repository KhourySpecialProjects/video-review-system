import prisma from "../../lib/prisma.js";
import { createInvite } from "../auth/auth.service.js";
import { AppError } from "../../middleware/errors.js";
import { createAccountWithRoleSchema, type CreateAccountWithRoleInput } from "./accounts.types.js";
import type { Role } from "../auth/auth.types.js";
import { z } from "zod";

/**
 * Schema for creating an account with a role.
 */

/**
 * Creates a user account for any role by sending an invitation email.
 * For SITE_COORDINATOR role, a valid siteId is required.
 *
 * @param input - { email: string, role: Role, siteId?: string }
 * @returns The invitation ID and token (non-production only)
 * @throws {ZodError} If input validation fails
 * @throws {AppError} 400 if siteId is missing for SITE_COORDINATOR role
 * @throws {AppError} 404 if siteId does not match an existing site
 */
export async function createAccount(input: CreateAccountWithRoleInput) {
  const { email, role, siteId } = createAccountWithRoleSchema.parse(input);

if (role === "SITE_COORDINATOR") {
    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (!site) {
      throw AppError.notFound("Site not found");
    }
  }

  return await createInvite({ email, role, siteId });
}