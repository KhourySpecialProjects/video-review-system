import { useEffect, useMemo, useRef } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  toCanvasAnnotation,
  toNoteAnnotation,
} from "@/features/video/review/ReviewVideoArea";
import type { DrawingToolType } from "@/features/sidebar/DrawingCard";
import { useSequenceFetcher } from "@/features/video/sequences/useSequences";
import {
  annotationsQuery,
  clipsQuery,
  sequencesQuery,
} from "@/features/video/review/useReviewData";
import { reviewKeys } from "@/lib/queryClient";
import type { VideoReviewLoaderData } from "@/lib/video.service";
import type { Sequence } from "@shared/sequence";

/**
 * @description Derives the review page's view model from suspense-backed
 * query caches plus the loader payload. Active-sequence state is owned by
 * the caller and passed in, so sibling regions that all call this hook
 * (timeline, sidebar, video) observe the same selection.
 *
 * @param loaderData - Data returned by `videoReviewLoader`
 * @param activeSequenceId - Currently selected sequence ID, or null
 * @returns Raw lists, derived view-models, and actions the page renders with
 */
export function useReviewViewModel(
  loaderData: VideoReviewLoaderData,
  activeSequenceId: string | null,
) {
  const sequenceFetcher = useSequenceFetcher();
  const queryClient = useQueryClient();
  const pendingAddRef = useRef<{ queryKey: readonly unknown[]; snapshot: Sequence[] } | null>(null);

  useEffect(() => {
    const pending = pendingAddRef.current;
    if (!pending) return;
    if (sequenceFetcher.state !== "idle") return;
    if (sequenceFetcher.data && sequenceFetcher.data.ok === false) {
      queryClient.setQueryData(pending.queryKey, pending.snapshot);
    }
    pendingAddRef.current = null;
  }, [sequenceFetcher.state, sequenceFetcher.data, queryClient]);

  const { data: rawAnnotations } = useSuspenseQuery(annotationsQuery(loaderData.videoId));
  const { data: clips } = useSuspenseQuery(
    clipsQuery(loaderData.videoId, loaderData.studyId),
  );
  const { data: sequences } = useSuspenseQuery(
    sequencesQuery(loaderData.videoId, loaderData.studyId),
  );

  const activeSequence = useMemo(
    () => sequences.find((s) => s.id === activeSequenceId) ?? null,
    [sequences, activeSequenceId],
  );

  const canvasAnnotations = useMemo(
    () =>
      rawAnnotations.flatMap((item) => {
        const a = toCanvasAnnotation(item);
        return a ? [a] : [];
      }),
    [rawAnnotations],
  );
  const sidebarNotes = useMemo(
    () =>
      rawAnnotations.flatMap((item) => {
        const n = toNoteAnnotation(item);
        return n ? [n] : [];
      }),
    [rawAnnotations],
  );
  const drawings = useMemo(
    () =>
      rawAnnotations.flatMap((item) => {
        const a = toCanvasAnnotation(item);
        if (!a) return [];
        return [
          {
            id: a.id,
            type: a.type as DrawingToolType,
            color: a.settings.color,
            timestamp: a.timestamp,
            duration: a.duration,
            createdBy: item.authorName,
          },
        ];
      }),
    [rawAnnotations],
  );
  const sidebarClips = useMemo(
    () =>
      clips.map((c) => ({
        id: c.id,
        title: c.title,
        startTimeS: c.startTimeS,
        endTimeS: c.endTimeS,
        themeColor: c.themeColor,
        createdBy: c.createdByName,
      })),
    [clips],
  );

  /**
   * @description Adds a clip to the active sequence via the sequences
   * fetcher. Optimistically appends the new item to the cached sequence
   * list so the SequenceBar's destination card mounts in the same frame
   * the morph ghost unmounts — which is what makes the shared-layout
   * animation actually fire. The server roundtrip + invalidation still
   * happens in the background and reconciles the cache on success.
   *
   * @param clipId - ID of the clip to add
   */
  function handleAddClipToSequence(clipId: string) {
    if (!activeSequence) {
      toast.info("Select a sequence first");
      return;
    }
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;
    const items = activeSequence.items ?? [];
    if (items.some((i) => i.clipId === clipId)) {
      toast.info("Clip is already in this sequence");
      return;
    }

    const queryKey = reviewKeys.sequences(loaderData.videoId, loaderData.studyId);
    const snapshot = queryClient.getQueryData<Sequence[]>(queryKey) ?? sequences;
    pendingAddRef.current = { queryKey, snapshot };

    queryClient.setQueryData<Sequence[]>(queryKey, (prev) =>
      prev?.map((s) =>
        s.id === activeSequence.id
          ? {
              ...s,
              items: [...(s.items ?? []), { clipId, playOrder: items.length + 1 }],
            }
          : s,
      ),
    );

    sequenceFetcher.addClipToSequence(activeSequence.id, clip, {
      ...activeSequence,
      items,
    });
  }

  return {
    rawAnnotations,
    clips,
    sequences,
    activeSequence,
    canvasAnnotations,
    sidebarNotes,
    drawings,
    sidebarClips,
    handleAddClipToSequence,
  };
}
