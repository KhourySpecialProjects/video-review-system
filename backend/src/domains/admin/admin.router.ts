import { Router } from "express";
import {
  requireSession,
  requireRole,
  requirePermissionContext,
  getSiteIdsFromContext,
} from "../../middleware/auth.js";
import { adminChartQuerySchema } from "./admin.types.js";
import { getAdminStats, getAdminChart } from "./admin.service.js";

const router = Router();

router.use(requireSession);
router.use(requireRole("SYSADMIN", "SITE_COORDINATOR"));
router.use(requirePermissionContext("ADMIN"));

/**
 * @description GET /domain/admin/stats — aggregate dashboard statistics.
 * All counts returned in one response so tab switches need no extra fetch.
 * Scoped by the user's ADMIN permission rows.
 */
router.get("/stats", async (req, res) => {
  const siteRestrictions = getSiteIdsFromContext(req.permissionContext!);

  const stats = await getAdminStats(siteRestrictions);
  res.json(stats);
});

/**
 * @description GET /domain/admin/chart — time-series chart data for the
 * given tab. Scoped by ADMIN permissions.
 */
router.get("/chart", async (req, res) => {
  const query = adminChartQuerySchema.parse(req.query);
  const siteRestrictions = getSiteIdsFromContext(req.permissionContext!);

  const chart = await getAdminChart(query, siteRestrictions);
  res.json(chart);
});

export default router;
