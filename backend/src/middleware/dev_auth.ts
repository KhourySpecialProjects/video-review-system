import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "./errors.js";
import type { AuthenticatedUser } from "./auth.js";

/**
 * DEV-ONLY middleware that bypasses better-auth session validation
 * and instead looks up a user by the `X-Dev-User-Id` header.
 *
 * This allows testing authorization logic in Postman without needing
 * a real session cookie. Set the header to any seeded user ID:
 *   - "user-caregiver-01"    (Alice, CAREGIVER)
 *   - "user-reviewer-01"     (Bob, CLINICAL_REVIEWER)
 *   - "user-coordinator-01"  (Carol, SITE_COORDINATOR)
 *   - "user-sysadmin-01"     (Dan, SYSADMIN)
 *
 * ⚠️  DO NOT use in production. Gate this behind NODE_ENV !== "production".
 *
 * @param req - Express request object (reads X-Dev-User-Id header)
 * @param _res - Express response object (unused)
 * @param next - Express next function
 *
 * @returns void — calls next() on success
 *
 * @throws {AppError} 401 if header is missing or user not found
 */
export async function devAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.headers["x-dev-user-id"] as string | undefined;

  if (!userId) {
    throw AppError.unauthorized("Missing X-Dev-User-Id header (dev auth)");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, siteId: true, isDeactivated: true },
  });

  if (!user || user.isDeactivated) {
    throw AppError.unauthorized("Dev user not found or deactivated");
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    siteId: user.siteId,
  };

  next();
}