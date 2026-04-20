import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchClips, createClip, updateClip, deleteClip } from "@/lib/clip.service";
import { reviewKeys } from "@/lib/queryClient";

/**
 * @description Loader for the clips resource route.
 * Fetches all clips for a video within a study.
 *
 * @param request - Request with videoId and studyId search params
 * @returns Object with clips array
 */
export async function clipsLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const videoId = url.searchParams.get("videoId") ?? "";
  const studyId = url.searchParams.get("studyId") ?? "";

  const data = await fetchClips(videoId, studyId);
  return { clips: data.clips };
}

/**
 * @description Action factory for the clips resource route. Takes the shared
 * `queryClient` so the action can invalidate the relevant review-page
 * queries after a successful mutation — avoiding a full route revalidation.
 *
 * @param queryClient - The shared TanStack QueryClient
 * @returns The action handler React Router will call
 */
export function clipsAction(queryClient: QueryClient) {
  return async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    switch (intent) {
      case "create": {
        try {
          const payload = JSON.parse(formData.get("payload") as string);
          const clip = await createClip(payload);
          toast.success(`Clip "${payload.title}" created`);
          await queryClient.invalidateQueries({
            queryKey: reviewKeys.clips(payload.sourceVideoId, payload.studyId),
          });
          return { ok: true, clip };
        } catch {
          toast.error("Failed to create clip");
          return { ok: false, error: "Failed to create clip" };
        }
      }

      case "update": {
        try {
          const clipId = formData.get("clipId") as string;
          const payload = JSON.parse(formData.get("payload") as string);
          const clip = await updateClip(clipId, payload);
          toast.success("Clip updated");
          await queryClient.invalidateQueries({
            queryKey: reviewKeys.clipsAll(),
          });
          return { ok: true, clip };
        } catch {
          toast.error("Failed to update clip");
          return { ok: false, error: "Failed to update clip" };
        }
      }

      case "delete": {
        try {
          const clipId = formData.get("clipId") as string;
          await deleteClip(clipId);
          toast.success("Clip deleted");
          // Clip deletion implicitly removes it from sequences, so invalidate both.
          await queryClient.invalidateQueries({ queryKey: reviewKeys.clipsAll() });
          await queryClient.invalidateQueries({ queryKey: reviewKeys.sequencesAll() });
          return { ok: true };
        } catch {
          toast.error("Failed to delete clip");
          return { ok: false, error: "Failed to delete clip" };
        }
      }

      default:
        return { ok: false, error: "Unknown intent" };
    }
  };
}
