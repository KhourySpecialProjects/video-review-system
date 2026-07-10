import type { QueryClient } from "@tanstack/react-query";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { adminKeys } from "@/lib/queryClient";
import {
  adminStatsQuery,
  adminUsersQuery,
  adminSitesQuery,
  adminStudiesQuery,
  adminAuditQuery,
  adminChartQuery,
  siteOptionsQuery,
} from "@/lib/admin.service";
import { createPermissionSchema } from "./admin.schemas";
import type { AdminTab } from "./admin.types";

/** @description Valid tab values for the admin dashboard. */
const VALID_TABS: AdminTab[] = ["users", "sites", "studies", "audits"];

/**
 * @description Loader data returned to the admin dashboard component.
 * Contains the parsed search params so the component doesn't need to
 * re-parse the URL.
 */
export type AdminLoaderData = {
  activeTab: AdminTab;
  queryParams: URLSearchParams;
};

/**
 * @description Loader for the admin dashboard page. Reads the active tab,
 * filters, search, and pagination from the URL search params. Prefetches
 * the stats, chart data, active tab's list data, and site options.
 *
 * @param queryClient - The TanStack Query client for prefetching.
 * @returns Loader function compatible with React Router.
 */
export function adminLoader(queryClient: QueryClient) {
  return ({ request }: LoaderFunctionArgs): AdminLoaderData => {
    const url = new URL(request.url);
    const params = url.searchParams;

    const tab = params.get("tab") as AdminTab | null;
    const activeTab = tab && VALID_TABS.includes(tab) ? tab : "users";

    const queryParams = new URLSearchParams();
    queryParams.set("limit", params.get("limit") ?? "20");
    queryParams.set("offset", params.get("offset") ?? "0");

    const name = params.get("name");
    if (name) queryParams.set("name", name);

    const role = params.get("role");
    if (role) queryParams.set("role", role);

    const siteId = params.get("siteId");
    if (siteId) queryParams.set("siteId", siteId);

    const status = params.get("status");
    if (status) queryParams.set("status", status);

    const actionType = params.get("actionType");
    if (actionType) queryParams.set("actionType", actionType);

    const entityType = params.get("entityType");
    if (entityType) queryParams.set("entityType", entityType);

    const includeDeactivated = params.get("includeDeactivated");
    if (includeDeactivated) queryParams.set("includeDeactivated", includeDeactivated);

    queryClient.prefetchQuery(adminStatsQuery());
    queryClient.prefetchQuery(adminChartQuery(activeTab, 6));
    queryClient.prefetchQuery(siteOptionsQuery());

    switch (activeTab) {
      case "users":
        queryClient.prefetchQuery(adminUsersQuery(queryParams));
        break;
      case "sites":
        queryClient.prefetchQuery(adminSitesQuery(queryParams));
        break;
      case "studies":
        queryClient.prefetchQuery(adminStudiesQuery(queryParams));
        break;
      case "audits":
        queryClient.prefetchQuery(adminAuditQuery(queryParams));
        break;
    }

    return { activeTab, queryParams };
  };
}

/**
 * @description Action for the admin dashboard page. Handles user-level
 * mutations dispatched via `useFetcher.submit()` from sheet components.
 *
 * @param queryClient - The TanStack Query client for cache invalidation.
 * @returns Action function compatible with React Router.
 */
export function adminAction(queryClient: QueryClient) {
  return async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    switch (intent) {
      case "updateUserStatus": {
        const userId = formData.get("userId") as string;
        const isDeactivated = formData.get("isDeactivated") === "true";

        const res = await apiFetch(`/users/${userId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDeactivated }),
        });

        if (!res.ok) {
          toast.error("Failed to update user status");
          return { ok: false };
        }

        await queryClient.invalidateQueries({ queryKey: adminKeys.all });
        toast.success(isDeactivated ? "User deactivated" : "User reactivated");
        return { ok: true };
      }

      case "createPermission": {
        const userId = formData.get("userId") as string;
        const body = {
          permissionLevel: formData.get("permissionLevel"),
          siteId: formData.get("siteId") || null,
          studyId: formData.get("studyId") || null,
          videoId: formData.get("videoId") || null,
        };

        const parsed = createPermissionSchema.safeParse(body);
        if (!parsed.success) {
          return {
            ok: false,
            fieldErrors: z.flattenError(parsed.error).fieldErrors,
          };
        }

        const res = await apiFetch(`/users/${userId}/permissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });

        if (!res.ok) {
          toast.error("Failed to create permission");
          return { ok: false };
        }

        await queryClient.invalidateQueries({
          queryKey: adminKeys.userDetail(userId),
        });
        toast.success("Permission added");
        return { ok: true };
      }

      case "deletePermission": {
        const userId = formData.get("userId") as string;
        const permissionId = formData.get("permissionId") as string;

        const res = await apiFetch(
          `/users/${userId}/permissions/${permissionId}`,
          { method: "DELETE" },
        );

        if (!res.ok) {
          toast.error("Failed to delete permission");
          return { ok: false };
        }

        await queryClient.invalidateQueries({
          queryKey: adminKeys.userDetail(userId),
        });
        toast.success("Permission removed");
        return { ok: true };
      }

      default:
        return { ok: false, error: "Unknown intent" };
    }
  };
}
