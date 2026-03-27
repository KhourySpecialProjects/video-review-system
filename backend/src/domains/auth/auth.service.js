import crypto from "crypto";
import prisma from "../../lib/prisma.js";
import { auth } from "../../lib/auth.js";

// validation helpers
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }
}

function validateActivationInput({ token, name, email, password }) {
  if (!token || typeof token !== "string") {
    throw new Error("Token is required");
  }
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Name is required");
  }
  validateEmail(email);
  if (!password || typeof password !== "string" || password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
}

// create a new invitation
// validates email format and role
// generate a secure random token, stores SHA-256 hask in database
// sets a 24 hour expiry
// returns token for dev testing, in production ID is returned
export async function createInvite({ email, role }) {
  validateEmail(email);

  const validRoles = [
    "CAREGIVER",
    "CLINICAL_REVIEWER",
    "SITE_COORDINATOR",
    "SYSADMIN",
  ];
  if (!validRoles.includes(role)) {
    throw new Error("Invalid role");
  }

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
export async function activateInvite({ token, name, email, password }) {
  validateActivationInput({ token, name, email, password });

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
