import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ReviewPagination } from "./ReviewPagination";

/**
 * @description Helper to render ReviewPagination with default props.
 */
function renderPagination(overrides: Partial<{
    currentPage: number;
    totalPages: number;
    pages: (number | "ellipsis")[];
    buildHref: (page: number) => string;
}> = {}) {
    const defaults = {
        currentPage: 1,
        totalPages: 5,
        pages: [1, 2, 3, 4, 5],
        buildHref: (page: number) => `?page=${page}`,
    };
    const props = { ...defaults, ...overrides };

    return render(
        <MemoryRouter>
            <ReviewPagination {...props} />
        </MemoryRouter>
    );
}

describe("ReviewPagination", () => {
    it("renders nothing when totalPages is 1", () => {
        const { container } = renderPagination({ totalPages: 1 });
        expect(container.innerHTML).toBe("");
    });

    it("renders nothing when totalPages is 0", () => {
        const { container } = renderPagination({ totalPages: 0, pages: [] });
        expect(container.innerHTML).toBe("");
    });

    it("renders page links for each page number", () => {
        renderPagination({ pages: [1, 2, 3] });
        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("marks the current page as active", () => {
        renderPagination({ currentPage: 2, pages: [1, 2, 3] });
        const activeLink = screen.getByText("2").closest("a");
        expect(activeLink).toHaveAttribute("aria-current", "page");
    });

    it("does not show previous button on first page", () => {
        renderPagination({ currentPage: 1 });
        expect(screen.queryByLabelText("Go to previous page")).not.toBeInTheDocument();
    });

    it("shows previous button when not on first page", () => {
        renderPagination({ currentPage: 2 });
        expect(screen.getByLabelText("Go to previous page")).toBeInTheDocument();
    });

    it("does not show next button on last page", () => {
        renderPagination({ currentPage: 5, totalPages: 5 });
        expect(screen.queryByLabelText("Go to next page")).not.toBeInTheDocument();
    });

    it("shows next button when not on last page", () => {
        renderPagination({ currentPage: 3, totalPages: 5 });
        expect(screen.getByLabelText("Go to next page")).toBeInTheDocument();
    });

    it("renders ellipsis markers", () => {
        renderPagination({
            currentPage: 5,
            totalPages: 10,
            pages: [1, "ellipsis", 4, 5, 6, "ellipsis", 10],
        });
        const ellipses = screen.getAllByText("More pages");
        expect(ellipses).toHaveLength(2);
    });

    it("applies buildHref to page links", () => {
        renderPagination({
            pages: [1, 2],
            buildHref: (page) => `/reviews?page=${page}`,
        });
        const link = screen.getByText("2").closest("a");
        expect(link).toHaveAttribute("href", "/reviews?page=2");
    });
});
