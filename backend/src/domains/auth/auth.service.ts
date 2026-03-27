import crypto from "crypto";
import prisma from "../../lib/prisma.js";
import { auth } from "../../lib/auth.js";
import {
  createInviteSchema,
  activateInviteSchema,
  type CreateInviteInput,
  type ActivateInviteInput,
} from "./auth.types.js";

// create a new invitation
// validates email format and role
// generate a secure random token, stores SHA-256 hash in database
// sets a 24 hour expiry
// returns token for dev testing, in production ID is returned
export async function createInvite(input: CreateInviteInput) {
  // Zod parse validates and returns typed data (throws on invalid input)
  const { email, role } = createInviteSchema.parse(input);

  const normalizedEmail = email.toLowerCase().trim();

  // generate secure token and hash it for storage
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const invitation = await prisma.invitation.create({
    data: {
      email: normalizedEmail,
      role,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      // TODO: dev-only: using placeholder until we have authenticated admin routes
      createdBy: "system",
    },
  });

  // TODO: dev-only: token returned in response for testing
  // in production, send token via email instead
  if (process.env.NODE_ENV !== "production") {
    console.log("[DEV-ONLY] Activation token:", token);
    return { id: invitation.id, token };
  }

  return { id: invitation.id };
}

// activate an invitation and create the user account
// validates all inputs (password min 8 characters)
// uses atomic updateMany to claim the invite to prevent race conditions
// hashes password uses Better Auth's built in hasher
// creates user, account, and userrole records in a transaction
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
      throw new Error("Invalid or expired invitation");
    }

    // get the invitation to read the role
    const invitation = await tx.invitation.findFirst({ where: { tokenHash } });

    // check if email is already registered
    const existingUser = await tx.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      throw new Error("Email already registered");
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

    await tx.userRole.create({
      data: { userId, role: invitation.role },
    });

    return { success: true, message: "Account created. Please sign in." };
  });
}
