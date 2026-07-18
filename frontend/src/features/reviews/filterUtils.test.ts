import { describe, it, expect } from "vitest";
import {
    parseFiltersFromParams,
    hasActiveFilters,
    getDateRangeFromFilters,
    formatDateRange,
    groupStudiesByStatus,
    buildDateRangeParams,
    REVIEW_STATUS_OPTIONS,
} from "./filterUtils";
import type { StudyOption } from "./types";

describe("parseFiltersFromParams", () => {
    it("returns all undefined for empty search params", () => {
        const params = new URLSearchParams();
        const result = parseFiltersFromParams(params);

        expect(result.search).toBeUndefined();
        expect(result.study).toBeUndefined();
        expect(result.site).toBeUndefined();
        expect(result.status).toBeUndefined();
        expect(result.dateFrom).toBeUndefined();
        expect(result.dateTo).toBeUndefined();
        expect(result.page).toBeUndefined();
    });

    it("parses all recognized filter keys", () => {
        const params = new URLSearchParams({
            search: "breakfast",
            study: "Study A",
            site: "Hospital X",
            status: "in review",
            dateFrom: "2026-01-01T00:00:00Z",
            dateTo: "2026-02-01T00:00:00Z",
            page: "3",
        });
        const result = parseFiltersFromParams(params);

        expect(result.search).toBe("breakfast");
        expect(result.study).toBe("Study A");
        expect(result.site).toBe("Hospital X");
        expect(result.status).toBe("in review");
        expect(result.dateFrom).toBe("2026-01-01T00:00:00Z");
        expect(result.dateTo).toBe("2026-02-01T00:00:00Z");
        expect(result.page).toBe(3);
    });

    it("ignores unrecognized search params", () => {
        const params = new URLSearchParams({ foo: "bar", search: "test" });
        const result = parseFiltersFromParams(params);

        expect(result.search).toBe("test");
        expect((result as Record<string, unknown>)["foo"]).toBeUndefined();
    });

    it("drops an unrecognized status value instead of forwarding it", () => {
        const params = new URLSearchParams({ status: "bogus" });
        expect(parseFiltersFromParams(params).status).toBeUndefined();
    });

    it("keeps every valid status value", () => {
        for (const status of REVIEW_STATUS_OPTIONS) {
            const params = new URLSearchParams({ status });
            expect(parseFiltersFromParams(params).status).toBe(status);
        }
    });

    it("parses page as a number", () => {
        const params = new URLSearchParams({ page: "5" });
        expect(parseFiltersFromParams(params).page).toBe(5);
    });

    it("returns undefined page when page param is absent", () => {
        const params = new URLSearchParams({ search: "test" });
        expect(parseFiltersFromParams(params).page).toBeUndefined();
    });
});

describe("hasActiveFilters", () => {
    it("returns false when no filters are set", () => {
        expect(hasActiveFilters({})).toBe(false);
    });

    it("returns true when search is set", () => {
        expect(hasActiveFilters({ search: "test" })).toBe(true);
    });

    it("returns true when study is set", () => {
        expect(hasActiveFilters({ study: "Study A" })).toBe(true);
    });

    it("returns true when site is set", () => {
        expect(hasActiveFilters({ site: "Hospital X" })).toBe(true);
    });

    it("returns true when status is set", () => {
        expect(hasActiveFilters({ status: "reviewed" })).toBe(true);
    });

    it("returns true when dateFrom is set", () => {
        expect(hasActiveFilters({ dateFrom: "2026-01-01" })).toBe(true);
    });

    it("returns true when dateTo is set", () => {
        expect(hasActiveFilters({ dateTo: "2026-02-01" })).toBe(true);
    });

    it("returns false when only page is set", () => {
        expect(hasActiveFilters({ page: 2 })).toBe(false);
    });
});

describe("getDateRangeFromFilters", () => {
    it("returns undefined when no dates are set", () => {
        expect(getDateRangeFromFilters({})).toBeUndefined();
    });

    it("returns range with only from date", () => {
        const result = getDateRangeFromFilters({ dateFrom: "2026-01-15T00:00:00Z" });
        expect(result?.from).toEqual(new Date("2026-01-15T00:00:00Z"));
        expect(result?.to).toBeUndefined();
    });

    it("returns range with only to date", () => {
        const result = getDateRangeFromFilters({ dateTo: "2026-02-15T00:00:00Z" });
        expect(result?.from).toBeUndefined();
        expect(result?.to).toEqual(new Date("2026-02-15T00:00:00Z"));
    });

    it("returns full range when both dates are set", () => {
        const result = getDateRangeFromFilters({
            dateFrom: "2026-01-01T00:00:00Z",
            dateTo: "2026-02-01T00:00:00Z",
        });
        expect(result?.from).toEqual(new Date("2026-01-01T00:00:00Z"));
        expect(result?.to).toEqual(new Date("2026-02-01T00:00:00Z"));
    });
});

