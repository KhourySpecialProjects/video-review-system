import { Suspense, useCallback } from "react";
import { useLoaderData, useSearchParams } from "react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import {
  adminStatsQuery,
  adminUsersQuery,
  adminSitesQuery,
  adminStudiesQuery,
  adminAuditQuery,
} from "@/lib/admin.service";
import { AdminSidebar } from "@/features/admin/AdminSidebar";
import { AdminTabBar } from "@/features/admin/AdminTabBar";
import { AdminStatCards } from "@/features/admin/AdminStatCards";
import { AdminChart } from "@/features/admin/AdminChart";
import { AdminTableToolbar } from "@/features/admin/AdminTableToolbar";
import { TabContent } from "@/features/admin/TabContent";
import { usersColumns } from "@/features/admin/columns/usersColumns";
import { sitesColumns } from "@/features/admin/columns/sitesColumns";
import { studiesColumns } from "@/features/admin/columns/studiesColumns";
import { auditColumns } from "@/features/admin/columns/auditColumns";
import { UserSheet } from "@/features/admin/sheets/UserSheet";
import { SiteSheet } from "@/features/admin/sheets/SiteSheet";
import { StudySheet } from "@/features/admin/sheets/StudySheet";
import { AuditSheet } from "@/features/admin/sheets/AuditSheet";
import type { AdminLoaderData } from "@/features/admin/admin.route";
import type { AdminTab } from "@/features/admin/admin.types";

/** @description Filter keys stored as URL search params. */
const FILTER_KEYS = [
  "role",
  "siteId",
  "status",
  "actionType",
  "entityType",
  "includeDeactivated",
] as const;

type TabProps = {
  queryParams: URLSearchParams;
  setSearchParams: (
    setter: (prev: URLSearchParams) => URLSearchParams,
  ) => void;
};

/**
 * @description Extracts current filter values from URL search params
 * into a plain object for the toolbar component.
 *
 * @param searchParams - The current URL search params.
 * @returns Record of active filter keys to their values.
 */
function deriveFilters(searchParams: URLSearchParams): Record<string, string> {
  const filters: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const value = searchParams.get(key);
    if (value) filters[key] = value;
  }
  return filters;
}

/**
 * @description Skeleton placeholder shown while tab data suspends.
 */
function TableSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full rounded-md" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

/** @description Users tab — fetches user list and renders TabContent. */
function UsersTab({
  queryParams,
  setSearchParams,
  actorRole,
}: TabProps & { actorRole: string }) {
  const { data } = useSuspenseQuery(adminUsersQuery(queryParams));
  return (
    <TabContent
      rows={data.users}
      total={data.total}
      columns={usersColumns}
      queryParams={queryParams}
      setSearchParams={setSearchParams}
      renderSheet={(row, open, onClose) => (
        <UserSheet
          key={row.id}
          userId={row.id}
          open={open}
          onOpenChange={onClose}
          actorRole={actorRole}
        />
      )}
    />
  );
}

/** @description Sites tab — fetches site list and renders TabContent. */
function SitesTab({ queryParams, setSearchParams }: TabProps) {
  const { data } = useSuspenseQuery(adminSitesQuery(queryParams));
  return (
    <TabContent
      rows={data.sites}
      total={data.total}
      columns={sitesColumns}
      queryParams={queryParams}
      setSearchParams={setSearchParams}
      renderSheet={(row, open, onClose) => (
        <SiteSheet
          key={row.id}
          siteId={row.id}
          open={open}
          onOpenChange={onClose}
        />
      )}
    />
  );
}

/** @description Studies tab — fetches study list and renders TabContent. */
function StudiesTab({ queryParams, setSearchParams }: TabProps) {
  const { data } = useSuspenseQuery(adminStudiesQuery(queryParams));
  return (
    <TabContent
      rows={data.studies}
      total={data.total}
      columns={studiesColumns}
      queryParams={queryParams}
      setSearchParams={setSearchParams}
      renderSheet={(row, open, onClose) => (
        <StudySheet key={row.id} study={row} open={open} onOpenChange={onClose} />
      )}
    />
  );
}

/** @description Audits tab — fetches audit log list and renders TabContent. */
function AuditTab({ queryParams, setSearchParams }: TabProps) {
  const { data } = useSuspenseQuery(adminAuditQuery(queryParams));
  return (
    <TabContent
      rows={data.logs}
      total={data.total}
      columns={auditColumns}
      queryParams={queryParams}
      setSearchParams={setSearchParams}
      renderSheet={(row, open, onClose) => (
        <AuditSheet
          key={row.id}
          auditLog={row}
          open={open}
          onOpenChange={onClose}
        />
      )}
    />
  );
}

/**
 * @description Admin dashboard page component. Reads loader data and URL
 * search params to orchestrate the sidebar, tab bar, stat cards, chart,
 * toolbar, and the active tab's content. All initial data is prefetched
 * by the loader — components read from TanStack Query cache via
 * useSuspenseQuery.
 */
export default function SystemAdminDashboard() {
  const { activeTab, queryParams } = useLoaderData() as AdminLoaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const actorRole = user?.role ?? "";

  const { data: stats } = useSuspenseQuery(adminStatsQuery());

  const filters = deriveFilters(searchParams);
  const searchValue = searchParams.get("name") ?? "";

  /** @description Switches to a new tab, resetting all filters and pagination. */
  const handleTabChange = useCallback(
    (tab: AdminTab) => {
      setSearchParams({ tab });
    },
    [setSearchParams],
  );

  /** @description Updates a filter param and resets pagination to page 0. */
  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value && value !== "all") {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        next.set("offset", "0");
        return next;
      });
    },
    [setSearchParams],
  );

  /** @description Updates the name search param and resets pagination. */
  const handleSearch = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set("name", value);
        } else {
          next.delete("name");
        }
        next.set("offset", "0");
        return next;
      });
    },
    [setSearchParams],
  );

  return (
    // The root layout's <main> is the app's only scroll container; this
    // page must not introduce its own (min-h-full instead of min-h-svh,
    // and no overflow on descendants) or nested scrollbars appear.
    <SidebarProvider className="min-h-full">
      <AdminSidebar actorRole={actorRole} />
      <SidebarInset className="bg-muted/30">
        <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-2">
          <SidebarTrigger />
          <span className="text-sm font-semibold md:hidden">Admin Panel</span>
        </div>

        <div className="p-4 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage users, sites, studies, and review audit logs.
            </p>
          </div>

          <div className="space-y-6">
            <AdminTabBar
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
            <AdminStatCards stats={stats} activeTab={activeTab} />

            <Suspense
              fallback={<Skeleton className="h-62.5 w-full rounded-lg" />}
            >
              <AdminChart activeTab={activeTab} />
            </Suspense>

            <AdminTableToolbar
              activeTab={activeTab}
              filters={filters}
              onFilterChange={handleFilterChange}
              onSearch={handleSearch}
              searchValue={searchValue}
            />

            <Suspense fallback={<TableSkeleton />}>
              {activeTab === "users" && (
                <UsersTab
                  queryParams={queryParams}
                  setSearchParams={setSearchParams}
                  actorRole={actorRole}
                />
              )}
              {activeTab === "sites" && (
                <SitesTab
                  queryParams={queryParams}
                  setSearchParams={setSearchParams}
                />
              )}
              {activeTab === "studies" && (
                <StudiesTab
                  queryParams={queryParams}
                  setSearchParams={setSearchParams}
                />
              )}
              {activeTab === "audits" && (
                <AuditTab
                  queryParams={queryParams}
                  setSearchParams={setSearchParams}
                />
              )}
            </Suspense>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
