import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/errors.js";
import { auth } from "../../lib/auth.js";
import prisma from "../../lib/prisma.js";
import { createAccount } from "./accounts.service.js";

const router = Router();

/**
 * Middleware that restricts a route to SYSADMIN users only.
 *
 * @throws {AppError} 401 if no valid session exists
 * @throws {AppError} 403 if the user is not a SYSADMIN
 */
async function requireSysadmin(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) throw AppError.unauthorized();

  const roles = await prisma.userRole.findMany({
    where: { userId: session.user.id },
  });

  if (!roles.some((r) => r.role === "SYSADMIN")) {
    throw AppError.forbidden();
  }
  next();
}

/**
 * POST /accounts
 * Creates a user account for any role via invitation email.
 * All fields including role must be in the request body.
 * For SITE_COORDINATOR role, siteId must be included in the request body.
 * Restricted to SYSADMIN only.
 *
 * @body {string} email
 * @body {string} role - One of CAREGIVER, CLINICAL_REVIEWER, SITE_COORDINATOR, SYSADMIN
 * @body {string} [siteId] - Required when role is SITE_COORDINATOR
 * @returns {object} { id, token? }
 */
router.post("/", requireSysadmin, async (req: Request, res: Response) => {
  const result = await createAccount(req.body);
  res.json(result);
});

export default router;