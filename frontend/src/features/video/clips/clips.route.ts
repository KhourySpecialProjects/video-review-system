import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { toast } from "sonner";
import { fetchClips, createClip, updateClip, deleteClip } from "@/lib/clip.service";

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
 * @description Action for the clips resource route.
 * Handles create, update, and delete intents via form submission.
 * Shows success/error toasts for user feedback.
 *
 * @param request - Request with form data containing intent and payload
 * @returns Result object with success flag and optional data
 */
export async function clipsAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  switch (intent) {
    case "create": {
      try {
        const payload = JSON.parse(formData.get("payload") as string);
        const clip = await createClip(payload);
        toast.success(`Clip "${payload.title}" created`);
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
        return { ok: true };
      } catch {
        toast.error("Failed to delete clip");
        return { ok: false, error: "Failed to delete clip" };
      }
    }

    default:
      return { ok: false, error: "Unknown intent" };
  }
}
