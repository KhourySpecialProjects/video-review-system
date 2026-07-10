import type { LoaderFunctionArgs } from "react-router";
import type { ReviewsResponse } from "@shared/review";
import type { ReviewsLoaderData } from "./types";
import { parseFiltersFromParams } from "./filterUtils";
import { apiFetch } from "@/lib/api";

/**
 * @description Fetches the reviews page data from `GET /api/domain/reviews`
 * (apiFetch prepends the `/api/domain` base). Forwards the current URL's
 * search params and abort signal so the backend sees the same filters the
 * page is rendering.
 * @param request - The loader Request
 * @returns The backend response
 * @throws {Response} On non-2xx responses
 */
async function fetchReviews(request: Request): Promise<ReviewsResponse> {
    const url = new URL(request.url);
    const res = await apiFetch(`/reviews?${url.searchParams}`, {
        signal: request.signal,
    });
    if (!res.ok) {
        throw new Response("Failed to load reviews", { status: res.status });
    }
    return res.json();
}

/**
 * @description Loader for the /reviews route. Returns the parsed filters
 * immediately and the backend response as a deferred promise so the page
 * can render a skeleton via `<Suspense>` + `<Await>` while the request
 * is in flight.
 * @param args - Route loader arguments
 * @returns Loader data with a deferred `dataPromise`
 */
export function reviewsLoader({ request }: LoaderFunctionArgs): ReviewsLoaderData {
    const url = new URL(request.url);
    const filters = parseFiltersFromParams(url.searchParams);
    return { dataPromise: fetchReviews(request), filters };
}
