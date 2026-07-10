import type { QueryClient } from "@tanstack/react-query";
import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { adminKeys } from "@/lib/queryClient";
import { createStudyWithEnrollmentSchema } from "./admin.schemas";

/**
 * @description Action for the create study resource route. Validates
 * form data with Zod and creates the study with multi-site linking
 * and optional caregiver enrollment via POST /api/domain/studies/with-enrollment.
 *
 * @param queryClient - The TanStack Query client for cache invalidation.
 * @returns Action function compatible with React Router.
 */
export function createStudyAction(queryClient: QueryClient) {
  return async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData();

    const raw = {
      name: formData.get("name"),
      siteIds: formData.getAll("siteIds"),
      addAllCaregivers: formData.get("addAllCaregivers") === "true",
      caregiverUserIds: formData.getAll("caregiverUserIds"),
    };

    const parsed = createStudyWithEnrollmentSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      };
    }

    const res = await apiFetch("/studies/with-enrollment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Failed to create study");
      return { ok: false, error: body.error };
    }

    await queryClient.invalidateQueries({ queryKey: adminKeys.all });
    toast.success("Study created successfully");
    return { ok: true };
  };
}
