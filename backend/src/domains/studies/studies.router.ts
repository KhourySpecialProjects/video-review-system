import { Router } from "express";
import prisma from "../../lib/prisma.js";
import { requireSession, requireRole } from "../../middleware/auth.js";
import { requireAuditActorContext } from "../../middleware/audit.js";
import { AppError } from "../../middleware/errors.js";
import { listStudiesForSite, createStudy } from "./studies.service.js";
import { createStudySchema } from "./studies.types.js";

const router = Router();

router.use(requireSession);

/**
 * @description GET /domain/studies/mine - list the studies the current user can
 * upload to. Scoped to the caller's home site via the SiteStudy junction.
 */
router.get("/mine", async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
        where: { id: req.authSession.user.id },
        select: { siteId: true },
    });
    const studies = await listStudiesForSite(user.siteId);
    res.json({ studies });
});

/**
 * @description POST /domain/studies - create a new study and link it to a site.
 * SYSADMIN: can create for any site.
 * SITE_COORDINATOR: can only create for their own site.
 */
router.post("/",
  requireRole("SYSADMIN", "SITE_COORDINATOR"),
  async (req, res) => {
    const data = createStudySchema.parse(req.body);

    if (req.authSession.user.role === "SITE_COORDINATOR" && req.authSession.user.siteId !== data.siteId) {
      throw AppError.forbidden("Site coordinators can only create studies for their own site.");
    }

    const study = await createStudy(data, requireAuditActorContext(req));
    res.status(201).json(study);
  }
);

export default router;
