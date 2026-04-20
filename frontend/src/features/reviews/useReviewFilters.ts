import { useSearchParams, useSubmit } from "react-router";
import type { DateRange } from "react-day-picker";
import type { ReviewFilters, StudyOption } from "./types";
import {
    hasActiveFilters as checkHasActiveFilters,
    getDateRangeFromFilters,
    groupStudiesByStatus,
} from "./filterUtils";

/** @description Filter keys that are independently updatable via a single value. */
type UpdatableFilterKey = "search" | "study" | "site" | "status";

/**
 * @description Hook that provides derived filter state and handlers for the
 * reviews filter bar. Reads filters from loader data (single source of truth)
 * and exposes submit handlers that trigger loader re-runs via React Router.
 * @param filters - Current filters from loader data
 * @param studies - Available study options for grouping
 */
export function useReviewFilters(filters: ReviewFilters, studies: StudyOption[]) {
    const submit = useSubmit();
    const [searchParams] = useSearchParams();

    const dateRange = getDateRangeFromFilters(filters);
    const hasActiveFilters = checkHasActiveFilters(filters);
    const groupedStudies = groupStudiesByStatus(studies);

    /**
     * @description Updates a single filter param in the URL while preserving
     * all other current params. Resets `page` so the user always lands back
     * on page 1 after changing a filter.
     * @param key - The filter param to update
     * @param value - New value, or `null` / empty string to remove it
     */
    function updateFilter(key: UpdatableFilterKey, value: string | null) {
        const params = new URLSearchParams(searchParams);
        if (value === null || value === "") {
            params.delete(key);
        } else {
            params.set(key, value);
        }
        params.delete("page");
        submit(params, { replace: true });
    }

    /**
     * @description Updates the dateFrom / dateTo params together, preserving
     * all other params and resetting `page`.
     * @param range - The selected date range, or undefined to clear
     */
    function handleDateRangeChange(range: DateRange | undefined) {
        const params = new URLSearchParams(searchParams);
        if (range?.from) params.set("dateFrom", range.from.toISOString());
        else params.delete("dateFrom");
        if (range?.to) params.set("dateTo", range.to.toISOString());
        else params.delete("dateTo");
        params.delete("page");
        submit(params, { replace: true });
    }

    /**
     * @description Submits empty params to clear all filters and reset the URL.
     */
    function clearAllFilters() {
        submit(new URLSearchParams(), { replace: true });
    }

    return {
        dateRange,
        hasActiveFilters,
        groupedStudies,
        updateFilter,
        handleDateRangeChange,
        clearAllFilters,
    };
}
