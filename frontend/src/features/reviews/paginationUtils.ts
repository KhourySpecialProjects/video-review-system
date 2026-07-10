/** @description Number of cards per page at each responsive breakpoint */
export const PAGE_SIZES = {
    /** @param sm - 1 column x 4 rows */
    sm: 4,
    /** @param md - 2 columns x 3 rows */
    md: 6,
    /** @param lg - 3 columns x 3 rows */
    lg: 9,
} as const;

/** @description Default page size used for loader calculations */
export const DEFAULT_PAGE_SIZE = PAGE_SIZES.lg;

/**
 * @description Calculates the total number of pages from the total item count and page size.
 * @param totalCount - Total number of items
 * @param pageSize - Number of items per page
 * @returns {number} Total number of pages (minimum 1)
 */
export function getTotalPages(totalCount: number, pageSize: number): number {
    if (pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(totalCount / pageSize));
}

/**
 * @description Builds the href for a pagination link by merging the page
 * number into the current search params.
 * @param searchParams - Current URL search params
 * @param page - Target page number
 * @returns {string} URL search string with the updated page param
 */
export function buildPageHref(searchParams: URLSearchParams, page: number): string {
    const params = new URLSearchParams(searchParams);
    if (page <= 1) {
        params.delete("page");
    } else {
        params.set("page", String(page));
    }
    const search = params.toString();
    return search ? `?${search}` : "";
}

/**
 * @description Generates the array of page numbers to display in pagination,
 * including ellipsis placeholders for gaps.
 * Always shows the first page, last page, and a window around the current page.
 * @param currentPage - The active page
 * @param totalPages - Total number of pages
 * @returns {(number | "ellipsis")[]} Page numbers and ellipsis markers
 */
export function getPageNumbers(
    currentPage: number,
    totalPages: number
): (number | "ellipsis")[] {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "ellipsis")[] = [1];

    if (currentPage > 3) {
        pages.push("ellipsis");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
    }

    pages.push(totalPages);
    return pages;
}
