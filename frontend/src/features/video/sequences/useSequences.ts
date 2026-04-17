import { useFetcher } from "react-router";
import type { Clip } from "@shared/clip";
import type { Sequence } from "@shared/sequence";
import type { CreateSequencePayload } from "@/lib/sequence.service";

/**
 * @description Hook that wraps useFetcher for sequence CRUD operations.
 * All mutations submit to the /sequences resource route, which handles
 * API calls and toast notifications. React Router revalidates the loader
 * automatically after each action.
 *
 * @returns Fetcher state and mutation functions
 */
export function useSequenceFetcher() {
  const fetcher = useFetcher();

  /**
   * @description Creates a new sequence via the resource route.
   * @param payload - Sequence creation data
   */
  function createSequence(payload: CreateSequencePayload) {
    fetcher.submit(
      { intent: "create", payload: JSON.stringify(payload) },
      { method: "POST", action: "/sequences" },
    );
  }

  /**
   * @description Renames a sequence via the resource route.
   * @param sequenceId - The sequence to rename
   * @param title - The new title
   */
  function updateSequence(sequenceId: string, title: string) {
    fetcher.submit(
      { intent: "update", sequenceId, title },
      { method: "POST", action: "/sequences" },
    );
  }

  /**
   * @description Adds a clip to a sequence via the resource route.
   * @param sequenceId - The sequence to add the clip to
   * @param clip - The clip to add
   * @param currentSequence - The current sequence (to compute next playOrder)
   */
  function addClipToSequence(
    sequenceId: string,
    clip: Clip,
    currentSequence: Sequence,
  ) {
    const playOrder = currentSequence.items.length + 1;
    fetcher.submit(
      {
        intent: "addClip",
        sequenceId,
        clipId: clip.id,
        playOrder: String(playOrder),
      },
      { method: "POST", action: "/sequences" },
    );
  }

  /**
   * @description Removes a clip from a sequence via the resource route.
   * @param sequenceId - The sequence to remove from
   * @param clipId - The clip ID to remove
   */
  function removeClipFromSequence(sequenceId: string, clipId: string) {
    fetcher.submit(
      { intent: "removeClip", sequenceId, clipId },
      { method: "POST", action: "/sequences" },
    );
  }

  /**
   * @description Reorders clips within a sequence via the resource route.
   * @param sequenceId - The sequence to reorder
   * @param items - Array of { clipId, playOrder } defining new ordering
   */
  function reorderClips(sequenceId: string, items: Sequence["items"]) {
    fetcher.submit(
      { intent: "reorder", sequenceId, items: JSON.stringify(items) },
      { method: "POST", action: "/sequences" },
    );
  }

  /**
   * @description Deletes a sequence via the resource route.
   * @param sequenceId - The sequence to delete
   */
  function deleteSequence(sequenceId: string) {
    fetcher.submit(
      { intent: "delete", sequenceId },
      { method: "POST", action: "/sequences" },
    );
  }

  return {
    isSubmitting: fetcher.state === "submitting",
    isLoading: fetcher.state === "loading",
    createSequence,
    updateSequence,
    addClipToSequence,
    removeClipFromSequence,
    reorderClips,
    deleteSequence,
  };
}
