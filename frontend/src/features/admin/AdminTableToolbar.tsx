import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { siteOptionsQuery } from "@/lib/admin.service";
import type { AdminTab } from "./admin.types";

/**
 * @description Tab-conditional toolbar for the admin data table.
 * Renders different filter controls depending on the active tab.
 * Search input is debounced by 300ms before calling onSearch.
 *
 * @param activeTab - The currently active admin tab.
 * @param filters - Current filter values keyed by filter name.
 * @param onFilterChange - Handler called when a filter value changes.
 * @param onSearch - Handler called with debounced search text.
 * @param searchValue - The current search input value.
 */
export function AdminTableToolbar({
  activeTab,
  filters,
  onFilterChange,
  onSearch,
  searchValue,
}: {
  activeTab: AdminTab;
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onSearch: (value: string) => void;
  searchValue: string;
}) {
  const [localSearch, setLocalSearch] = useState(searchValue);
  const { data: siteOptionsData } = useQuery(siteOptionsQuery());
  const siteOptions = siteOptionsData?.sites ?? [];

  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchValue) {
        onSearch(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, searchValue, onSearch]);

  /** @description Handles search input changes locally before debouncing. */
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalSearch(e.target.value);
    },
    [],
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search input — shown for users, sites, studies tabs */}
      {(activeTab === "users" ||
        activeTab === "sites" ||
        activeTab === "studies") && (
        <Input
          placeholder={
            activeTab === "users"
              ? "Search by name..."
              : activeTab === "sites"
                ? "Search by site name..."
                : "Search by study name..."
          }
          value={localSearch}
          onChange={handleSearchChange}
          className="h-8 max-w-xs text-sm"
        />
      )}

      {/* Role filter — users tab only */}
      {activeTab === "users" && (
        <Select
          value={filters.role ?? "all"}
          onValueChange={(v) => onFilterChange("role", v ?? "all")}
        >
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="CAREGIVER">Caregiver</SelectItem>
            <SelectItem value="CLINICAL_REVIEWER">Clinical Reviewer</SelectItem>
            <SelectItem value="SITE_COORDINATOR">Site Coordinator</SelectItem>
            <SelectItem value="SYSADMIN">System Admin</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Site filter — users, studies, audits tabs */}
      {(activeTab === "users" ||
        activeTab === "studies" ||
        activeTab === "audits") && (
        <Select
          value={filters.siteId ?? "all"}
          onValueChange={(v) => onFilterChange("siteId", v ?? "all")}
        >
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder="All Sites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {siteOptions.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Status filter — studies tab only */}
      {activeTab === "studies" && (
        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) => onFilterChange("status", v ?? "all")}
        >
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="NOT_STARTED">Not Started</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="FINISHED">Finished</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Action type filter — audits tab only */}
      {activeTab === "audits" && (
        <Select
          value={filters.actionType ?? "all"}
          onValueChange={(v) => onFilterChange("actionType", v ?? "all")}
        >
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="CREATE">Create</SelectItem>
            <SelectItem value="READ">Read</SelectItem>
            <SelectItem value="UPDATE">Update</SelectItem>
            <SelectItem value="DELETE">Delete</SelectItem>
            <SelectItem value="DOWNLOAD">Download</SelectItem>
            <SelectItem value="LOGIN">Login</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Entity type filter — audits tab only */}
      {activeTab === "audits" && (
        <Select
          value={filters.entityType ?? "all"}
          onValueChange={(v) => onFilterChange("entityType", v ?? "all")}
        >
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder="All Entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="VIDEO">Video</SelectItem>
            <SelectItem value="ANNOTATION">Annotation</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="STUDY">Study</SelectItem>
            <SelectItem value="SEQUENCE">Sequence</SelectItem>
            <SelectItem value="CLIP">Clip</SelectItem>
            <SelectItem value="SITE">Site</SelectItem>
            <SelectItem value="PERMISSIONS">Permissions</SelectItem>
            <SelectItem value="INVITATION">Invitation</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Include deactivated — users tab only */}
      {activeTab === "users" && (
        <div className="flex items-center gap-1.5">
          <Checkbox
            id="includeDeactivated"
            checked={filters.includeDeactivated === "true"}
            onCheckedChange={(checked) =>
              onFilterChange(
                "includeDeactivated",
                checked ? "true" : "false",
              )
            }
          />
          <Label htmlFor="includeDeactivated" className="text-xs">
            Include deactivated
          </Label>
        </div>
      )}
    </div>
  );
}
