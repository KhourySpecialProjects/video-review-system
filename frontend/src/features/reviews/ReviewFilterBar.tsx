import { Form } from "react-router";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";
import type { ReviewFilters, SiteOption, StudyOption } from "./types";
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
    /** @param onFormChange - onChange handler for the Form, auto-submits on any input change */
    onFormChange: (event: React.ChangeEvent<HTMLFormElement>) => void;
    /** @param onDateRangeChange - Callback to update the date range */
    onDateRangeChange: (range: DateRange | undefined) => void;
    /** @param onClearAll - Callback to clear all filters */
    onClearAll: () => void;
};

/**
 * @description Composes all filter controls into a unified filter bar.
 * Wraps controls in a Form (method="get") with an onChange handler
 * that auto-submits when any input changes, serializing all named
 * inputs to search params.
 */
export function ReviewFilterBar({
    filters,
    dateRange,
    hasActiveFilters,
    groupedStudies,
    sites,
    onFormChange,
    onDateRangeChange,
    onClearAll,
}: ReviewFilterBarProps) {
    return (
        <Form
            method="get"
            onChange={onFormChange}
            className="flex flex-col gap-3"
        >
            {/* Hidden inputs for date range (no native form control) */}
            <input type="hidden" name="dateFrom" value={filters.dateFrom ?? ""} />
            <input type="hidden" name="dateTo" value={filters.dateTo ?? ""} />

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <SearchInput defaultValue={filters.search ?? ""} />

                <div className="flex flex-wrap items-center gap-2">
                    <StudySelect
                        value={filters.study ?? null}
                        groupedStudies={groupedStudies}
                    />
                    <SiteSelect
                        value={filters.site ?? null}
                        sites={sites}
                    />
                    <StatusSelect
                        value={filters.status ?? null}
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
        </Form>
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
