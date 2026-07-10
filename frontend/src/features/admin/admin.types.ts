/** @description The four tab values for the admin data table. */
export type AdminTab = "users" | "sites" | "studies" | "audits";

export type { AdminStats, AdminChartDataPoint, AdminChartResponse } from "@shared/admin";
export type {
  SiteListItem,
  ListSitesResponse,
  SiteDetailResponse,
  SiteOption,
  SiteOptionsResponse,
} from "@shared/site";
export type {
  StudyListItem,
  ListStudiesResponse,
  EligibleStudyUser,
  EligibleStudyUsersResponse,
  SiteCaregiversResponse,
  AddStudyUsersResponse,
} from "@shared/study";
export type { AuditLogListItem, ListAuditLogsResponse } from "@shared/audit";
export type {
  UserListItem,
  ListUsersResponse,
  UserDetailResponse,
  UserPermissionItem,
} from "@shared/user";
