import prisma from "../../lib/prisma.js";
import { createInvite } from "../auth/auth.service.js";
import { AppError } from "../../middleware/errors.js";
import {
  createAccountSchema,
  createSiteCoordinatorSchema,
  type CreateAccountInput,
  type CreateSiteCoordinatorInput,
} from "./accounts.types.js";

/**
 * Creates a caregiver account by sending an invitation email.
 *
 * @param input - { email: string }
 * @returns The invitation ID and token (non-production only)
 * @throws {ZodError} If input validation fails
 */
export async function createCaregiverAccount(input: CreateAccountInput) {
  const { email } = createAccountSchema.parse(input);
  return await createInvite({ email, role: "CAREGIVER" });
}

/**
 * Creates a clinical reviewer account by sending an invitation email.
 *
 * @param input - { email: string }
 * @returns The invitation ID and token (non-production only)
 * @throws {ZodError} If input validation fails
 */
export async function createClinicalReviewerAccount(input: CreateAccountInput) {
  const { email } = createAccountSchema.parse(input);
  return await createInvite({ email, role: "CLINICAL_REVIEWER" });
}

/**
 * Creates a site coordinator account by sending an invitation email.
 * Validates that the provided siteId exists before creating the invite.
 *
 * @param input - { email: string, siteId: string }
 * @returns The invitation ID and token (non-production only)
 * @throws {ZodError} If input validation fails
 * @throws {AppError} 404 If the site does not exist
 */
export async function createSiteCoordinatorAccount(input: CreateSiteCoordinatorInput) {
  const { email, siteId } = createSiteCoordinatorSchema.parse(input);

  // verify site exists before creating invite
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) {
    throw AppError.notFound("Site not found");
  }

  return await createInvite({ email, role: "SITE_COORDINATOR" });
}

/**
 * Creates a system admin account by sending an invitation email.
 *
 * @param input - { email: string }
 * @returns The invitation ID and token (non-production only)
 * @throws {ZodError} If input validation fails
 */
export async function createSysadminAccount(input: CreateAccountInput) {
  const { email } = createAccountSchema.parse(input);
  return await createInvite({ email, role: "SYSADMIN" });
}