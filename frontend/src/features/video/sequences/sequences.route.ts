import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchSequences,
  createSequence,
  updateSequence,
  addClipToSequence,
  removeClipFromSequence,
  reorderSequence,
  deleteSequence,
} from "@/lib/sequence.service";
import { reviewKeys } from "@/lib/queryClient";

/**
 * @description Loader for the sequences resource route.
 * Fetches all sequences for a video within a study.
 *
 * @param request - Request with videoId and studyId search params
 * @returns Object with sequences array
 */
export async function sequencesLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const videoId = url.searchParams.get("videoId") ?? "";
  const studyId = url.searchParams.get("studyId") ?? "";

  const data = await fetchSequences(videoId, studyId);
  return { sequences: data.sequences };
}

/**
 * @description Action factory for the sequences resource route. Takes the
 * shared `queryClient` so successful mutations can invalidate the cached
 * sequences query for the relevant (video, study) pair. Intents that
 * don't carry videoId/studyId in form data invalidate the broader
 * "sequences" subtree — safe because sequences are always scoped under it.
 *
 * @param queryClient - The shared TanStack QueryClient
 * @returns The action handler React Router will call
 */
export function sequencesAction(queryClient: QueryClient) {
  return async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData();
    const intent = formData.get("intent") as string;
    const invalidateAll = () =>
      queryClient.invalidateQueries({ queryKey: reviewKeys.sequencesAll() });

    switch (intent) {
      case "create": {
        try {
          const payload = JSON.parse(formData.get("payload") as string);
          const sequence = await createSequence(payload);
          toast.success(`Sequence "${payload.title}" created`);
          await queryClient.invalidateQueries({
            queryKey: reviewKeys.sequences(payload.videoId, payload.studyId),
          });
          return { ok: true, sequence };
        } catch {
          toast.error("Failed to create sequence");
          return { ok: false, error: "Failed to create sequence" };
        }
      }

      case "update": {
        try {
          const sequenceId = formData.get("sequenceId") as string;
          const title = formData.get("title") as string;
          const sequence = await updateSequence(sequenceId, title);
          toast.success("Sequence renamed");
          await invalidateAll();
          return { ok: true, sequence };
        } catch {
          toast.error("Failed to rename sequence");
          return { ok: false, error: "Failed to rename sequence" };
        }
      }

      case "addClip": {
        try {
          const sequenceId = formData.get("sequenceId") as string;
          const clipId = formData.get("clipId") as string;
          const playOrder = Number(formData.get("playOrder"));
          const result = await addClipToSequence(sequenceId, clipId, playOrder);
          toast.success("Clip added to sequence");
          await invalidateAll();
          return { ok: true, item: result };
        } catch {
          toast.error("Failed to add clip to sequence");
          return { ok: false, error: "Failed to add clip to sequence" };
        }
      }

      case "removeClip": {
        try {
          const sequenceId = formData.get("sequenceId") as string;
          const clipId = formData.get("clipId") as string;
          await removeClipFromSequence(sequenceId, clipId);
          toast.success("Clip removed from sequence");
          await invalidateAll();
          return { ok: true };
        } catch {
          toast.error("Failed to remove clip from sequence");
          return { ok: false, error: "Failed to remove clip from sequence" };
        }
      }

      case "reorder": {
        try {
          const sequenceId = formData.get("sequenceId") as string;
          const items = JSON.parse(formData.get("items") as string);
          const sequence = await reorderSequence(sequenceId, items);
          toast.success("Sequence reordered");
          await invalidateAll();
          return { ok: true, sequence };
        } catch {
          toast.error("Failed to reorder sequence");
          return { ok: false, error: "Failed to reorder sequence" };
        }
      }

      case "delete": {
        try {
          const sequenceId = formData.get("sequenceId") as string;
          await deleteSequence(sequenceId);
          toast.success("Sequence deleted");
          await invalidateAll();
          return { ok: true };
        } catch {
          toast.error("Failed to delete sequence");
          return { ok: false, error: "Failed to delete sequence" };
        }
      }

      default:
        return { ok: false, error: "Unknown intent" };
    }
  };
}
