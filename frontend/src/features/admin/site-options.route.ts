import type { QueryClient } from "@tanstack/react-query";
import { siteOptionsQuery } from "@/lib/admin.service";

/**
 * @description Loader for the site options resource route. Returns the
 * minimal site list used to populate Select/Combobox controls. Used by
 * the invite-user dialog, create-study dialog, and user sheet via
 * useFetcher.load().
 *
 * @param queryClient - The TanStack Query client.
 * @returns Loader function that returns SiteOptionsResponse.
 */
export function siteOptionsLoader(queryClient: QueryClient) {
  return async () => queryClient.fetchQuery(siteOptionsQuery());
}
