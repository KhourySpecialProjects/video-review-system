import { Router } from "express";
import prisma from "../../lib/prisma.js";
import { requireSession } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import {
  createUserPermission,
  deleteUserPermission,
  getUserDetail,
  getManageableSiteIds,
  getUserPermission,
  getUserSiteContext,
  listUserPermissions,
  listUsers,
  resolvePermissionScopeAccess,
  updateUserStatus,
} from "./users.service.js";
import {
  createUserPermissionSchema,
  listUsersQuerySchema,
  updateUserStatusSchema,
} from "./users.types.js";

const router = Router();

router.use(requireSession);

/**
 * Loads the authenticated user from the database.
 *
 * @param actorUserId - Authenticated user ID from the session.
 * @returns Minimal actor record for authorization.
 * @throws {AppError} If the actor cannot be loaded.
 */
async function getActor(actorUserId: string) {
  // Load authorization data from the database so role/site checks use the
  // current persisted values for the authenticated actor.
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: {
      id: true,
      role: true,
      siteId: true,
    },
  });

  if (!actor) {
    throw AppError.unauthorized();
  }

  return actor;
}

/**
 * Returns every site a coordinator may manage.
 *
 * @param actor - Authenticated actor record.
 * @returns Unique site IDs the coordinator can administer.
 */
async function getCoordinatorManageableSiteIds(actor: {
  id: string;
  role: string;
  siteId: string;
}) {
  if (actor.role !== "SITE_COORDINATOR") {
    return [];
  }

  return getManageableSiteIds(actor.id, actor.siteId);
}

/**
 * Ensures the actor can use the user-management routes in this router.
 *
 * @param actor - Authenticated actor record.
 * @throws {AppError} If the actor is not a sysadmin or site coordinator.
 */
function assertUserManagementActor(actor: {
  role: string;
}) {
  if (actor.role !== "SYSADMIN" && actor.role !== "SITE_COORDINATOR") {
    throw AppError.forbidden();
  }
}

/**
 * GET /domain/users - list users with optional filters and pagination.
 */
router.get("/", async (req, res) => {
  const actor = await getActor(req.authSession.user.id);
  const parsed = listUsersQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw AppError.badRequest(parsed.error.issues[0].message);
  }

  assertUserManagementActor(actor);

  const manageableSiteIds = await getCoordinatorManageableSiteIds(actor);

  if (
    actor.role === "SITE_COORDINATOR" &&
    parsed.data.siteId !== undefined &&
    !manageableSiteIds.includes(parsed.data.siteId)
  ) {
    // Coordinators can only list sites they administer.
    throw AppError.forbidden();
  }

  const result = await listUsers(
    parsed.data,
    actor.role === "SITE_COORDINATOR"
      ? (parsed.data.siteId ? [parsed.data.siteId] : manageableSiteIds)
      : undefined,
  );

  res.json(result);
});

/**
 * GET /domain/users/:userId - fetch one user and their current permissions.
 */
router.get("/:userId", async (req, res) => {
  const actor = await getActor(req.authSession.user.id);

  assertUserManagementActor(actor);

  const user = await getUserDetail(req.params.userId);
  const manageableSiteIds = await getCoordinatorManageableSiteIds(actor);

  if (
    actor.role === "SITE_COORDINATOR" &&
    !manageableSiteIds.includes(user.siteId)
  ) {
    // Coordinators may only view details for users in sites they administer.
    throw AppError.forbidden();
  }

  res.json(user);
});

/**
 * GET /domain/users/:userId/permissions - list one user's current permissions.
 */
router.get("/:userId/permissions", async (req, res) => {
  const actor = await getActor(req.authSession.user.id);

  assertUserManagementActor(actor);

  const targetUser = await getUserSiteContext(req.params.userId);
  const manageableSiteIds = await getCoordinatorManageableSiteIds(actor);

  if (
    actor.role === "SITE_COORDINATOR" &&
    !manageableSiteIds.includes(targetUser.siteId)
  ) {
    throw AppError.forbidden();
  }

  const result = await listUserPermissions(req.params.userId);
  res.json(result);
});

