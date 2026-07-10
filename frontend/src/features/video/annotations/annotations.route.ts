import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
} from "@/lib/annotation.service";
import { reviewKeys } from "@/lib/queryClient";

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
 * @description Action factory for the annotations resource route. Takes the
 * shared `queryClient` so successful mutations can invalidate the cached
 * annotations query for the relevant video.
 *
 * @param queryClient - The shared TanStack QueryClient
 * @returns The action handler React Router will call
 */
export function annotationsAction(queryClient: QueryClient) {
  return async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    switch (intent) {
      case "create": {
        try {
          const payload = JSON.parse(formData.get("payload") as string);
          const annotation = await createAnnotation(payload);
          toast.success("Annotation created");
          await queryClient.invalidateQueries({
            queryKey: reviewKeys.annotations(payload.videoId),
          });
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
          await queryClient.invalidateQueries({
            queryKey: reviewKeys.annotationsAll(),
          });
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
          await queryClient.invalidateQueries({
            queryKey: reviewKeys.annotationsAll(),
          });
          return { ok: true };
        } catch {
          toast.error("Failed to delete annotation");
          return { ok: false, error: "Failed to delete annotation" };
        }
      }

      default:
        return { ok: false, error: "Unknown intent" };
    }
  };
}
