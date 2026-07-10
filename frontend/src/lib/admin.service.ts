import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { adminKeys } from "./queryClient";
import type {
  AdminTab,
  AdminStats,
  AdminChartResponse,
  ListUsersResponse,
  UserDetailResponse,
  ListSitesResponse,
  SiteDetailResponse,
  SiteOptionsResponse,
  SiteCaregiversResponse,
  ListStudiesResponse,
  ListAuditLogsResponse,
} from "@/features/admin/admin.types";

/** @description Default stale time for admin queries (30 seconds). */
const ADMIN_STALE_MS = 30_000;

/** @description Longer stale time for rarely-changing data like site options. */
const OPTIONS_STALE_MS = 60_000;

/**
 * @description Query options for admin dashboard aggregate stats.
 * Returns all 16 counts in one call so tab switches require no extra fetch.
 *
 * @returns TanStack Query options for AdminStats.
 */
export function adminStatsQuery() {
  return queryOptions({
    queryKey: adminKeys.stats(),
    queryFn: async () => {
      const res = await apiFetch("/admin/stats");
      if (!res.ok) throw new Error("Failed to fetch admin stats");
      return res.json() as Promise<AdminStats>;
    },
    staleTime: ADMIN_STALE_MS,
  });
}

/**
 * @description Query options for admin chart time-series data.
 * Each tab has its own chart data, cached independently.
 *
 * @param tab - The active tab determining the chart content.
 * @param months - Number of months of history to include.
 * @returns TanStack Query options for AdminChartResponse.
 */
export function adminChartQuery(tab: AdminTab, months = 6) {
  return queryOptions({
    queryKey: adminKeys.chart(tab, months),
    queryFn: async () => {
      const res = await apiFetch(`/admin/chart?tab=${tab}&months=${months}`);
      if (!res.ok) throw new Error("Failed to fetch chart data");
      return res.json() as Promise<AdminChartResponse>;
    },
    staleTime: ADMIN_STALE_MS,
  });
}

/**
 * @description Query options for the paginated, filterable users list.
 * Filter/search params are serialized into the query key so each
 * combination gets its own cache entry.
 *
 * @param params - URLSearchParams containing limit, offset, name, role, siteId, etc.
 * @returns TanStack Query options for ListUsersResponse.
 */
export function adminUsersQuery(params: URLSearchParams) {
  const key = params.toString();
  return queryOptions({
    queryKey: adminKeys.users(key),
    queryFn: async () => {
      const res = await apiFetch(`/users?${key}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json() as Promise<ListUsersResponse>;
    },
    staleTime: ADMIN_STALE_MS,
  });
}

/**
 * @description Query options for the paginated, filterable sites list.
 *
 * @param params - URLSearchParams containing limit, offset, name.
 * @returns TanStack Query options for ListSitesResponse.
 */
export function adminSitesQuery(params: URLSearchParams) {
  const key = params.toString();
  return queryOptions({
    queryKey: adminKeys.sites(key),
    queryFn: async () => {
      const res = await apiFetch(`/sites?${key}`);
      if (!res.ok) throw new Error("Failed to fetch sites");
      return res.json() as Promise<ListSitesResponse>;
    },
    staleTime: ADMIN_STALE_MS,
  });
}

/**
 * @description Query options for the minimal site list used in Select
 * dropdowns. Not paginated. Longer stale time since sites rarely change.
 *
 * @returns TanStack Query options for SiteOptionsResponse.
 */
export function siteOptionsQuery() {
  return queryOptions({
    queryKey: adminKeys.siteOptions(),
    queryFn: async () => {
      const res = await apiFetch("/sites/options");
      if (!res.ok) throw new Error("Failed to fetch site options");
      return res.json() as Promise<SiteOptionsResponse>;
    },
    staleTime: OPTIONS_STALE_MS,
  });
}

/**
 * @description Query options for caregivers belonging to the given sites.
 * Used by the create-study dialog to populate the caregiver picker as
 * sites are selected.
 *
 * @param siteIds - Comma-separated site IDs.
 * @returns TanStack Query options for SiteCaregiversResponse.
 */
export function siteCaregiversQuery(siteIds: string) {
  return queryOptions({
    queryKey: adminKeys.siteCaregivers(siteIds),
    queryFn: async () => {
      const res = await apiFetch(
        `/studies/caregivers-for-sites?siteIds=${encodeURIComponent(siteIds)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch caregivers");
      return res.json() as Promise<SiteCaregiversResponse>;
    },
    staleTime: OPTIONS_STALE_MS,
  });
}

/**
 * @description Query options for the paginated, filterable studies list.
 *
 * @param params - URLSearchParams containing limit, offset, siteId, status, name.
 * @returns TanStack Query options for ListStudiesResponse.
 */
export function adminStudiesQuery(params: URLSearchParams) {
  const key = params.toString();
  return queryOptions({
    queryKey: adminKeys.studies(key),
    queryFn: async () => {
      const res = await apiFetch(`/studies?${key}`);
      if (!res.ok) throw new Error("Failed to fetch studies");
      return res.json() as Promise<ListStudiesResponse>;
    },
    staleTime: ADMIN_STALE_MS,
  });
}

/**
 * @description Query options for the paginated, filterable audit log list.
 *
 * @param params - URLSearchParams containing limit, offset, actionType, entityType, siteId.
 * @returns TanStack Query options for ListAuditLogsResponse.
 */
export function adminAuditQuery(params: URLSearchParams) {
  const key = params.toString();
  return queryOptions({
    queryKey: adminKeys.audit(key),
    queryFn: async () => {
      const res = await apiFetch(`/audit?${key}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json() as Promise<ListAuditLogsResponse>;
    },
    staleTime: ADMIN_STALE_MS,
  });
}

/**
 * @description Query options for a single user's detail including their
 * permissions. Used by the UserSheet component.
 *
 * @param userId - The user ID to fetch.
 * @returns TanStack Query options for UserDetailResponse.
 */
export function adminUserDetailQuery(userId: string) {
  return queryOptions({
    queryKey: adminKeys.userDetail(userId),
    queryFn: async () => {
      const res = await apiFetch(`/users/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch user detail");
      return res.json() as Promise<UserDetailResponse>;
    },
    staleTime: ADMIN_STALE_MS,
  });
}

/**
 * @description Query options for a single site's detail including its
 * users and studies. Used by the SiteSheet component.
 *
 * @param siteId - The site ID to fetch.
 * @returns TanStack Query options for SiteDetailResponse.
 */
export function adminSiteDetailQuery(siteId: string) {
  return queryOptions({
    queryKey: adminKeys.siteDetail(siteId),
    queryFn: async () => {
      const res = await apiFetch(`/sites/${siteId}`);
      if (!res.ok) throw new Error("Failed to fetch site detail");
      return res.json() as Promise<SiteDetailResponse>;
    },
    staleTime: ADMIN_STALE_MS,
  });
}
