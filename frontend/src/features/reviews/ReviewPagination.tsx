import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

type ReviewPaginationProps = {
    /** @param currentPage - The current 1-indexed page number */
    currentPage: number;
    /** @param totalPages - Total number of pages */
    totalPages: number;
    /** @param pages - Array of page numbers and ellipsis markers to render */
    pages: (number | "ellipsis")[];
    /** @param buildHref - Builds the href for a given page number */
    buildHref: (page: number) => string;
};

/**
 * @description Presentational pagination controls for the reviews grid.
 * Renders page links using anchor tags so navigation goes through the router loader.
 * Hidden when there is only one page or fewer.
 */
export function ReviewPagination({
    currentPage,
    totalPages,
    pages,
    buildHref,
}: ReviewPaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <Pagination>
            <PaginationContent>
                {currentPage > 1 && (
                    <PaginationItem>
                        <PaginationPrevious href={buildHref(currentPage - 1)} />
                    </PaginationItem>
                )}

                {pages.map((page, index) =>
                    page === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                        </PaginationItem>
                    ) : (
                        <PaginationItem key={page}>
                            <PaginationLink
                                href={buildHref(page)}
                                isActive={page === currentPage}
                            >
                                {page}
                            </PaginationLink>
                        </PaginationItem>
                    )
                )}

                {currentPage < totalPages && (
                    <PaginationItem>
                        <PaginationNext href={buildHref(currentPage + 1)} />
                    </PaginationItem>
                )}
            </PaginationContent>
        </Pagination>
    );
}
