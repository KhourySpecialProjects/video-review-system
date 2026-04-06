import type { LoaderFunctionArgs } from "react-router";
import type { ReviewsLoaderData } from "./types";
import { parseFiltersFromParams } from "./filterUtils";

/**
 * @description Loader for the /reviews route.
 * Parses filter and pagination search params from the request URL.
 * Returns an empty dataset for now since the backend API does not exist yet.
 * @param {LoaderFunctionArgs} args - Route loader arguments
 * @returns {Promise<ReviewsLoaderData>} The loader data for the reviews page
 */
export async function reviewsLoader({ request }: LoaderFunctionArgs): Promise<ReviewsLoaderData> {
    const url = new URL(request.url);
    const filters = parseFiltersFromParams(url.searchParams);

    // TODO: Replace with actual API call when backend is ready
    // e.g. const response = await fetch(`/api/reviews?${url.searchParams}`, { signal: request.signal });
    return {
        videos: [],
        totalCount: 0,
        studies: [],
        sites: [],
        filters,
    };
}
