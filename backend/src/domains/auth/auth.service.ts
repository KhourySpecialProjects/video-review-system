import crypto from "crypto";
import prisma from "../../lib/prisma.js";
import { auth } from "../../lib/auth.js";
import { AppError } from "../../middleware/errors.js";
import {
  createInviteSchema,
  activateInviteSchema,
  type CreateInviteInput,
  type ActivateInviteInput,
} from "./auth.types.js";
import { sendInviteEmail } from "../../lib/ses.js";

/**
 * Creates a new user invitation.
 *
 * Generates a secure random token and stores its SHA-256 hash in the database.
 * The invitation expires after 24 hours.
 *
 * @param input - The invitation details (email and role)
 * @returns The invitation ID, and token in non-production environments
 * @throws {ZodError} If input validation fails
 * @throws {Error} If database operation fails
 */
export async function createInvite(input: CreateInviteInput) {
  // Zod parse validates and returns typed data (throws on invalid input)
  const { email, role, siteId } = createInviteSchema.parse(input);

  const normalizedEmail = email.toLowerCase().trim();

  // generate secure token and hash it for storage
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const invitation = await prisma.invitation.create({
    data: {
      email: normalizedEmail,
      role,
      siteId,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      // TODO: dev-only: using placeholder until we have authenticated admin routes
      createdBy: "system",
    },
  });

  await sendInviteEmail(normalizedEmail, token);

  return {
    id: invitation.id,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    // in dev, also return token in response for API testing convenience
    ...(process.env.NODE_ENV !== "production" && { token }),
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

    return { success: true, message: "Account created. Please sign in." };
  });
}
