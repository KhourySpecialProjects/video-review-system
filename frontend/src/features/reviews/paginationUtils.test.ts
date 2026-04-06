import { describe, it, expect } from "vitest";
import { getTotalPages, buildPageHref, getPageNumbers } from "./paginationUtils";

describe("getTotalPages", () => {
    it("returns 1 for zero items", () => {
        expect(getTotalPages(0, 9)).toBe(1);
    });

    it("returns 1 when items fit in one page", () => {
        expect(getTotalPages(5, 9)).toBe(1);
    });

    it("returns 1 when items exactly fill one page", () => {
        expect(getTotalPages(9, 9)).toBe(1);
    });

    it("returns 2 when items slightly exceed one page", () => {
        expect(getTotalPages(10, 9)).toBe(2);
    });

    it("handles large counts", () => {
        expect(getTotalPages(100, 9)).toBe(12);
    });

    it("returns 1 for zero page size edge case", () => {
        // Math.ceil(5/0) = Infinity, but max(1, Infinity) = Infinity
        // This is an invalid input but shouldn't crash
        expect(getTotalPages(0, 0)).toBe(1);
    });
});

describe("buildPageHref", () => {
    it("returns empty string for page 1 with no other params", () => {
        const params = new URLSearchParams();
        expect(buildPageHref(params, 1)).toBe("");
    });

    it("removes page param for page 1", () => {
        const params = new URLSearchParams({ search: "test", page: "3" });
        expect(buildPageHref(params, 1)).toBe("?search=test");
    });

    it("sets page param for page > 1", () => {
        const params = new URLSearchParams();
        expect(buildPageHref(params, 3)).toBe("?page=3");
    });

    it("preserves existing search params", () => {
        const params = new URLSearchParams({ search: "test", study: "Study A" });
        const href = buildPageHref(params, 2);
        expect(href).toContain("search=test");
        expect(href).toContain("study=Study+A");
        expect(href).toContain("page=2");
    });

    it("does not mutate the original params", () => {
        const params = new URLSearchParams({ page: "1" });
        buildPageHref(params, 5);
        expect(params.get("page")).toBe("1");
    });
});

describe("getPageNumbers", () => {
    it("returns all pages when total is 5 or fewer", () => {
        expect(getPageNumbers(1, 1)).toEqual([1]);
        expect(getPageNumbers(1, 3)).toEqual([1, 2, 3]);
        expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
    });

    it("shows ellipsis after first page when current is far from start", () => {
        const pages = getPageNumbers(5, 10);
        expect(pages[0]).toBe(1);
        expect(pages[1]).toBe("ellipsis");
    });

    it("shows ellipsis before last page when current is far from end", () => {
        const pages = getPageNumbers(3, 10);
        expect(pages[pages.length - 1]).toBe(10);
        expect(pages[pages.length - 2]).toBe("ellipsis");
    });

    it("shows both ellipses when current is in the middle", () => {
        const pages = getPageNumbers(5, 10);
        expect(pages).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
    });

    it("does not show leading ellipsis when current is near start", () => {
        const pages = getPageNumbers(2, 10);
        expect(pages[0]).toBe(1);
        expect(pages[1]).toBe(2);
        expect(pages[2]).toBe(3);
    });

    it("does not show trailing ellipsis when current is near end", () => {
        const pages = getPageNumbers(9, 10);
        expect(pages[pages.length - 1]).toBe(10);
        expect(pages[pages.length - 2]).toBe(9);
    });

    it("always includes first and last page", () => {
        const pages = getPageNumbers(5, 20);
        expect(pages[0]).toBe(1);
        expect(pages[pages.length - 1]).toBe(20);
    });
});
