import { Router } from "express";
import { requireSession, denyCaregiver, requirePermissionContext } from "../../middleware/auth.js";
import { listReviewsForUser } from "./reviews.service.js";
import { reviewsQuerySchema } from "./reviews.types.js";

const router = Router();

router.use(requireSession);
router.use(denyCaregiver);

/**
 * @description GET /domain/reviews - list video-review assignments for the current user.
 *
 * Visibility is scoped by the user's permission rows via requirePermissionContext.
 * All query params are optional; unknown params are ignored.
 *
 * @query search - free-text search across the caregiver privateTitle/privateNotes
 * @query study - filter by study name (exact)
 * @query site - filter by site name (exact)
 * @query status - one of "not reviewed" | "in review" | "reviewed"
 * @query dateFrom - ISO datetime lower bound for video.createdAt
 * @query dateTo - ISO datetime upper bound for video.createdAt
 * @query page - 1-indexed page number (default 1)
 * @query limit - page size (default 9, max 100)
 *
 * @returns 200 with { videos, totalCount, studies, sites }
 * @returns 400 on invalid query params
 */
router.get("/",
  requirePermissionContext("READ"),
  async (req, res) => {
    const data = reviewsQuerySchema.parse(req.query);
    const result = await listReviewsForUser(req.permissionContext!, data);
    res.json(result);
  }
);

export default router;
