import type { QueryClient } from "@tanstack/react-query";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { adminKeys } from "@/lib/queryClient";

/**
 * @description Loader for the study detail resource route. Fetches
 * eligible caregivers for the study (users at linked sites who are
 * not yet enrolled). Used by StudySheet's multi-select.
 *
 * @returns Loader function returning eligible users.
 */
export function studyDetailLoader() {
  return async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const studyId = url.searchParams.get("studyId");

    if (!studyId) {
      throw new Response("studyId is required", { status: 400 });
    }

    const res = await apiFetch(`/studies/${studyId}/eligible-users`);
    if (!res.ok) throw new Error("Failed to fetch eligible users");
    return res.json();
  };
}

/**
 * @description Action for study-related mutations: updating name/status,
 * adding caregivers, and removing caregivers. Invalidates only the
 * queries affected by each mutation.
 *
 * @param queryClient - The TanStack Query client for cache invalidation.
 * @returns Action function compatible with React Router.
 */
export function studyDetailAction(queryClient: QueryClient) {
  return async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    switch (intent) {
      case "updateStudy": {
        const studyId = formData.get("studyId") as string;
        const body: Record<string, string> = {};
        const name = formData.get("name");
        const status = formData.get("status");
        if (name) body.name = name as string;
        if (status) body.status = status as string;

        const res = await apiFetch(`/studies/${studyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          toast.error("Failed to update study");
          return { ok: false };
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["admin", "studies"] }),
          queryClient.invalidateQueries({ queryKey: adminKeys.stats() }),
        ]);
        toast.success("Study updated");
        return { ok: true };
      }

      case "addUsers": {
        const studyId = formData.get("studyId") as string;
        const userIds = formData.getAll("userIds") as string[];

        if (userIds.length === 0) {
          return { ok: false, error: "Select at least one user" };
        }

        const res = await apiFetch(`/studies/${studyId}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds }),
        });

        if (!res.ok) {
          toast.error("Failed to add users to study");
          return { ok: false };
        }

        await queryClient.invalidateQueries({ queryKey: ["admin", "studies"] });
        toast.success("Users added to study");
        return { ok: true };
      }

      case "removeUser": {
        const studyId = formData.get("studyId") as string;
        const userId = formData.get("userId") as string;

        const res = await apiFetch(`/studies/${studyId}/users/${userId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          toast.error("Failed to remove user from study");
          return { ok: false };
        }

        await queryClient.invalidateQueries({ queryKey: ["admin", "studies"] });
        toast.success("User removed from study");
        return { ok: true };
      }

      default:
        return { ok: false, error: "Unknown intent" };
    }
  };
}
