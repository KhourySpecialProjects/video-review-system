import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { toast } from "sonner";
import {
  fetchAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
} from "@/lib/annotation.service";

/**
 * @description Loader for the annotations resource route.
 * Fetches all annotations for a video.
 *
 * @param request - Request with videoId search param
 * @returns Object with annotations array
 */
export async function annotationsLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const videoId = url.searchParams.get("videoId") ?? "";

  const data = await fetchAnnotations(videoId);
  return { annotations: data.annotations };
}

/**
 * @description Action for the annotations resource route.
 * Handles create, update, and delete intents via form submission.
 * Shows success/error toasts for user feedback.
 *
 * @param request - Request with form data containing intent and payload
 * @returns Result object with success flag and optional data
 */
export async function annotationsAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  switch (intent) {
    case "create": {
      try {
        const payload = JSON.parse(formData.get("payload") as string);
        const annotation = await createAnnotation(payload);
        toast.success("Annotation created");
        return { ok: true, annotation };
      } catch {
        toast.error("Failed to create annotation");
        return { ok: false, error: "Failed to create annotation" };
      }
    }

    case "update": {
      try {
        const annotationId = formData.get("annotationId") as string;
        const payload = JSON.parse(formData.get("payload") as string);
        const annotation = await updateAnnotation(annotationId, payload);
        toast.success("Annotation updated");
        return { ok: true, annotation };
      } catch {
        toast.error("Failed to update annotation");
        return { ok: false, error: "Failed to update annotation" };
      }
    }

    case "delete": {
      try {
        const annotationId = formData.get("annotationId") as string;
        await deleteAnnotation(annotationId);
        toast.success("Annotation deleted");
        return { ok: true };
      } catch {
        toast.error("Failed to delete annotation");
        return { ok: false, error: "Failed to delete annotation" };
      }
    }

    default:
      return { ok: false, error: "Unknown intent" };
  }
}
