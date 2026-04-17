import { useFetcher } from "react-router"
import { useAuth } from "@/context/auth-context"

/**
 * @description Hook that owns useFetcher instances for sidebar CRUD operations.
 * Submits to /clips and /annotations resource routes, which handle API calls
 * and toast notifications.
 *
 * @param videoId - Video ID for annotation create payloads
 * @param currentVideoTime - Current video playback time for timestamping new notes
 * @returns Mutation functions for clips, notes, and drawings
 */
export function useSidebarMutations(videoId: string, currentVideoTime: number) {
  const { user } = useAuth()
  const clipFetcher = useFetcher()
  const annotationFetcher = useFetcher()

  /** @description Deletes a clip via the clips resource route. */
  function deleteClip(id: string) {
    clipFetcher.submit(
      { intent: "delete", clipId: id },
      { method: "POST", action: "/clips" },
    )
  }

  /** @description Updates a clip's title or time boundaries. */
  function updateClip(
    id: string,
    updates: { title?: string; startMs?: number; endMs?: number },
  ) {
    clipFetcher.submit(
      {
        intent: "update",
        clipId: id,
        payload: JSON.stringify({
          ...(updates.title !== undefined && { title: updates.title }),
          ...(updates.startMs !== undefined && { startTimeS: Math.floor(updates.startMs / 1000) }),
          ...(updates.endMs !== undefined && { endTimeS: Math.floor(updates.endMs / 1000) }),
        }),
      },
      { method: "POST", action: "/clips" },
    )
  }

  /** @description Creates a new timestamped note annotation. */
  function createNote() {
    const timeSecs = currentVideoTime
    const formattedTime = `${Math.floor(timeSecs / 60)}:${String(Math.floor(timeSecs % 60)).padStart(2, '0')}`

    annotationFetcher.submit(
      {
        intent: "create",
        payload: JSON.stringify({
          videoId,
          authorUserId: user?.id ?? "",
          studyId: "placeholder",
          siteId: "placeholder",
          type: "text_comment",
          timestampSeconds: Math.floor(timeSecs),
          durationSeconds: 5,
          payload: { text: "", author: user?.name ?? "Unknown User", timestamp: formattedTime },
        }),
      },
      { method: "POST", action: "/annotations" },
    )
  }

  /** @description Updates a note's text content. */
  function updateNote(id: string, newContent: string) {
    annotationFetcher.submit(
      {
        intent: "update",
        annotationId: id,
        payload: JSON.stringify({ payload: { text: newContent } }),
      },
      { method: "POST", action: "/annotations" },
    )
  }

  /** @description Deletes a note annotation. */
  function deleteNote(id: string) {
    annotationFetcher.submit(
      { intent: "delete", annotationId: id },
      { method: "POST", action: "/annotations" },
    )
  }

  /** @description Deletes a drawing annotation. */
  function deleteDrawing(id: string) {
    annotationFetcher.submit(
      { intent: "delete", annotationId: id },
      { method: "POST", action: "/annotations" },
    )
  }

  /** @description Updates a drawing's visibility duration. */
  function updateDrawingDuration(id: string, duration: number) {
    annotationFetcher.submit(
      {
        intent: "update",
        annotationId: id,
        payload: JSON.stringify({ durationSeconds: duration }),
      },
      { method: "POST", action: "/annotations" },
    )
  }

  return {
    deleteClip,
    updateClip,
    createNote,
    updateNote,
    deleteNote,
    deleteDrawing,
    updateDrawingDuration,
    isSubmitting: clipFetcher.state === "submitting" || annotationFetcher.state === "submitting",
  }
}
