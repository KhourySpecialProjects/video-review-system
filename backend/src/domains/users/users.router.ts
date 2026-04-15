import { Router } from "express";
import prisma from "../../lib/prisma.js";
import { requireSession } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errors.js";
import { getUserDetail, listUsers } from "./users.service.js";
import { listUsersQuerySchema } from "./users.types.js";

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

export default router;
