import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";
import type { ReviewFilters, ReviewStatus, SiteOption, StudyOption } from "./types";
import { SearchInput } from "./SearchInput";
import { StudySelect } from "./StudySelect";
import { SiteSelect } from "./SiteSelect";
import { StatusSelect } from "./StatusSelect";
import { DatePickerRange } from "./DatePickerRange";

type ReviewFilterBarProps = {
    /** @param filters - Currently applied filters from URL search params */
    filters: ReviewFilters;
    /** @param dateRange - Current date range for the calendar picker */
    dateRange: DateRange | undefined;
    /** @param hasActiveFilters - Whether any filter is currently active */
    hasActiveFilters: boolean;
    /** @param groupedStudies - Studies split into ongoing and completed groups */
    groupedStudies: { ongoing: StudyOption[]; completed: StudyOption[] };
    /** @param sites - Available site options for the site dropdown */
    sites: SiteOption[];
    /** @param onSearchChange - Callback fired with the debounced search value */
    onSearchChange: (value: string) => void;
    /** @param onStudyChange - Callback fired when the study filter changes */
    onStudyChange: (value: string | null) => void;
    /** @param onSiteChange - Callback fired when the site filter changes */
    onSiteChange: (value: string | null) => void;
    /** @param onStatusChange - Callback fired when the status filter changes */
    onStatusChange: (value: ReviewStatus | null) => void;
    /** @param onDateRangeChange - Callback to update the date range */
    onDateRangeChange: (range: DateRange | undefined) => void;
    /** @param onClearAll - Callback to clear all filters */
    onClearAll: () => void;
};

/**
 * @description Composes all filter controls into a unified filter bar.
 * Each control updates its own slice of the URL search params; there is no
 * ambient form-level submission.
 */
export function ReviewFilterBar({
    filters,
    dateRange,
    hasActiveFilters,
    groupedStudies,
    sites,
    onSearchChange,
    onStudyChange,
    onSiteChange,
    onStatusChange,
    onDateRangeChange,
    onClearAll,
}: ReviewFilterBarProps) {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <SearchInput
                    value={filters.search ?? ""}
                    onChange={onSearchChange}
                />

                <div className="flex flex-wrap items-center gap-2">
                    <StudySelect
                        value={filters.study ?? null}
                        groupedStudies={groupedStudies}
                        onChange={onStudyChange}
                    />
                    <SiteSelect
                        value={filters.site ?? null}
                        sites={sites}
                        onChange={onSiteChange}
                    />
                    <StatusSelect
                        value={filters.status ?? null}
                        onChange={onStatusChange}
                    />
                    <DatePickerRange
                        date={dateRange}
                        onSelect={onDateRangeChange}
                    />
                </div>
            </div>

            {hasActiveFilters && (
                <div className="flex items-center">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onClearAll}
                    >
                        <X data-icon="inline-start" />
                        Clear all filters
                    </Button>
                </div>
            )}
        </div>
    );
}

/**
 * @description Skeleton loading placeholder for the ReviewFilterBar.
 */
export function ReviewFilterBarSkeleton() {
    return (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Skeleton className="h-9 w-full lg:max-w-xs" />
            <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-28" />
                <Skeleton className="h-9 w-28" />
                <Skeleton className="h-9 w-44" />
            </div>
        </div>
    );
}
