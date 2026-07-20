import type { QueryClient } from "@tanstack/react-query";
import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { adminKeys } from "@/lib/queryClient";
import { inviteUserSchema } from "./admin.schemas";

/**
 * @description Action for the invite user resource route. Validates form
 * data with Zod and sends the invitation via POST /api/domain/auth/invite.
 * On success, invalidates the users list and stats queries.
 *
 * @param queryClient - The TanStack Query client for cache invalidation.
 * @returns Action function compatible with React Router.
 */
export function inviteUserAction(queryClient: QueryClient) {
  return async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData();

    const raw = {
      email: formData.get("email"),
      role: formData.get("role"),
      siteId: formData.get("siteId"),
    };

    const parsed = inviteUserSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
    }

    const res = await apiFetch("/auth/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Failed to send invitation");
      return { ok: false, error: body.error };
    }

    const body = (await res.json().catch(() => ({}))) as {
      token?: string;
      expiresAt?: string;
    };

    await queryClient.invalidateQueries({ queryKey: adminKeys.all });
    // No success toast: the dialog surfaces a copyable signup link in-place so
    // the inviter can share it directly (email is also sent by the backend).
    return { ok: true, token: body.token, expiresAt: body.expiresAt };
  };
}
