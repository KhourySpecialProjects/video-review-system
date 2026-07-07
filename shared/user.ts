/** @description A user row returned by the list users endpoint. */
export type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: "CAREGIVER" | "CLINICAL_REVIEWER" | "SITE_COORDINATOR" | "SYSADMIN";
  siteId: string;
  isDeactivated: boolean;
};

/** @description Paginated response from GET /api/domain/users. */
export type ListUsersResponse = {
  users: UserListItem[];
  total: number;
  limit: number;
  offset: number;
};

/** @description A single permission row from the user detail response. */
export type UserPermissionItem = {
  id: string;
  userId: string;
  permissionLevel: "READ" | "WRITE" | "EXPORT" | "ADMIN";
  siteId: string | null;
  studyId: string | null;
  videoId: string | null;
};

/** @description Detailed user response from GET /api/domain/users/:userId. */
export type UserDetailResponse = {
  id: string;
  name: string;
  email: string;
  role: "CAREGIVER" | "CLINICAL_REVIEWER" | "SITE_COORDINATOR" | "SYSADMIN";
  siteId: string;
  isDeactivated: boolean;
  userPermissions: UserPermissionItem[];
};
