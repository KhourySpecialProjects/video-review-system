import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { ReviewFilters, ReviewStatus, StudyOption } from "./types";

/** @description All possible review status values for filter dropdowns */
export const REVIEW_STATUS_OPTIONS: ReviewStatus[] = [
    "not reviewed",
    "in review",
    "reviewed",
];

/**
 * @description Parses URL search params into a typed ReviewFilters object.
 * Extracts recognized filter keys and ignores unrecognized ones.
 * @param searchParams - The URLSearchParams from the current URL
 * @returns {ReviewFilters} The parsed filter values
 */
export function parseFiltersFromParams(searchParams: URLSearchParams): ReviewFilters {
    return {
        search: searchParams.get("search") ?? undefined,
        study: searchParams.get("study") ?? undefined,
        site: searchParams.get("site") ?? undefined,
        status: (searchParams.get("status") as ReviewStatus) ?? undefined,
        dateFrom: searchParams.get("dateFrom") ?? undefined,
        dateTo: searchParams.get("dateTo") ?? undefined,
        page: searchParams.has("page")
            ? Number(searchParams.get("page"))
            : undefined,
    };
}

/**
 * @description Checks whether any filter is currently active.
 * @param filters - The current filter state
 * @returns {boolean} True if at least one filter has a value
 */
export function hasActiveFilters(filters: ReviewFilters): boolean {
    return Boolean(
        filters.search ||
        filters.study ||
        filters.site ||
        filters.status ||
        filters.dateFrom ||
        filters.dateTo
    );
}

/**
 * @description Converts the dateFrom/dateTo filter strings into a DateRange
 * object compatible with react-day-picker.
 * @param filters - The current filter state
 * @returns {DateRange | undefined} The date range, or undefined if no dates are set
 */
export function getDateRangeFromFilters(filters: ReviewFilters): DateRange | undefined {
    if (!filters.dateFrom && !filters.dateTo) return undefined;
    return {
        from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        to: filters.dateTo ? new Date(filters.dateTo) : undefined,
    };
}

/**
 * @description Formats a DateRange for display in the date picker trigger.
 * @param range - The date range to format
 * @returns {string} A human-readable date range string
 */
export function formatDateRange(range: DateRange | undefined): string {
    if (!range?.from) return "Select date range";
    if (!range.to) return format(range.from, "MMM d, yyyy");
    return `${format(range.from, "MMM d")} - ${format(range.to, "MMM d, yyyy")}`;
}

/**
 * @description Splits a list of studies into ongoing and completed groups.
 * @param studies - The full list of study options
 * @returns {{ ongoing: StudyOption[]; completed: StudyOption[] }} The grouped studies
 */
export function groupStudiesByStatus(studies: StudyOption[]) {
    return {
        ongoing: studies.filter((s) => s.status === "ongoing"),
        completed: studies.filter((s) => s.status === "completed"),
    };
}
