import type { QueryClient } from "@tanstack/react-query";
import type { LoaderFunctionArgs } from "react-router";
import { adminUserDetailQuery } from "@/lib/admin.service";

/**
 * @description Loader for the user detail resource route. Fetches a
 * single user's detail (including permissions) by userId from the
 * search params. Used by the UserSheet via useFetcher.load().
 *
 * @param queryClient - The TanStack Query client.
 * @returns Loader function that returns UserDetailResponse.
 */
export function userDetailLoader(queryClient: QueryClient) {
  return async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      throw new Response("userId is required", { status: 400 });
    }

    return queryClient.fetchQuery(adminUserDetailQuery(userId));
  };
}
