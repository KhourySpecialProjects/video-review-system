import crypto from "crypto";
import prisma from "../../lib/prisma.js";
import { auth } from "../../lib/auth.js";
import { recordAudit } from "../audit/audit.service.js";
import {
  buildInvitationSnapshot,
  buildUserSnapshot,
} from "../audit/audit.snapshots.js";
import type { AuthenticatedAuditContext } from "../audit/audit.types.js";
import { AppError } from "../../middleware/errors.js";
import {
  createInviteSchema,
  activateInviteSchema,
  type CreateInviteInput,
  type ActivateInviteInput,
} from "./auth.types.js";
import { sendInviteEmail } from "../../lib/ses.js";
import { logger } from "../../lib/logger.js";

/**
 * Invitation lifetime. 5 days — long enough for a tester to share the signup
 * link out-of-band (industry norm is 3–7 days; GitHub/GitLab use 7).
 */
const INVITE_TTL_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * Creates a new user invitation.
 *
 * Generates a secure random token and stores its SHA-256 hash in the database.
 * The invitation expires after 5 days.
 *
 * @param input - The invitation details (email and role)
 * @returns The invitation ID, timestamps, and the raw signup token
 * @throws {ZodError} If input validation fails
 * @throws {Error} If database operation fails
 */
export async function createInvite(
  input: CreateInviteInput,
  audit?: AuthenticatedAuditContext,
) {
  // Zod parse validates and returns typed data (throws on invalid input)
  const { email, role, siteId } = createInviteSchema.parse(input);

  const normalizedEmail = email.toLowerCase().trim();

  // generate secure token and hash it for storage
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const invitation = await prisma.$transaction(async (tx) => {
    const created = await tx.invitation.create({
      data: {
        email: normalizedEmail,
        role,
        siteId,
        tokenHash,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        createdBy: audit?.actorUserId ?? "system",
      },
    });

    if (audit) {
      await recordAudit(tx, {
        actorUserId: audit.actorUserId,
        actionType: "CREATE",
        entityType: "INVITATION",
        entityId: created.id,
        siteId,
        oldValues: {},
        newValues: buildInvitationSnapshot(created),
        ipAddress: audit.ipAddress,
      });
    }

    return created;
  });

  await sendInviteEmail(normalizedEmail, token);

  logger.info(
    { event: "auth.invite.created", role, siteId, actorUserId: audit?.actorUserId },
    "invite created",
  );

  return {
    id: invitation.id,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    // Returned in all environments so the inviter can copy/share the signup
    // link directly from the UI. The invitee still sets a password on
    // activation, and the token is single-use and expires in INVITE_TTL_MS.
    token,
  };
}

/**
 * Activates an invitation and creates the user account.
 *
 * Uses an atomic updateMany to claim the invite, preventing race conditions.
 * Creates user, account, and userRole records in a single transaction.
 * Password is hashed using Better Auth's built-in hasher.
 *
 * @param input - The activation details (token, name, email, password)
 * @returns Success message prompting user to sign in
 * @throws {ZodError} If input validation fails
 * @throws {AppError} 400 "Invalid or expired invitation" if token is invalid/expired/already used
 * @throws {AppError} 409 "Email already registered" if email exists in the system
 */
export async function activateInvite(input: ActivateInviteInput) {
  // Zod parse validates and returns typed data (throws on invalid input)
  const { token, name, email, password } = activateInviteSchema.parse(input);

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const normalizedEmail = email.toLowerCase().trim();

  return await prisma.$transaction(async (tx) => {
    // atomic claim
    // updateMany returns count so we can check if token was valid
    const claimed = await tx.invitation.updateMany({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    if (claimed.count === 0) {
      throw AppError.badRequest("Invalid or expired invitation");
    }

    // get the invitation to read the role
    const invitation = await tx.invitation.findFirst({ where: { tokenHash } });

    // stop if the invitation cannot be loaded after claiming
    // return expected invite error
    if (!invitation) {
      throw AppError.badRequest("Invalid or expired invitation");
    }

    // check if email is already registered
    const existingUser = await tx.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      throw AppError.conflict("Email already registered");
    }

    // hash password using Better Auth's password helper
    const ctx = await auth.$context;
    const hashedPassword = await ctx.password.hash(password);

    // create user, account, and role
    const userId = crypto.randomUUID();

    await tx.user.create({
      data: {
        id: userId,
        name,
        email: normalizedEmail,
        emailVerified: false,
        role: invitation.role,
        siteId: invitation.siteId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await tx.account.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        accountId: userId,
        providerId: "credential",
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // system admins get a global ADMIN permission with all scopes null
    if (invitation.role === "SYSADMIN") {
      await tx.userPermission.create({
        data: {
          userId,
          studyId: null,
          siteId: null,
          videoId: null,
          permissionLevel: "ADMIN",
        },
      });
    } else if (invitation.role === "SITE_COORDINATOR") {
      await tx.userPermission.create({
        data: {
          userId,
          studyId: null,
          siteId: invitation.siteId,
          videoId: null,
          permissionLevel: "ADMIN",
        },
      });
    } else if (invitation.role === "CLINICAL_REVIEWER") {
      await tx.userPermission.create({
        data: {
          userId,
          studyId: null,
          siteId: invitation.siteId,
          videoId: null,
          permissionLevel: "WRITE",
        },
      });
    } else {
      const miscStudy = await tx.study.findFirst({
        where: {
          name: "Miscellaneous",
          siteStudies: { some: { siteId: invitation.siteId } },
        },
        select: { id: true },
      });

      if (!miscStudy) {
        throw AppError.badRequest("Miscellaneous study not found");
      }

      await tx.caregiverPatient.create({
        data: {
          studyId: miscStudy.id,
          userId,
        },
      });
    }

    await recordAudit(tx, {
      actorUserId: userId,
      actionType: "CREATE",
      entityType: "USER",
      entityId: userId,
      siteId: invitation.siteId,
      oldValues: {},
      newValues: buildUserSnapshot({
        id: userId,
        email: normalizedEmail,
        role: invitation.role,
        siteId: invitation.siteId,
        isDeactivated: false,
      }),
      ipAddress: null,
    });

    logger.info({ event: "auth.invite.activated", userId }, "invite activated");

    return { success: true, message: "Account created. Please sign in." };
  });
}
