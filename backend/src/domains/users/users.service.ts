import type { Prisma } from "../../generated/prisma/index.js";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/errors.js";
import type { ListUsersQuery, ListUsersResponse, UserDetailResponse } from "./users.types.js";

const userListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  siteId: true,
  isDeactivated: true,
} as const;

const userDetailSelect = {
  ...userListSelect,
  userPermissions: {
    select: {
      id: true,
      userId: true,
      permissionLevel: true,
      siteId: true,
      studyId: true,
      videoId: true,
    },
  },
} as const;

/**
 * Lists users with optional filters and pagination.
 *
 * @param query - Parsed list query params.
 * @param siteRestriction - Optional site restriction applied for coordinators.
 * @returns Paginated list response.
 */
export async function listUsers(
  query: ListUsersQuery,
  siteRestriction?: string
): Promise<ListUsersResponse> {
  const where: Prisma.UserWhereInput = {};

  if (query.role) {
    where.role = query.role;
  }

  if (siteRestriction) {
    where.siteId = siteRestriction;
  } else if (query.siteId) {
    where.siteId = query.siteId;
  }

  if (!query.includeDeactivated) {
    where.isDeactivated = false;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userListSelect,
      orderBy: { createdAt: "desc" },
      skip: query.offset,
      take: query.limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    limit: query.limit,
    offset: query.offset,
  };
}

/**
 * Fetches one user and their current userPermissions.
 *
 * @param userId - Target user ID.
 * @returns Detailed user response.
 * @throws {AppError} If the user does not exist.
 */
export async function getUserDetail(userId: string): Promise<UserDetailResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userDetailSelect,
  });

  if (!user) {
    throw AppError.notFound("User not found");
  }

  return user;
}
