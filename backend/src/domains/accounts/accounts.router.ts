import { Router } from "express";
import { AppError } from "../../middleware/errors.js";
import { auth } from "../../lib/auth.js";
import {
  createCaregiverAccount,
  createClinicalReviewerAccount,
  createSiteCoordinatorAccount,
  createSysadminAccount,
} from "./accounts.service.js";

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
  if (!session) {
    throw AppError.unauthorized();
  }

  const { user } = session;
  const roles = await import("../../lib/prisma.js").then((m) =>
    m.default.userRole.findMany({ where: { userId: user.id } })
  );

  const isSysadmin = roles.some((r: any) => r.role === "SYSADMIN");
  if (!isSysadmin) {
    throw AppError.forbidden();
  }

  next();
}

/**
 * POST /accounts/caregivers
 * Creates a caregiver account via invitation email.
 * Restricted to SYSADMIN only.
 *
 * @body {string} email
 * @returns {object} { id, token? }
 */
router.post("/caregivers", requireSysadmin, async (req, res) => {
  const result = await createCaregiverAccount(req.body);
  res.json(result);
});

/**
 * POST /accounts/clinical-reviewers
 * Creates a clinical reviewer account via invitation email.
 * Restricted to SYSADMIN only.
 *
 * @body {string} email
 * @returns {object} { id, token? }
 */
router.post("/clinical-reviewers", requireSysadmin, async (req, res) => {
  const result = await createClinicalReviewerAccount(req.body);
  res.json(result);
});

/**
 * POST /accounts/site-coordinators
 * Creates a site coordinator account via invitation email.
 * Requires a valid siteId. Restricted to SYSADMIN only.
 *
 * @body {string} email
 * @body {string} siteId - UUID of the site to associate the coordinator with
 * @returns {object} { id, token? }
 */
router.post("/site-coordinators", requireSysadmin, async (req, res) => {
  const result = await createSiteCoordinatorAccount(req.body);
  res.json(result);
});

/**
 * POST /accounts/admins
 * Creates a new SYSADMIN account via invitation email.
 * Restricted to SYSADMIN only.
 *
 * @body {string} email
 * @returns {object} { id, token? }
 */
router.post("/admins", requireSysadmin, async (req, res) => {
  const result = await createSysadminAccount(req.body);
  res.json(result);
});

export default router;