import { Router } from "express";
import { requireSession, requireRole } from "../../middleware/auth.js";
import { requireAuditActorContext } from "../../middleware/audit.js";
import { createSiteSchema } from "./sites.types.js";
import { createSiteWithMiscellaneousStudy } from "./sites.service.js";

const router = Router();

router.use(requireSession);

/**
 * @description POST /domain/sites - create a new site. Sysadmin-only.
 *
 * Creates the Site record and its per-site "Miscellaneous" study in one
 * transaction so every site is guaranteed to have a default study uploads
 * can fall back to.
 */
router.post("/",
  requireRole("SYSADMIN"),
  async (req, res) => {
    const data = createSiteSchema.parse(req.body);
    const result = await createSiteWithMiscellaneousStudy(data, requireAuditActorContext(req));
    res.status(201).json(result);
  }
);

export default router;
