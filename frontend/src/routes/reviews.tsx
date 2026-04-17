import { Suspense } from "react";
import { Await, useLoaderData, useSearchParams } from "react-router";
import type { ReviewsResponse } from "@shared/review";
import type { ReviewFilters, ReviewsLoaderData } from "@/features/reviews/types";
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
 * @description Reviews page for clinical reviewers. The filter state is
 * available immediately from the URL; the video list streams in via
 * `<Suspense>` + `<Await>` so the skeleton paints without blocking.
 */
export default function Reviews() {
    const { dataPromise, filters } = useLoaderData() as ReviewsLoaderData;

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
            <h1 className="text-2xl font-semibold">Reviews</h1>

            <Suspense fallback={<ReviewsBodySkeleton />}>
                <Await resolve={dataPromise}>
                    {(data: ReviewsResponse) => (
                        <ReviewsBody data={data} filters={filters} />
                    )}
                </Await>
            </Suspense>
        </div>
    );
}

/**
 * @description Renders the filter bar, video grid, and pagination once
 * the deferred loader promise resolves.
 * @param data - Resolved reviews response from the backend
 * @param filters - Parsed filter state from the URL
 */
function ReviewsBody({
    data,
    filters,
}: {
    data: ReviewsResponse;
    filters: ReviewFilters;
}) {
    const { videos, totalCount, studies, sites } = data;
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
        <>
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
        </>
    );
}

/**
 * @description Suspense fallback for the reviews body. Shown while the
 * deferred loader promise is in flight.
 */
function ReviewsBodySkeleton() {
    return (
        <>
            <ReviewFilterBarSkeleton />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: DEFAULT_PAGE_SIZE }, (_, i) => (
                    <ReviewCardSkeleton key={i} />
                ))}
            </div>
        </>
    );
}

/**
 * @description Full-page skeleton for the reviews route. Exported for
 * callers that want to render the skeleton outside of a `<Suspense>`
 * boundary (e.g. during lazy route transitions).
 */
export function ReviewsPageSkeleton() {
    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            <ReviewsBodySkeleton />
        </div>
    );
}
