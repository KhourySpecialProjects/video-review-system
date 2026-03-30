import { Router } from "express";
import { AppError } from "../../middleware/errors.js";
import { auth } from "../../lib/auth.js";
import prisma from "../../lib/prisma.js";
import { createAccount } from "./accounts.service.js";

const router = Router();

/**
 * Middleware that restricts a route to SYSADMIN users only.
 * Reads the session from Better Auth and checks the user's role.
 *
 * @throws {AppError} 401 if no valid session exists
 * @throws {AppError} 403 if the user is not a SYSADMIN
 */
async function requireSysadmin(req: any, res: any, next: any) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) throw AppError.unauthorized();

  const roles = await prisma.userRole.findMany({
    where: { userId: session.user.id },
  });

  if (!roles.some((r: any) => r.role === "SYSADMIN")) {
    throw AppError.forbidden();
  }
  next();
}

/**
 * POST /accounts
 * Creates a user account for any role via invitation email.
 * Role is passed as a query parameter.
 * For SITE_COORDINATOR role, siteId must be included in the request body.
 * Restricted to SYSADMIN only.
 *
 * @query {string} role - One of CAREGIVER, CLINICAL_REVIEWER, SITE_COORDINATOR, SYSADMIN
 * @body {string} email
 * @body {string} [siteId] - Required when role is SITE_COORDINATOR
 * @returns {object} { id, token? }
 */
router.post("/", requireSysadmin, async (req, res) => {
  const role = req.query.role as string;
  const result = await createAccount({ ...req.body, role });
  res.json(result);
});

export default router;