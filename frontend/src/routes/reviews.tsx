import { useLoaderData, useSearchParams } from "react-router";
import type { ReviewsLoaderData } from "@/features/reviews/types";
import { useReviewFilters } from "@/features/reviews/useReviewFilters";
import {
    getTotalPages,
    getPageNumbers,
    buildPageHref,
    DEFAULT_PAGE_SIZE,
} from "@/features/reviews/paginationUtils";
import { ReviewFilterBar, ReviewFilterBarSkeleton } from "@/features/reviews/ReviewFilterBar";
import { ReviewCard, ReviewCardSkeleton } from "@/features/reviews/ReviewCard";
import { ReviewPagination } from "@/features/reviews/ReviewPagination";
import { NoVideosEmpty, NoFilterResultsEmpty } from "@/features/reviews/ReviewEmptyStates";

/**
 * @description Reviews page for clinical reviewers.
 * Displays a filterable, searchable, paginated grid of assigned video review cards.
 */
export default function Reviews() {
    const { videos, totalCount, studies, sites, filters } =
        useLoaderData() as ReviewsLoaderData;
    const [searchParams] = useSearchParams();

    const {
        dateRange,
        hasActiveFilters,
        groupedStudies,
        handleFormChange,
        handleDateRangeChange,
        clearAllFilters,
    } = useReviewFilters(filters, studies);

    const currentPage = filters.page ?? 1;
    const totalPages = getTotalPages(totalCount, DEFAULT_PAGE_SIZE);
    const pages = getPageNumbers(currentPage, totalPages);

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
            <h1 className="text-2xl font-semibold">Reviews</h1>

            <ReviewFilterBar
                filters={filters}
                dateRange={dateRange}
                hasActiveFilters={hasActiveFilters}
                groupedStudies={groupedStudies}
                sites={sites}
                onFormChange={handleFormChange}
                onDateRangeChange={handleDateRangeChange}
                onClearAll={clearAllFilters}
            />

            {totalCount === 0 ? (
                hasActiveFilters ? (
                    <NoFilterResultsEmpty />
                ) : (
                    <NoVideosEmpty />
                )
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {videos.map((video) => (
                            <ReviewCard key={video.id} {...video} />
                        ))}
                    </div>

                    <ReviewPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        pages={pages}
                        buildHref={(page) => buildPageHref(searchParams, page)}
                    />
                </>
            )}
        </div>
    );
}

/**
 * @description Full-page skeleton shown during initial load of the reviews route.
 */
export function ReviewsPageSkeleton() {
    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            <ReviewFilterBarSkeleton />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: DEFAULT_PAGE_SIZE }, (_, i) => (
                    <ReviewCardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}
