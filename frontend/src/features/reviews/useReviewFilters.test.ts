import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReviewFilters, StudyOption } from "./types";

const submitMock = vi.fn();
let currentParams = new URLSearchParams();

vi.mock("react-router", () => ({
    useSubmit: () => submitMock,
    useSearchParams: () => [currentParams, vi.fn()] as const,
}));

// Imported after the mock so the hook picks up the mocked router bindings.
import { useReviewFilters } from "./useReviewFilters";

const studies: StudyOption[] = [
    { name: "Study A", status: "ongoing" },
    { name: "Study B", status: "completed" },
];

/**
 * @description Renders the hook with the given filters and the module-level
 * `currentParams` as the current URL search params.
 * @param filters - Current filters (from loader data)
 */
function renderFilters(filters: ReviewFilters = {}) {
    return renderHook(() => useReviewFilters(filters, studies)).result;
}

/**
 * @description The URLSearchParams handed to the most recent `submit` call,
 * as a plain object for easy assertions.
 */
function lastSubmittedParams(): Record<string, string> {
    const [params] = submitMock.mock.calls.at(-1)!;
    return Object.fromEntries((params as URLSearchParams).entries());
}

beforeEach(() => {
    submitMock.mockReset();
    currentParams = new URLSearchParams();
});

describe("useReviewFilters", () => {
    describe("updateFilter", () => {
        it("sets the given filter param", () => {
            const result = renderFilters();
            result.current.updateFilter("study", "Study A");

            expect(submitMock).toHaveBeenCalledTimes(1);
            expect(lastSubmittedParams().study).toBe("Study A");
        });

        it("resets pagination when a filter changes", () => {
            currentParams = new URLSearchParams({ page: "4" });
            const result = renderFilters({ page: 4 });

            result.current.updateFilter("status", "reviewed");

            const submitted = lastSubmittedParams();
            expect(submitted.status).toBe("reviewed");
            expect(submitted.page).toBeUndefined();
        });

        it("preserves unrelated existing params", () => {
            currentParams = new URLSearchParams({ search: "falls" });
            const result = renderFilters({ search: "falls" });

            result.current.updateFilter("site", "Boston");

            const submitted = lastSubmittedParams();
            expect(submitted.search).toBe("falls");
            expect(submitted.site).toBe("Boston");
        });

        it("removes the param when the value is null", () => {
            currentParams = new URLSearchParams({ study: "Study A" });
            const result = renderFilters({ study: "Study A" });

            result.current.updateFilter("study", null);

            expect(lastSubmittedParams().study).toBeUndefined();
        });

        it("removes the param when the value is an empty string", () => {
            currentParams = new URLSearchParams({ study: "Study A" });
            const result = renderFilters({ study: "Study A" });

            result.current.updateFilter("study", "");

            expect(lastSubmittedParams().study).toBeUndefined();
        });
    });

    describe("handleDateRangeChange", () => {
        it("emits an end-of-day-inclusive dateTo and resets pagination", () => {
            currentParams = new URLSearchParams({ page: "3" });
            const result = renderFilters({ page: 3 });

            result.current.handleDateRangeChange({
                from: new Date(2026, 0, 10),
                to: new Date(2026, 0, 15),
            });

            const submitted = lastSubmittedParams();
            expect(submitted.page).toBeUndefined();

            const dateTo = new Date(submitted.dateTo).getTime();
            // A late upload on Jan 15 is still inside the range...
            expect(new Date(2026, 0, 15, 23, 30).getTime()).toBeLessThanOrEqual(dateTo);
            // ...but Jan 16 is excluded.
            expect(new Date(2026, 0, 16, 0, 0).getTime()).toBeGreaterThan(dateTo);
        });

        it("clears both date params when the range is undefined", () => {
            currentParams = new URLSearchParams({
                dateFrom: "2026-01-10T00:00:00.000Z",
                dateTo: "2026-01-15T23:59:59.999Z",
            });
            const result = renderFilters({
                dateFrom: "2026-01-10T00:00:00.000Z",
                dateTo: "2026-01-15T23:59:59.999Z",
            });

            result.current.handleDateRangeChange(undefined);

            const submitted = lastSubmittedParams();
            expect(submitted.dateFrom).toBeUndefined();
            expect(submitted.dateTo).toBeUndefined();
        });
    });

    describe("clearAllFilters", () => {
        it("submits empty params", () => {
            currentParams = new URLSearchParams({ study: "Study A", page: "2" });
            const result = renderFilters({ study: "Study A", page: 2 });

            result.current.clearAllFilters();

            expect(lastSubmittedParams()).toEqual({});
        });
    });

    describe("derived state", () => {
        it("reports active filters and groups studies by status", () => {
            const result = renderFilters({ study: "Study A" });

            expect(result.current.hasActiveFilters).toBe(true);
            expect(result.current.groupedStudies.ongoing).toHaveLength(1);
            expect(result.current.groupedStudies.completed).toHaveLength(1);
        });

        it("reports no active filters when only page is set", () => {
            const result = renderFilters({ page: 2 });
            expect(result.current.hasActiveFilters).toBe(false);
        });
    });
});
