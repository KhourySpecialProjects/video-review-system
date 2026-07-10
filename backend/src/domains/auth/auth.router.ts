import { Router } from "express";
import { createInvite, activateInvite } from "./auth.service.js";
import { createInviteSchema, activateInviteSchema } from "./auth.types.js";
import { AppError } from "../../middleware/errors.js";
import {
  requireSession,
  requireRole,
  requirePermissionContext,
  getSiteIdsFromContext,
} from "../../middleware/auth.js";
import { requireAuditActorContext } from "../../middleware/audit.js";

/**
 * Auth router for invitation-based user registration.
 * Handles invite creation (admin-only) and account activation (public).
 */
const router = Router();

/**
 * POST /invite - Create a new user invitation (admin-only)
 *
 * @header admin-secret - Required. Must match ADMIN_SECRET env var.
 * @body {CreateInviteInput} - { email: string, role: Role }
 *
 * @returns {object} 200 - { id: string, createdAt: string, expiresAt: string, token?: string }
 * @throws {AppError} 400 - { error: string } on validation or service error
 * @throws {AppError} 401 - { error: "Unauthorized" } if admin-secret invalid
 *
 * @todo Replace admin-secret with authenticated admin route once real admins exist
 */
router.post(
  "/invite",
  requireSession,
  requireRole("SYSADMIN", "SITE_COORDINATOR"),
  requirePermissionContext("ADMIN"),
  async (req, res) => {
    const input = createInviteSchema.parse(req.body);
    const { role: actorRole } = req.authSession.user;

    if (actorRole === "SITE_COORDINATOR") {
      if (input.role !== "CAREGIVER" && input.role !== "CLINICAL_REVIEWER") {
        throw AppError.forbidden(
          "Site coordinators can only invite caregivers and clinical reviewers.",
        );
      }

      const siteRestrictions = getSiteIdsFromContext(req.permissionContext!);
      if (siteRestrictions && !siteRestrictions.includes(input.siteId)) {
        throw AppError.forbidden(
          "You do not have admin access to the selected site.",
        );
      }
    }

    const result = await createInvite(input, requireAuditActorContext(req));
    res.json(result);
  },
);

/**
 * POST /activate - Activate an invitation and create user account
 *
 * @body {ActivateInviteInput} - { token: string, name: string, email: string, password: string }
 *
 * @returns {object} 200 - { success: true, message: string }
 * @throws {AppError} 400 - { error: string } on validation, expired token, or duplicate email
 */
router.post("/activate", async (req, res) => {
  // Parse and validate request body at the HTTP boundary
  // Throws ZodError on failure — caught by errorHandler
  const input = activateInviteSchema.parse(req.body);
  const result = await activateInvite(input);
  res.json(result);
});

export default router;
