import { Router } from "express";
import { AppError } from "../../middleware/errors.js";
import { auth } from "../../lib/auth.js";
import prisma from "../../lib/prisma.js";
import {
  getAllUsers,
  getUserById,
  getUsersBySite,
  deleteUser,
} from "./users.service.js";
import { uuidParamSchema } from "./users.types.js";

const router = Router();

/**
 * Middleware that restricts a route to SYSADMIN users only.
 *
 * @throws {AppError} 401 if no valid session exists
 * @throws {AppError} 403 if the user is not a SYSADMIN
 */
async function requireSysadmin(req: any, res: any, next: any) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) throw AppError.unauthorized();

  const roles = await prisma.userRole.findMany({
    where: { userId: session.user.id },
  });
  if (!roles.some((r: any) => r.role === "SYSADMIN")) {
    throw AppError.forbidden();
  }
  next();
}

/**
 * Middleware that restricts a route to SYSADMIN or SITE_COORDINATOR users only.
 * Attaches the session user to res.locals for use in the route handler.
 *
 * @throws {AppError} 401 if no valid session exists
 * @throws {AppError} 403 if the user is neither SYSADMIN nor SITE_COORDINATOR
 */
async function requireAdminOrCoordinator(req: any, res: any, next: any) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) throw AppError.unauthorized();

  const roles = await prisma.userRole.findMany({
    where: { userId: session.user.id },
  });

  const roleNames = roles.map((r: any) => r.role);
  if (!roleNames.includes("SYSADMIN") && !roleNames.includes("SITE_COORDINATOR")) {
    throw AppError.forbidden();
  }

  res.locals.userId = session.user.id;
  res.locals.roles = roleNames;
  next();
}

/**
 * GET /users
 * Returns all users in the system with their roles.
 * Restricted to SYSADMIN only.
 *
 * @returns {Array} List of all users with roles
 */
router.get("/", requireSysadmin, async (req, res) => {
  const users = await getAllUsers();
  res.json(users);
});

/**
 * GET /users/:id
 * Returns a single user by ID with their roles.
 * Restricted to SYSADMIN only.
 *
 * @param id - The user's ID
 * @returns {object} The user with roles
 * @throws {AppError} 400 if ID format is invalid
 * @throws {AppError} 404 if user not found
 */
router.get("/:id", requireSysadmin, async (req, res) => {
  const { id } = uuidParamSchema.parse(req.params);
  const user = await getUserById(id);
  res.json(user);
});

/**
 * GET /users/site/:id
 * Returns all users belonging to a specific site.
 * SYSADMIN can access any site. SITE_COORDINATOR can only access their own site.
 *
 * @param id - The site's UUID
 * @returns {Array} List of users in the site with roles
 * @throws {AppError} 400 if ID format is invalid
 * @throws {AppError} 403 if site coordinator tries to access another site
 * @throws {AppError} 404 if site not found
 */
router.get("/site/:id", requireAdminOrCoordinator, async (req, res) => {
  const { id } = uuidParamSchema.parse(req.params);
  const { userId, roles } = res.locals;

  // site coordinators can only access their own site
  if (!roles.includes("SYSADMIN")) {
    const hasAccess = await prisma.userPermission.findFirst({
      where: { userId, resourceId: id, resourceType: "SITE" },
    });
    if (!hasAccess) throw AppError.forbidden();
  }

  const users = await getUsersBySite(id);
  res.json(users);
});

/**
 * DELETE /users/:id
 * Deletes a user by ID.
 * Restricted to SYSADMIN only.
 *
 * @param id - The user's ID
 * @returns {object} { success: true, message: string }
 * @throws {AppError} 400 if ID format is invalid
 * @throws {AppError} 404 if user not found
 */
router.delete("/:id", requireSysadmin, async (req, res) => {
  const { id } = uuidParamSchema.parse(req.params);
  const result = await deleteUser(id);
  res.json(result);
});

export default router;