describe("buildDateRangeParams", () => {
    it("returns no params when the range is undefined", () => {
        expect(buildDateRangeParams(undefined)).toEqual({});
    });

    it("emits only dateFrom when the range has no end", () => {
        const result = buildDateRangeParams({ from: new Date(2026, 0, 10), to: undefined });
        expect(result.dateTo).toBeUndefined();
        // dateFrom is the start of the selected day.
        expect(new Date(result.dateFrom!).getTime()).toBe(new Date(2026, 0, 10).getTime());
    });

    it("makes dateTo inclusive of the entire end day", () => {
        // Reviewer picks Jan 15 as the end of the range.
        const result = buildDateRangeParams({ from: new Date(2026, 0, 10), to: new Date(2026, 0, 15) });
        const dateTo = new Date(result.dateTo!).getTime();

        // A video uploaded late on Jan 15 must fall inside the range...
        expect(new Date(2026, 0, 15, 23, 30).getTime()).toBeLessThanOrEqual(dateTo);
        // ...but the range must stop before Jan 16 begins.
        expect(new Date(2026, 0, 16, 0, 0).getTime()).toBeGreaterThan(dateTo);
    });

    it("normalizes dateFrom to the start of the selected day", () => {
        // A from-date carrying a time component still anchors to midnight.
        const result = buildDateRangeParams({ from: new Date(2026, 0, 10, 14, 30), to: undefined });
        expect(new Date(result.dateFrom!).getTime()).toBe(new Date(2026, 0, 10).getTime());
    });
});

describe("formatDateRange", () => {
    it("returns placeholder when range is undefined", () => {
        expect(formatDateRange(undefined)).toBe("Select date range");
    });

    it("returns placeholder when from is undefined", () => {
        expect(formatDateRange({ from: undefined, to: undefined })).toBe("Select date range");
    });

    it("formats single date when only from is set", () => {
        const result = formatDateRange({ from: new Date(2026, 0, 15), to: undefined });
        expect(result).toBe("Jan 15, 2026");
    });

    it("formats date range when both from and to are set", () => {
        const result = formatDateRange({
            from: new Date(2026, 0, 1),
            to: new Date(2026, 1, 15),
        });
        expect(result).toBe("Jan 1 - Feb 15, 2026");
    });
});

describe("groupStudiesByStatus", () => {
    it("returns empty groups for empty input", () => {
        const result = groupStudiesByStatus([]);
        expect(result.ongoing).toEqual([]);
        expect(result.completed).toEqual([]);
    });

    it("groups studies by status", () => {
        const studies: StudyOption[] = [
            { name: "Study A", status: "ongoing" },
            { name: "Study B", status: "completed" },
            { name: "Study C", status: "ongoing" },
        ];
        const result = groupStudiesByStatus(studies);

        expect(result.ongoing).toHaveLength(2);
        expect(result.ongoing[0].name).toBe("Study A");
        expect(result.ongoing[1].name).toBe("Study C");
        expect(result.completed).toHaveLength(1);
        expect(result.completed[0].name).toBe("Study B");
    });

    it("handles all ongoing studies", () => {
        const studies: StudyOption[] = [
            { name: "Study A", status: "ongoing" },
            { name: "Study B", status: "ongoing" },
        ];
        const result = groupStudiesByStatus(studies);
        expect(result.ongoing).toHaveLength(2);
        expect(result.completed).toHaveLength(0);
    });

    it("handles all completed studies", () => {
        const studies: StudyOption[] = [
            { name: "Study A", status: "completed" },
        ];
        const result = groupStudiesByStatus(studies);
        expect(result.ongoing).toHaveLength(0);
        expect(result.completed).toHaveLength(1);
    });
});

describe("REVIEW_STATUS_OPTIONS", () => {
    it("contains all three statuses", () => {
        expect(REVIEW_STATUS_OPTIONS).toEqual(["not reviewed", "in review", "reviewed"]);
    });
});
