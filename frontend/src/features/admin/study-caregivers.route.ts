import type { QueryClient } from "@tanstack/react-query";
import type { LoaderFunctionArgs } from "react-router";
import { siteCaregiversQuery } from "@/lib/admin.service";

/**
 * @description Loader for the caregivers-for-sites resource route.
 * Returns caregivers belonging to the comma-separated siteIds query
 * param. Used by the create-study dialog's caregiver picker via
 * useFetcher.load().
 *
 * @param queryClient - The TanStack Query client.
 * @returns Loader function that returns SiteCaregiversResponse.
 */
export function siteCaregiversLoader(queryClient: QueryClient) {
  return async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const siteIds = url.searchParams.get("siteIds");

    if (!siteIds) {
      throw new Response("siteIds is required", { status: 400 });
    }

    return queryClient.fetchQuery(siteCaregiversQuery(siteIds));
  };
}
