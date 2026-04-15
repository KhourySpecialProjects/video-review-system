import type { Prisma } from "../../generated/prisma/index.js";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../middleware/errors.js";
import type {
  CreateUserPermissionInput,
  ListUserPermissionsResponse,
  ListUsersQuery,
  ListUsersResponse,
  UpdateUserStatusInput,
  UpdateUserStatusResponse,
  UserDetailResponse,
  UserPermissionItem,
} from "./users.types.js";

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

const userPermissionSelect = {
  id: true,
  userId: true,
  permissionLevel: true,
  siteId: true,
  studyId: true,
  videoId: true,
} as const;

export type PermissionScope = Pick<
  CreateUserPermissionInput,
  "siteId" | "studyId" | "videoId"
>;

export type PermissionScopeAccess = {
  isGlobal: boolean;
  siteIds: string[];
};

/**
 * Lists users with optional filters and pagination.
 *
 * @param query - Parsed list query params.
 * @param siteRestriction - Optional site restriction applied for coordinators.
 * @returns Paginated list response.
 */
export async function listUsers(
  query: ListUsersQuery,
  siteRestrictions?: string[],
): Promise<ListUsersResponse> {
  const where: Prisma.UserWhereInput = {};

  if (query.role) {
    where.role = query.role;
  }

  if (siteRestrictions && siteRestrictions.length > 0) {
    where.siteId = { in: siteRestrictions };
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

/**
 * Fetches minimal user context needed for permission management authorization.
 *
 * @param userId - Target user ID.
 * @returns User ID and site ID.
 * @throws {AppError} If the user does not exist.
 */
export async function getUserSiteContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      siteId: true,
    },
  });

  if (!user) {
    throw AppError.notFound("User not found");
  }

  return user;
}

/**
 * Resolves every site a coordinator can administer.
 *
 * The home site is always included. Additional sites come from explicit
 * `ADMIN` permission rows, including scoped study/video admin permissions.
 *
 * @param userId - Coordinator user ID.
 * @param homeSiteId - Coordinator home site ID.
 * @returns Unique site IDs the coordinator can manage.
 */
export async function getManageableSiteIds(
  userId: string,
  homeSiteId: string,
): Promise<string[]> {
  const manageableSiteIds = new Set<string>([homeSiteId]);
  const adminPermissions = await prisma.userPermission.findMany({
    where: {
      userId,
      permissionLevel: "ADMIN",
    },
    select: {
      siteId: true,
      studyId: true,
      videoId: true,
    },
  });

  for (const permission of adminPermissions) {
    try {
      const scopeAccess = await resolvePermissionScopeAccess(permission);

      if (scopeAccess.isGlobal) {
        const sites = await prisma.site.findMany({
          select: { id: true },
        });

        return sites.map((site) => site.id);
      }

      for (const siteId of scopeAccess.siteIds) {
        manageableSiteIds.add(siteId);
      }
    } catch {
      // Ignore stale or invalid admin permission rows when deriving management scope.
    }
  }

  return [...manageableSiteIds];
}

/**
 * Lists the current permissions for one user.
 *
 * @param userId - Target user ID.
 * @returns User permissions response.
 * @throws {AppError} If the user does not exist.
 */
export async function listUserPermissions(
  userId: string,
): Promise<ListUserPermissionsResponse> {
  await getUserSiteContext(userId);

  const userPermissions = await prisma.userPermission.findMany({
    where: { userId },
    select: userPermissionSelect,
    orderBy: { id: "asc" },
  });

  return { userPermissions };
}

/**
 * Resolves which site IDs are affected by a permission scope and validates that
 * any referenced site/study/video relationships actually exist.
 *
 * @param scope - Permission scope being checked or created.
 * @returns Whether the scope is global and which site IDs it covers.
 * @throws {AppError} If the scope references invalid or unrelated records.
 */
