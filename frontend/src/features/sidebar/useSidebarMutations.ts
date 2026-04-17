import { useEffect } from "react"
import { useFetcher, useRevalidator } from "react-router"
import { useAuth } from "@/context/auth-context"
import type { Annotation } from "@/features/video/annotations/types"
import type { NoteEditPayload } from "./TimestampAnnotation"

/**
 * @description Maps a canvas Annotation type to the shared AnnotationType string.
 *
 * @param type - Canvas annotation discriminant
 * @returns Shared annotation type string
 */
function toAnnotationType(type: Annotation["type"]): string {
  switch (type) {
    case "freehand": return "freehand_drawing"
    case "eraser": return "freehand_drawing"
    case "circle": return "drawing_circle"
    case "rectangle": return "drawing_box"
  }
}

/**
 * @description Converts a canvas Annotation to its API payload shape.
 *
 * @param annotation - The canvas annotation to serialize
 * @returns JSON-serializable payload for the backend
 */
function toAnnotationPayload(annotation: Annotation): Record<string, unknown> {
  switch (annotation.type) {
    case "freehand":
    case "eraser":
      return { points: annotation.points, settings: annotation.settings }
    case "circle":
      return { center: annotation.center, radiusX: annotation.radiusX, radiusY: annotation.radiusY, settings: annotation.settings }
    case "rectangle":
      return { origin: annotation.origin, end: annotation.end, settings: annotation.settings }
  }
}

/**
 * @description Hook that owns useFetcher instances for sidebar CRUD operations.
 * Submits to /clips and /annotations resource routes, which handle API calls
 * and toast notifications.
 *
 * @param videoId - Video ID for annotation create payloads
 * @param currentVideoTime - Current video playback time for timestamping new notes
 * @param studyId - Study ID for annotation create payloads
 * @param siteId - Site ID for annotation create payloads
 * @returns Mutation functions for clips, notes, and drawings
 */
export function useSidebarMutations(videoId: string, currentVideoTime: number, studyId: string, siteId: string) {
  const { user } = useAuth()
  const clipFetcher = useFetcher()
  const annotationFetcher = useFetcher()
  const { revalidate } = useRevalidator()

  useEffect(() => {
    if (clipFetcher.state === "idle" && clipFetcher.data) {
      revalidate()
    }
  }, [clipFetcher.state, clipFetcher.data, revalidate])

  useEffect(() => {
    if (annotationFetcher.state === "idle" && annotationFetcher.data) {
      revalidate()
    }
  }, [annotationFetcher.state, annotationFetcher.data, revalidate])

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

  /**
   * @description Creates a new timestamped note annotation. Does nothing if
   * there is no authenticated user — notes must always record a real author.
   * @param note - The note's title and body text
   * @param atTimeSecs - Optional override for the note's video timestamp (defaults to current playback time)
   */
  function createNote(note: NoteEditPayload, atTimeSecs?: number) {
    if (!user) return
    const timeSecs = atTimeSecs ?? currentVideoTime
    const formattedTime = `${Math.floor(timeSecs / 60)}:${String(Math.floor(timeSecs % 60)).padStart(2, '0')}`

    annotationFetcher.submit(
      {
        intent: "create",
        payload: JSON.stringify({
          videoId,
          authorUserId: user.id,
          studyId,
          siteId,
          type: "text_comment",
          timestampSeconds: Math.floor(timeSecs),
          durationSeconds: 5,
          payload: {
            title: note.title,
            text: note.content,
            author: user.name,
            timestamp: formattedTime,
          },
        }),
      },
      { method: "POST", action: "/annotations" },
    )
  }

  /** @description Updates a note's title and/or body content. */
  function updateNote(id: string, note: NoteEditPayload) {
    annotationFetcher.submit(
      {
        intent: "update",
        annotationId: id,
        payload: JSON.stringify({ payload: { title: note.title, text: note.content } }),
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

  /** @description Persists a completed canvas drawing annotation via the resource route. */
  function saveDrawing(annotation: Annotation) {
    annotationFetcher.submit(
      {
        intent: "create",
        payload: JSON.stringify({
          videoId,
          authorUserId: user?.id ?? "",
          studyId,
          siteId,
          type: toAnnotationType(annotation.type),
          timestampSeconds: Math.floor(annotation.timestamp),
          durationSeconds: annotation.duration,
          payload: toAnnotationPayload(annotation),
        }),
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
    saveDrawing,
    isSubmitting: clipFetcher.state === "submitting" || annotationFetcher.state === "submitting",
  }
}
