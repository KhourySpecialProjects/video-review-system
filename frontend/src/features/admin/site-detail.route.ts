import type { QueryClient } from "@tanstack/react-query";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { adminKeys } from "@/lib/queryClient";
import { adminSiteDetailQuery } from "@/lib/admin.service";
import { createStudySchema } from "./admin.schemas";

/**
 * @description Loader for the site detail resource route. Fetches a
 * single site's detail (including users and studies) by siteId from
 * the search params. Used by the SiteSheet via useFetcher.load().
 *
 * @param queryClient - The TanStack Query client.
 * @returns Loader function that returns SiteDetailResponse.
 */
export function siteDetailLoader(queryClient: QueryClient) {
  return async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");

    if (!siteId) {
      throw new Response("siteId is required", { status: 400 });
    }

    return queryClient.fetchQuery(adminSiteDetailQuery(siteId));
  };
}

/**
 * @description Invalidates the queries affected by a study being added
 * to or removed from a site: the site detail, study/site lists, and stats.
 *
 * @param queryClient - The TanStack Query client.
 * @param siteId - The site whose detail should be refetched.
 */
async function invalidateStudySiteQueries(
  queryClient: QueryClient,
  siteId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: adminKeys.siteDetail(siteId) }),
    queryClient.invalidateQueries({ queryKey: ["admin", "studies"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "sites"] }),
    queryClient.invalidateQueries({ queryKey: adminKeys.stats() }),
    queryClient.invalidateQueries({ queryKey: ["admin", "chart", "studies"] }),
  ]);
}

/**
 * @description Action for site-related mutations. Handles adding studies
 * to a site and unlinking studies from a site. Only invalidates the
 * specific queries affected by each mutation.
 *
 * @param queryClient - The TanStack Query client for cache invalidation.
 * @returns Action function compatible with React Router.
 */
export function siteDetailAction(queryClient: QueryClient) {
  return async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    switch (intent) {
      case "addStudy": {
        const raw = {
          name: formData.get("name"),
          siteId: formData.get("siteId"),
        };

        const parsed = createStudySchema.safeParse(raw);
        if (!parsed.success) {
          return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
        }

        const res = await apiFetch("/studies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          toast.error(body.error ?? "Failed to add study");
          return { ok: false, error: body.error };
        }

        await invalidateStudySiteQueries(queryClient, parsed.data.siteId);
        toast.success("Study added to site");
        return { ok: true };
      }

      case "unlinkStudy": {
        const siteId = formData.get("siteId") as string;
        const studyId = formData.get("studyId") as string;

        const res = await apiFetch(`/sites/${siteId}/studies/${studyId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          toast.error("Failed to remove study from site");
          return { ok: false };
        }

        await invalidateStudySiteQueries(queryClient, siteId);
        toast.success("Study removed from site");
        return { ok: true };
      }

      default:
        return { ok: false, error: "Unknown intent" };
    }
  };
}
