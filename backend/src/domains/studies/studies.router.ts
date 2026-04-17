import { Router } from "express";
import prisma from "../../lib/prisma.js";
import { requireSession } from "../../middleware/auth.js";
import { listStudiesForSite } from "./studies.service.js";

const router = Router();

router.use(requireSession);

/**
 * GET /domain/studies/mine - list the studies the current user can upload
 * to. Scoped to the caller's home site via the SiteStudy junction.
 *
 * Every site has an auto-seeded "Miscellaneous" study, so the returned
 * list is never empty for a correctly provisioned site.
 *
 * @returns 200 with `{ studies: [{ id, name }, ...] }`
 */
router.get("/mine", async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
        where: { id: req.authSession.user.id },
        select: { siteId: true },
    });
    const studies = await listStudiesForSite(user.siteId);
    res.json({ studies });
});

export default router;
