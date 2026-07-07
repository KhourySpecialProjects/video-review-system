import { Router } from "express";
import {
  requireSession,
  requireRole,
  requirePermissionContext,
  getSiteIdsFromContext,
} from "../../middleware/auth.js";
import { listAuditLogsQuerySchema } from "./audit.types.js";
import { listAuditLogs } from "./audit.service.js";

const router = Router();

router.use(requireSession);
router.use(requireRole("SYSADMIN", "SITE_COORDINATOR"));
router.use(requirePermissionContext("ADMIN"));

/**
 * @description GET /domain/audit — list audit logs with optional filters
 * and pagination. Coordinators see only logs for sites they have ADMIN
 * permission on.
 */
router.get("/", async (req, res) => {
  const query = listAuditLogsQuerySchema.parse(req.query);
  const siteRestrictions = getSiteIdsFromContext(req.permissionContext!);

  const result = await listAuditLogs(query, siteRestrictions);
  res.json(result);
});

export default router;
