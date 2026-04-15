import { Router } from "express";
import prisma from "../../lib/prisma.js";
import { requireSession } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import {
  createUserPermission,
  deleteUserPermission,
  getUserDetail,
  getUserPermission,
  getUserSiteContext,
  listUserPermissions,
  listUsers,
  resolvePermissionScopeAccess,
} from "./users.service.js";
import { createUserPermissionSchema, listUsersQuerySchema } from "./users.types.js";

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
 * GET /domain/users - list users with optional filters and pagination.
 */
router.get("/", async (req, res) => {
  const actor = await getActor(req.authSession.user.id);
  const parsed = listUsersQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw AppError.badRequest(parsed.error.issues[0].message);
  }

  if (actor.role !== "SYSADMIN" && actor.role !== "SITE_COORDINATOR") {
    throw AppError.forbidden();
  }

  if (
    actor.role === "SITE_COORDINATOR" &&
    parsed.data.siteId !== undefined &&
    parsed.data.siteId !== actor.siteId
  ) {
    // Coordinators are local admins only, so they cannot request another
    // site's user list through the optional siteId filter.
    throw AppError.forbidden();
  }

  const result = await listUsers(
    parsed.data,
    // Even without a siteId filter, coordinators must only see users from
    // their own site.
    actor.role === "SITE_COORDINATOR" ? actor.siteId : undefined,
  );

  res.json(result);
});

/**
 * GET /domain/users/:userId - fetch one user and their current permissions.
 */
router.get("/:userId", async (req, res) => {
  const actor = await getActor(req.authSession.user.id);

  if (actor.role !== "SYSADMIN" && actor.role !== "SITE_COORDINATOR") {
    throw AppError.forbidden();
  }

  const user = await getUserDetail(req.params.userId);

  if (actor.role === "SITE_COORDINATOR" && user.siteId !== actor.siteId) {
    // Coordinators may only view details for users in their own site.
    throw AppError.forbidden();
  }

  res.json(user);
});

/**
 * GET /domain/users/:userId/permissions - list one user's current permissions.
 */
router.get("/:userId/permissions", async (req, res) => {
  const actor = await getActor(req.authSession.user.id);

  if (actor.role !== "SYSADMIN" && actor.role !== "SITE_COORDINATOR") {
    throw AppError.forbidden();
  }

  const targetUser = await getUserSiteContext(req.params.userId);

  if (actor.role === "SITE_COORDINATOR" && targetUser.siteId !== actor.siteId) {
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

  if (actor.role !== "SYSADMIN" && actor.role !== "SITE_COORDINATOR") {
    throw AppError.forbidden();
  }

  const targetUser = await getUserSiteContext(req.params.userId);

  if (actor.role === "SITE_COORDINATOR" && targetUser.siteId !== actor.siteId) {
    throw AppError.forbidden();
  }

  // Coordinator-created permissions default to the managed user's site when the
  // request does not explicitly choose a site scope.
  const normalizedSiteId =
    actor.role === "SITE_COORDINATOR" && (req.body.siteId === undefined || req.body.siteId === null)
      ? targetUser.siteId
      : req.body.siteId ?? null;

  const parsed = createUserPermissionSchema.safeParse({
    permissionLevel: req.body.permissionLevel,
    siteId: normalizedSiteId,
    studyId: req.body.studyId ?? null,
    videoId: req.body.videoId ?? null,
  });

  if (!parsed.success) {
    throw AppError.badRequest(parsed.error.issues[0].message);
  }

  const scopeAccess = await resolvePermissionScopeAccess(parsed.data);

  if (
    actor.role === "SITE_COORDINATOR" &&
    (
      scopeAccess.isGlobal ||
      scopeAccess.siteIds.some((siteId) => siteId !== actor.siteId)
    )
  ) {
    // Coordinators may only assign permissions that stay entirely within their own site.
    throw AppError.forbidden("Site coordinator cannot assign permissions outside their own site");
  }

  const userPermission = await createUserPermission(req.params.userId, parsed.data);
  res.status(201).json(userPermission);
});

/**
 * DELETE /domain/users/:userId/permissions/:permissionId - remove one explicit user permission.
 */
router.delete("/:userId/permissions/:permissionId", async (req, res) => {
  const actor = await getActor(req.authSession.user.id);

  if (actor.role !== "SYSADMIN" && actor.role !== "SITE_COORDINATOR") {
    throw AppError.forbidden();
  }

  const targetUser = await getUserSiteContext(req.params.userId);

  if (actor.role === "SITE_COORDINATOR" && targetUser.siteId !== actor.siteId) {
    throw AppError.forbidden();
  }

  const userPermission = await getUserPermission(
    req.params.userId,
    req.params.permissionId,
  );
  const scopeAccess = await resolvePermissionScopeAccess(userPermission);

  if (
    actor.role === "SITE_COORDINATOR" &&
    (
      scopeAccess.isGlobal ||
      scopeAccess.siteIds.some((siteId) => siteId !== actor.siteId)
    )
  ) {
    // Coordinators may only remove permissions that stay entirely within their own site.
    throw AppError.forbidden("Site coordinator cannot remove permissions outside their own site");
  }

  await deleteUserPermission(req.params.userId, req.params.permissionId);
  res.status(204).send();
});

export default router;
