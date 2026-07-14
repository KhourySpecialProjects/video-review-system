import { Router } from "express";
import {
  requireSession,
  denyCaregiver,
  requirePermissionContext,
  requirePermission,
} from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { resolvePermissionLevel } from "../../lib/permissions.js";
import {
  listReviewsForUser,
  getReviewStatus,
  updateReviewStatus,
} from "./reviews.service.js";
import { reviewsQuerySchema, updateReviewStatusSchema } from "./reviews.types.js";

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

/**
 * @description GET /domain/reviews/:videoId/:studyId/:siteId/status - current
 * review status + the caller's resolved permission level for this video-study.
 *
 * @returns 200 { reviewStatus, permissionLevel }
 * @returns 403 if the caller has no permission on this specific video-study
 * @returns 404 if the video-study link does not exist
 */
router.get("/:videoId/:studyId/:siteId/status",
  requirePermissionContext("READ"),
  async (req, res) => {
    const videoId = req.params.videoId as string;
    const studyId = req.params.studyId as string;
    const siteId = req.params.siteId as string;
    const level = resolvePermissionLevel(req.permissionContext!.rows, { studyId, siteId, videoId });
    if (!level) throw AppError.forbidden();
    const reviewStatus = await getReviewStatus(studyId, videoId, siteId);
    res.json({ reviewStatus, permissionLevel: level });
  }
);

/**
 * @description PATCH /domain/reviews/:videoId/:studyId/:siteId/status - transition
 * the review status. Requires WRITE on the video-study; enforces the
 * adjacent-only state machine in the service.
 *
 * @returns 200 { reviewStatus }
 * @returns 400 on invalid body or illegal transition
 * @returns 403 without WRITE permission
 * @returns 404 if the video-study link does not exist
 */
router.patch("/:videoId/:studyId/:siteId/status",
  requirePermission("WRITE", (req) => [
    {
      studyId: req.params.studyId as string,
      siteId: req.params.siteId as string,
      videoId: req.params.videoId as string,
    },
  ]),
  async (req, res) => {
    const { reviewStatus } = updateReviewStatusSchema.parse(req.body);
    const videoId = req.params.videoId as string;
    const studyId = req.params.studyId as string;
    const siteId = req.params.siteId as string;
    const updated = await updateReviewStatus(studyId, videoId, siteId, reviewStatus);
    res.json({ reviewStatus: updated });
  }
);

export default router;
