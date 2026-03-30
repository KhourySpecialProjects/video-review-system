import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/errors.js";

/**
 * Retrieves all users in the system with their roles.
 * For use by system admins only.
 *
 * @returns Array of all users with their associated roles
 */
export async function getAllUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { userRoles: true },
  });
  return users;
}

/**
 * Retrieves a single user by their ID with their roles.
 * For use by system admins only.
 *
 * @param id - The user's ID
 * @returns The user with their associated roles
 * @throws {AppError} 404 if the user does not exist
 */
export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { userRoles: true },
  });
  if (!user) {
    throw AppError.notFound("User not found");
  }
  return user;
}

/**
 * Retrieves all users belonging to a specific site with their roles.
 * For use by system admins or site coordinators for their own site.
 *
 * @param siteId - The site's UUID
 * @returns Array of users associated with the site
 * @throws {AppError} 404 if the site does not exist
 */
export async function getUsersBySite(siteId: string) {
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) {
    throw AppError.notFound("Site not found");
  }

  const users = await prisma.user.findMany({
    where: {
      userPermissions: {
        some: { resourceId: siteId, resourceType: "SITE" },
      },
    },
    include: { userRoles: true },
    orderBy: { createdAt: "desc" },
  });
  return users;
}

/**
 * Deletes a user by their ID.
 * For use by system admins only.
 *
 * @param id - The user's ID
 * @returns Success message
 * @throws {AppError} 404 if the user does not exist
 */
export async function deleteUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw AppError.notFound("User not found");
  }
  await prisma.user.delete({ where: { id } });
  return { success: true, message: "User deleted successfully" };
}