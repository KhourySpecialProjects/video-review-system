import type { QueryClient } from "@tanstack/react-query";
import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { adminKeys } from "@/lib/queryClient";
import { createSiteSchema } from "./admin.schemas";

/**
 * @description Action for the create site resource route. Validates form
 * data with Zod and creates the site via POST /api/domain/sites.
 * On success, invalidates site list, stats, and site options queries.
 *
 * @param queryClient - The TanStack Query client for cache invalidation.
 * @returns Action function compatible with React Router.
 */
export function createSiteAction(queryClient: QueryClient) {
  return async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData();

    const raw = { name: formData.get("name") };

    const parsed = createSiteSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
    }

    const res = await apiFetch("/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Failed to create site");
      return { ok: false, error: body.error };
    }

    await queryClient.invalidateQueries({ queryKey: adminKeys.all });
    toast.success("Site created successfully");
    return { ok: true };
  };
}
