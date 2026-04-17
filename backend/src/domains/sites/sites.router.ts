import { Router } from "express";
import { requireSession } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { createSiteSchema } from "./sites.types.js";
import { createSiteWithMiscellaneousStudy } from "./sites.service.js";

const router = Router();

router.use(requireSession);

/**
 * POST /domain/sites - create a new site.
 *
 * Creates the Site record and its per-site "Miscellaneous" study in one
 * transaction so every site is guaranteed to have a default study uploads
 * can fall back to. Sysadmin-only.
 *
 * @body name - The site's display name (required, non-empty).
 *
 * @returns 201 with `{ site, miscellaneousStudyId }`
 * @returns 400 if the body fails validation
 * @returns 403 if the caller is not a SYSADMIN
 */
router.post("/", async (req, res) => {
    if (req.authSession.user.role !== "SYSADMIN") {
        throw AppError.forbidden();
    }

    const parsed = createSiteSchema.safeParse(req.body);
    if (!parsed.success) {
        throw AppError.badRequest(parsed.error.issues[0].message);
    }

    const result = await createSiteWithMiscellaneousStudy(parsed.data);
    res.status(201).json(result);
});

export default router;