/**
 * POST /domain/users/:userId/permissions - create one explicit user permission.
 */
router.post("/:userId/permissions", async (req, res) => {
  const actor = await getActor(req.authSession.user.id);

  assertUserManagementActor(actor);

  const targetUser = await getUserSiteContext(req.params.userId);
  const manageableSiteIds = await getCoordinatorManageableSiteIds(actor);

  if (
    actor.role === "SITE_COORDINATOR" &&
    !manageableSiteIds.includes(targetUser.siteId)
  ) {
    throw AppError.forbidden();
  }

  const rawBody =
    typeof req.body === "object" && req.body !== null ? req.body : {};

  // Coordinator-created permissions default to the managed user's site when the
  // request does not explicitly choose a site scope.
  const normalizedSiteId =
    actor.role === "SITE_COORDINATOR" &&
    (rawBody.siteId === undefined || rawBody.siteId === null)
      ? targetUser.siteId
      : rawBody.siteId ?? null;

  const parsed = createUserPermissionSchema.safeParse({
    permissionLevel: rawBody.permissionLevel,
    siteId: normalizedSiteId,
    studyId: rawBody.studyId ?? null,
    videoId: rawBody.videoId ?? null,
  });

  if (!parsed.success) {
    throw AppError.badRequest(parsed.error.issues[0].message);
  }

  const scopeAccess = await resolvePermissionScopeAccess(parsed.data);

  if (
    actor.role === "SITE_COORDINATOR" &&
    (
      scopeAccess.isGlobal ||
      scopeAccess.siteIds.some((siteId) => !manageableSiteIds.includes(siteId))
    )
  ) {
    // Coordinators may only assign permissions within the sites they administer.
    throw AppError.forbidden("Site coordinator cannot assign permissions outside their managed sites");
  }

  const userPermission = await createUserPermission(req.params.userId, parsed.data);
  res.status(201).json(userPermission);
});

/**
 * DELETE /domain/users/:userId/permissions/:permissionId - remove one explicit user permission.
 */
router.delete("/:userId/permissions/:permissionId", async (req, res) => {
  const actor = await getActor(req.authSession.user.id);

  assertUserManagementActor(actor);

  const targetUser = await getUserSiteContext(req.params.userId);
  const manageableSiteIds = await getCoordinatorManageableSiteIds(actor);

  if (
    actor.role === "SITE_COORDINATOR" &&
    !manageableSiteIds.includes(targetUser.siteId)
  ) {
    throw AppError.forbidden();
  }

  const userPermission = await getUserPermission(
    req.params.userId,
    req.params.permissionId,
  );

  if (actor.role === "SITE_COORDINATOR") {
    const scopeAccess = await resolvePermissionScopeAccess(userPermission);

    if (
      scopeAccess.isGlobal ||
      scopeAccess.siteIds.some((siteId) => !manageableSiteIds.includes(siteId))
    ) {
      // Coordinators may only remove permissions within the sites they administer.
      throw AppError.forbidden("Site coordinator cannot remove permissions outside their managed sites");
    }
  }

  await deleteUserPermission(req.params.userId, req.params.permissionId);
  res.status(204).send();
});

/**
 * PATCH /domain/users/:userId/status - deactivate or reactivate one user.
 */
router.patch("/:userId/status", async (req, res) => {
  const actor = await getActor(req.authSession.user.id);

  assertUserManagementActor(actor);

  const parsed = updateUserStatusSchema.safeParse({
    isDeactivated: req.body.isDeactivated,
  });

  if (!parsed.success) {
    throw AppError.badRequest(parsed.error.issues[0].message);
  }

  const targetUser = await getUserSiteContext(req.params.userId);
  const manageableSiteIds = await getCoordinatorManageableSiteIds(actor);

  if (
    actor.role === "SITE_COORDINATOR" &&
    !manageableSiteIds.includes(targetUser.siteId)
  ) {
    throw AppError.forbidden();
  }

  const result = await updateUserStatus(req.params.userId, parsed.data);
  res.json(result);
});

export default router;
