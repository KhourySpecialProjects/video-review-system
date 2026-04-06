import { useSubmit } from "react-router";
import type { DateRange } from "react-day-picker";
import type { ReviewFilters, StudyOption } from "./types";
import {
    hasActiveFilters as checkHasActiveFilters,
    getDateRangeFromFilters,
    groupStudiesByStatus,
} from "./filterUtils";

/**
 * @description Hook that provides derived filter state and handlers for the
 * reviews filter bar. Reads filters from loader data (single source of truth)
 * and exposes submit handlers that trigger loader re-runs via React Router.
 * @param filters - Current filters from loader data
 * @param studies - Available study options for grouping
 */
export function useReviewFilters(filters: ReviewFilters, studies: StudyOption[]) {
    const submit = useSubmit();

    const dateRange = getDateRangeFromFilters(filters);
    const hasActiveFilters = checkHasActiveFilters(filters);
    const groupedStudies = groupStudiesByStatus(studies);

    /**
     * @description onChange handler for the Form element.
     * Submits the form on any input change, letting the browser
     * serialize all named inputs to search params.
     * @param event - The change event from the form
     */
    function handleFormChange(event: React.ChangeEvent<HTMLFormElement>) {
        submit(event.currentTarget, { replace: hasActiveFilters });
    }

    /**
     * @description Builds search params from the current loader filters
     * with the date range overridden, then submits to trigger a navigation.
     * @param range - The selected date range, or undefined to clear
     */
    function handleDateRangeChange(range: DateRange | undefined) {
        const params = new URLSearchParams();
        if (filters.search) params.set("search", filters.search);
        if (filters.study) params.set("study", filters.study);
        if (filters.site) params.set("site", filters.site);
        if (filters.status) params.set("status", filters.status);
        if (range?.from) params.set("dateFrom", range.from.toISOString());
        if (range?.to) params.set("dateTo", range.to.toISOString());
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
        handleFormChange,
        handleDateRangeChange,
        clearAllFilters,
    };
}
