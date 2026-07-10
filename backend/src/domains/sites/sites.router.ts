import { Router } from "express";
import {
  requireSession,
  requireRole,
  requirePermissionContext,
  getSiteIdsFromContext,
} from "../../middleware/auth.js";
import { requireAuditActorContext } from "../../middleware/audit.js";
import { AppError } from "../../middleware/errors.js";
import { createSiteSchema, listSitesQuerySchema } from "./sites.types.js";
import {
  createSiteWithMiscellaneousStudy,
  getSiteDetail,
  listSiteOptions,
  listSites,
  unlinkStudyFromSite,
} from "./sites.service.js";

const router = Router();

router.use(requireSession);
router.use(requireRole("SYSADMIN", "SITE_COORDINATOR"));
router.use(requirePermissionContext("ADMIN"));

/**
 * @description GET /domain/sites — list sites with optional name filter
 * and pagination. Scoped by the user's ADMIN permission rows.
 */
router.get("/", async (req, res) => {
  const query = listSitesQuerySchema.parse(req.query);
  const siteRestrictions = getSiteIdsFromContext(req.permissionContext!);

  const result = await listSites(query, siteRestrictions);
  res.json(result);
});

/**
 * @description GET /domain/sites/options — minimal site list for
 * dropdown selects. Scoped by ADMIN permissions.
 */
router.get("/options", async (req, res) => {
  const siteRestrictions = getSiteIdsFromContext(req.permissionContext!);

  const sites = await listSiteOptions(siteRestrictions);
  res.json({ sites });
});

/**
 * @description GET /domain/sites/:siteId — detailed site information
 * including users and studies. Requires ADMIN on the target site.
 */
router.get("/:siteId", async (req, res) => {
  const siteRestrictions = getSiteIdsFromContext(req.permissionContext!);

  if (siteRestrictions && !siteRestrictions.includes(req.params.siteId)) {
    throw AppError.forbidden();
  }

  const site = await getSiteDetail(req.params.siteId);
  res.json(site);
});

/**
 * @description DELETE /domain/sites/:siteId/studies/:studyId — unlink a
 * study from a site by removing the SiteStudy junction record. Does not
 * delete the study itself. Router-level middleware already ensures
 * SYSADMIN or SITE_COORDINATOR role and ADMIN permission context.
 */
router.delete("/:siteId/studies/:studyId", async (req, res) => {
  const siteRestrictions = getSiteIdsFromContext(req.permissionContext!);

  if (siteRestrictions && !siteRestrictions.includes(req.params.siteId)) {
    throw AppError.forbidden();
  }

  await unlinkStudyFromSite(req.params.siteId, req.params.studyId);
  res.status(204).send();
});

/**
 * @description POST /domain/sites — create a new site. Sysadmin-only.
 */
router.post(
  "/",
  requireRole("SYSADMIN"),
  async (req, res) => {
    const data = createSiteSchema.parse(req.body);
    const result = await createSiteWithMiscellaneousStudy(
      data,
      requireAuditActorContext(req),
    );
    res.status(201).json(result);
  },
);

export default router;
