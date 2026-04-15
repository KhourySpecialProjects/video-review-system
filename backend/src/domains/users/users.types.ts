import { z } from "zod";
import { roleSchema } from "../auth/auth.types.js";

const includeDeactivatedSchema = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean().optional().default(false));

/**
 * Validation schema for listing users.
 *
 * Supported filters:
 * - role
 * - siteId
 * - includeDeactivated
 * - limit
 * - offset
 */
export const listUsersQuerySchema = z.object({
  role: roleSchema.optional(),
  siteId: z.uuid("Invalid site ID").optional(),
  includeDeactivated: includeDeactivatedSchema,
  limit: z.coerce.number().int().positive().optional().default(20),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/** Response item returned by the list users endpoint. */
export type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: "CAREGIVER" | "CLINICAL_REVIEWER" | "SITE_COORDINATOR" | "SYSADMIN";
  siteId: string;
  isDeactivated: boolean;
};

/** Response shape returned by the list users endpoint. */
export type ListUsersResponse = {
  users: UserListItem[];
  total: number;
  limit: number;
  offset: number;
};

/** Response item returned inside the userPermissions array. */
export type UserPermissionItem = {
  id: string;
  userId: string;
  permissionLevel: "READ" | "WRITE" | "EXPORT" | "ADMIN";
  siteId: string | null;
  studyId: string | null;
  videoId: string | null;
};

/** Response shape returned by the get user detail endpoint. */
export type UserDetailResponse = {
  id: string;
  name: string;
  email: string;
  role: "CAREGIVER" | "CLINICAL_REVIEWER" | "SITE_COORDINATOR" | "SYSADMIN";
  siteId: string;
  isDeactivated: boolean;
  userPermissions: UserPermissionItem[];
};

export const createUserPermissionSchema = z.object({
  permissionLevel: z.enum(["READ", "WRITE", "EXPORT", "ADMIN"]),
  siteId: z.uuid("Invalid site ID").nullable(),
  studyId: z.uuid("Invalid study ID").nullable(),
  videoId: z.uuid("Invalid video ID").nullable(),
});

/** Response shape returned by the list user permissions endpoint. */
export type ListUserPermissionsResponse = {
  userPermissions: UserPermissionItem[];
};

export type CreateUserPermissionInput = z.infer<typeof createUserPermissionSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