export async function resolvePermissionScopeAccess(
  scope: PermissionScope,
): Promise<PermissionScopeAccess> {
  const { siteId, studyId, videoId } = scope;

  if (siteId === null && studyId === null && videoId === null) {
    return { isGlobal: true, siteIds: [] };
  }

  if (siteId !== null && studyId === null && videoId === null) {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true },
    });

    if (!site) {
      throw AppError.badRequest("Invalid permission scope");
    }

    return { isGlobal: false, siteIds: [siteId] };
  }

  if (siteId === null && studyId !== null && videoId === null) {
    const study = await prisma.study.findUnique({
      where: { id: studyId },
      select: { id: true },
    });

    if (!study) {
      throw AppError.badRequest("Invalid permission scope");
    }

    const siteStudies = await prisma.siteStudy.findMany({
      where: { studyId },
      select: { siteId: true },
    });

    return {
      isGlobal: false,
      siteIds: [...new Set(siteStudies.map((row) => row.siteId))],
    };
  }

  if (siteId === null && studyId === null && videoId !== null) {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true },
    });

    if (!video) {
      throw AppError.badRequest("Invalid permission scope");
    }

    const videoStudies = await prisma.videoStudy.findMany({
      where: { videoId },
      select: { siteId: true },
    });

    return {
      isGlobal: false,
      siteIds: [...new Set(videoStudies.map((row) => row.siteId))],
    };
  }

  if (siteId === null && studyId !== null && videoId !== null) {
    const videoStudies = await prisma.videoStudy.findMany({
      where: { studyId, videoId },
      select: { siteId: true },
    });

    if (videoStudies.length === 0) {
      throw AppError.badRequest("Invalid permission scope");
    }

    return {
      isGlobal: false,
      siteIds: [...new Set(videoStudies.map((row) => row.siteId))],
    };
  }

  if (siteId !== null && studyId !== null && videoId === null) {
    const siteStudy = await prisma.siteStudy.findFirst({
      where: { siteId, studyId },
      select: { siteId: true },
    });

    if (!siteStudy) {
      throw AppError.badRequest("Invalid permission scope");
    }

    return { isGlobal: false, siteIds: [siteId] };
  }

  if (siteId !== null && studyId === null && videoId !== null) {
    const videoStudy = await prisma.videoStudy.findFirst({
      where: { siteId, videoId },
      select: { siteId: true },
    });

    if (!videoStudy) {
      throw AppError.badRequest("Invalid permission scope");
    }

    return { isGlobal: false, siteIds: [siteId] };
  }

  const videoStudy = await prisma.videoStudy.findFirst({
    where: {
      siteId: siteId!,
      studyId: studyId!,
      videoId: videoId!,
    },
    select: { siteId: true },
  });

  if (!videoStudy) {
    throw AppError.badRequest("Invalid permission scope");
  }

  return { isGlobal: false, siteIds: [siteId!] };
}

/**
 * Creates a new explicit permission for one user.
 *
 * @param userId - Target user ID.
 * @param input - Validated permission input.
 * @returns The created user permission.
 * @throws {AppError} If the user does not exist, the scope is invalid, or the exact permission already exists.
 */
export async function createUserPermission(
  userId: string,
  input: CreateUserPermissionInput,
): Promise<UserPermissionItem> {
  await getUserSiteContext(userId);
  await resolvePermissionScopeAccess(input);

  const existing = await prisma.userPermission.findFirst({
    where: {
      userId,
      permissionLevel: input.permissionLevel,
      siteId: input.siteId,
      studyId: input.studyId,
      videoId: input.videoId,
    },
    select: { id: true },
  });

  if (existing) {
    throw AppError.conflict("Duplicate user permission already exists");
  }

  return prisma.userPermission.create({
    data: {
      userId,
      permissionLevel: input.permissionLevel,
      siteId: input.siteId,
      studyId: input.studyId,
      videoId: input.videoId,
    },
    select: userPermissionSelect,
  });
}

/**
 * Fetches one user permission by ID within a user scope.
 *
 * @param userId - Target user ID.
 * @param permissionId - Target permission ID.
 * @returns The user permission.
 * @throws {AppError} If the permission does not exist for the user.
 */
export async function getUserPermission(
  userId: string,
  permissionId: string,
): Promise<UserPermissionItem> {
  const userPermission = await prisma.userPermission.findFirst({
    where: {
      id: permissionId,
      userId,
    },
    select: userPermissionSelect,
  });

  if (!userPermission) {
    throw AppError.notFound("User permission not found");
  }

  return userPermission;
}

/**
 * Deletes one explicit permission from one user.
 *
 * @param userId - Target user ID.
 * @param permissionId - Permission ID to delete.
 * @throws {AppError} If the user or permission does not exist.
 */
export async function deleteUserPermission(
  userId: string,
  permissionId: string,
): Promise<void> {
  await getUserSiteContext(userId);
  await getUserPermission(userId, permissionId);

  await prisma.userPermission.delete({
    where: { id: permissionId },
  });
}

/**
 * Updates a user's deactivation status without deleting the user.
 *
 * @param userId - Target user ID.
 * @param input - Requested deactivation status.
 * @returns User ID and updated deactivation flag.
 * @throws {AppError} If the user does not exist.
 */
export async function updateUserStatus(
  userId: string,
  input: UpdateUserStatusInput,
): Promise<UpdateUserStatusResponse> {
  await getUserSiteContext(userId);

  return prisma.user.update({
    where: { id: userId },
    data: {
      isDeactivated: input.isDeactivated,
    },
    select: {
      id: true,
      isDeactivated: true,
    },
  });
}
