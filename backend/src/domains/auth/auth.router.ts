import { Router } from "express";
import { createInvite, activateInvite } from "./auth.service.js";
import { createInviteSchema, activateInviteSchema } from "./auth.types.js";
import { AppError } from "../../middleware/errors.js";

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
 * @returns {object} 200 - { id: string, token?: string }
 * @throws {AppError} 400 - { error: string } on validation or service error
 * @throws {AppError} 401 - { error: "Unauthorized" } if admin-secret invalid
 *
 * @todo Replace admin-secret with authenticated admin route once real admins exist
 */
router.post("/invite", async (req, res) => {
  const configuredAdminSecret = process.env.ADMIN_SECRET;
  const adminSecret = req.headers["admin-secret"];

  // Fail if the admin secret is missing
  if (!configuredAdminSecret || adminSecret !== configuredAdminSecret) {
    throw AppError.unauthorized();
  }

  // Parse and validate request body at the HTTP boundary
  // Throws ZodError on failure — caught by errorHandler
  const input = createInviteSchema.parse(req.body);
  const result = await createInvite(input);
  res.json(result);
});

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
