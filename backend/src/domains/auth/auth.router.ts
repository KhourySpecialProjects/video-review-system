import { Router } from "express";
import { ZodError } from "zod";
import { createInvite, activateInvite } from "./auth.service.js";
import { createInviteSchema, activateInviteSchema } from "./auth.types.js";

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
 * @returns {object} 400 - { error: string } on validation or service error
 * @returns {object} 401 - { error: "Unauthorized" } if admin-secret invalid
 *
 * @todo Replace admin-secret with authenticated admin route once real admins exist
 */
router.post("/invite", async (req, res) => {
  const adminSecret = req.headers["admin-secret"];
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Parse and validate request body at the HTTP boundary
    const input = createInviteSchema.parse(req.body);
    const result = await createInvite(input);
    return res.json(result);
  } catch (err: unknown) {
    // ZodError = validation failed, return structured error details
    if (err instanceof ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    // Other errors (e.g., database errors from service)
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Unknown error" });
  }
});

/**
 * POST /activate - Activate an invitation and create user account
 *
 * @body {ActivateInviteInput} - { token: string, name: string, email: string, password: string }
 *
 * @returns {object} 200 - { success: true, message: string }
 * @returns {object} 400 - { error: string } on validation, expired token, or duplicate email
 */
router.post("/activate", async (req, res) => {
  try {
    // Parse and validate request body at the HTTP boundary
    const input = activateInviteSchema.parse(req.body);
    const result = await activateInvite(input);
    return res.json(result);
  } catch (err: unknown) {
    // ZodError = validation failed, return structured error details
    if (err instanceof ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    // Other errors (e.g., database errors from service)
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Unknown error" });
  }
});

export default router;
