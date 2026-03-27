import { Router } from "express";
import { createInvite, activateInvite } from "./auth.service.js";

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
    const result = await createInvite(req.body);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// activate an invitation and create the user account
router.post("/activate", async (req, res) => {
  try {
    const result = await activateInvite(req.body);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
