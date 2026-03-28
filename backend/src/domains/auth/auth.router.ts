import { Router } from "express";
import { ZodError } from "zod";
import { createInvite, activateInvite } from "./auth.service.js";
import { createInviteSchema, activateInviteSchema } from "./auth.types.js";

const router = Router();

// create a new invitation for a user
// TODO: dev-only: admin-secret is a temporary bootstrap
// the problem is that only admins are able to create invites
// but we have no admins initially so we need to bootstrap the system with 1 admin
// Replace with authenticated admin route once real admins exist.
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

// activate an invitation and create the user account
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
