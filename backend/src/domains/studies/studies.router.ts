import { Router } from "express";
import prisma from "../../lib/prisma.js";
import {
  requireSession,
  requireRole,
  requirePermissionContext,
  requireCaregiverOwnership,
  getSiteIdsFromContext,
} from "../../middleware/auth.js";
import { requireAuditActorContext } from "../../middleware/audit.js";
import { AppError } from "../../middleware/errors.js";
import {
  listStudiesForSite,
  listAllStudies,
  createStudy,
  createStudyWithEnrollment,
  getCaregiversForSites,
  updateStudy,
  getEligibleUsersForStudy,
  addUsersToStudy,
  removeUserFromStudy,
} from "./studies.service.js";
import {
  createStudySchema,
  createStudyWithEnrollmentSchema,
  listStudiesQuerySchema,
  updateStudySchema,
  addStudyUsersSchema,
} from "./studies.types.js";

const router = Router();

router.use(requireSession);

/**
 * @description GET /domain/studies — list all studies with optional filters
 * and pagination. Coordinators see only studies linked to sites they have
 * ADMIN permission on.
 */
router.get(
  "/",
  requireRole("SYSADMIN", "SITE_COORDINATOR"),
  requirePermissionContext("ADMIN"),
  async (req, res) => {
    const query = listStudiesQuerySchema.parse(req.query);
    const siteRestrictions = getSiteIdsFromContext(req.permissionContext!);

    const result = await listAllStudies(query, siteRestrictions);
    res.json(result);
  },
);

/**
 * @description GET /domain/studies/mine — list the studies the current user
 * can upload to. Scoped to the caller's home site via the SiteStudy junction.
 * Caregivers access their own site's studies through ownership verification.
 */
router.get(
  "/mine",
  requireCaregiverOwnership(async (req) => req.authSession.user.id),
  async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.authSession.user.id },
      select: { siteId: true },
    });
    const studies = await listStudiesForSite(user.siteId);
    res.json({ studies });
  },
);

/**
 * @description POST /domain/studies — create a new study and link it to a site.
 * SYSADMIN: can create for any site.
 * SITE_COORDINATOR: can only create for their own site.
 */
router.post(
  "/",
  requireRole("SYSADMIN", "SITE_COORDINATOR"),
  async (req, res) => {
    const data = createStudySchema.parse(req.body);

    if (
      req.authSession.user.role === "SITE_COORDINATOR" &&
      req.authSession.user.siteId !== data.siteId
    ) {
      throw AppError.forbidden(
        "Site coordinators can only create studies for their own site.",
      );
    }

    const study = await createStudy(data, requireAuditActorContext(req));
    res.status(201).json(study);
  },
);

/**
 * @description POST /domain/studies/with-enrollment — create a study
 * linked to multiple sites with optional caregiver enrollment. Used
 * by the admin create-study dialog.
 */
router.post(
  "/with-enrollment",
  requireRole("SYSADMIN", "SITE_COORDINATOR"),
  requirePermissionContext("ADMIN"),
  async (req, res) => {
    const data = createStudyWithEnrollmentSchema.parse(req.body);

    const siteRestrictions = getSiteIdsFromContext(req.permissionContext!);
    if (siteRestrictions) {
      const unauthorized = data.siteIds.filter(
        (id) => !siteRestrictions.includes(id),
      );
      if (unauthorized.length > 0) {
        throw AppError.forbidden(
          "You do not have admin access to one or more selected sites.",
        );
      }
    }

    const study = await createStudyWithEnrollment(
      data,
      requireAuditActorContext(req),
    );
    res.status(201).json(study);
  },
);

/**
 * @description GET /domain/studies/caregivers-for-sites — list caregivers
 * at the specified sites. Used by the create-study dialog to populate
 * the caregiver picker based on selected sites. Accepts a comma-separated
 * siteIds query param.
 */
router.get(
  "/caregivers-for-sites",
  requireRole("SYSADMIN", "SITE_COORDINATOR"),
  requirePermissionContext("ADMIN"),
  async (req, res) => {
    const siteIdsParam = req.query.siteIds;
    if (!siteIdsParam || typeof siteIdsParam !== "string") {
      throw AppError.badRequest("siteIds query param is required");
    }

    const siteIds = siteIdsParam.split(",").filter(Boolean);
    if (siteIds.length === 0) {
      throw AppError.badRequest("At least one siteId is required");
    }

    const result = await getCaregiversForSites(siteIds);
    res.json(result);
  },
);

/**
 * @description PATCH /domain/studies/:studyId — update a study's name
 * and/or status. Requires ADMIN permission.
 */
router.patch(
  "/:studyId",
  requireRole("SYSADMIN", "SITE_COORDINATOR"),
  requirePermissionContext("ADMIN"),
  async (req, res) => {
    const { studyId } = req.params as { studyId: string };
    const data = updateStudySchema.parse(req.body);
    const result = await updateStudy(studyId, data);
    res.json(result);
  },
);

/**
 * @description GET /domain/studies/:studyId/eligible-users — list
 * caregivers whose site is linked to this study but who are not yet
 * enrolled. Only caregivers can be added to studies.
 */
router.get(
  "/:studyId/eligible-users",
  requireRole("SYSADMIN", "SITE_COORDINATOR"),
  requirePermissionContext("ADMIN"),
  async (req, res) => {
    const { studyId } = req.params as { studyId: string };
    const users = await getEligibleUsersForStudy(studyId);
    res.json({ users });
  },
);

/**
 * @description POST /domain/studies/:studyId/users — add caregivers
 * to a study by creating CaregiverPatient junction records. Duplicates
 * are silently skipped.
 */
router.post(
  "/:studyId/users",
  requireRole("SYSADMIN", "SITE_COORDINATOR"),
  requirePermissionContext("ADMIN"),
  async (req, res) => {
    const { studyId } = req.params as { studyId: string };
    const data = addStudyUsersSchema.parse(req.body);
    const result = await addUsersToStudy(studyId, data);
    res.status(201).json(result);
  },
);

/**
 * @description DELETE /domain/studies/:studyId/users/:userId — remove
 * a caregiver from a study by deleting the CaregiverPatient record.
 */
router.delete(
  "/:studyId/users/:userId",
  requireRole("SYSADMIN", "SITE_COORDINATOR"),
  requirePermissionContext("ADMIN"),
  async (req, res) => {
    const { studyId, userId } = req.params as { studyId: string; userId: string };
    await removeUserFromStudy(studyId, userId);
    res.status(204).send();
  },
);

export default router;
