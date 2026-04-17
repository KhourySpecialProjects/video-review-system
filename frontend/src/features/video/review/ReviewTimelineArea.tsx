import { useMemo } from "react";
import { VideoTimeline, annotationsToMarkers } from "@/features/video/timeline/VideoTimeline";
import { ClipTimeline } from "@/features/video/clips/ClipTimeline";
import { useClipTimeline } from "@/features/video/clips/useClipTimeline";
import { SequenceTabBar } from "@/features/video/sequences/SequenceTabBar";
import { SequenceBar, sortSequenceClips } from "@/features/video/sequences/SequenceBar";
import { useSequencePlayback } from "@/features/video/sequences/useSequencePlayback";
import { useSequenceFetcher } from "@/features/video/sequences/useSequences";
import type { Clip } from "@shared/clip";
import type { Sequence } from "@shared/sequence";
import type { Annotation } from "@/features/video/annotations/types";

type ReviewTimelineAreaProps = {
  duration: number;
  currentTime: number;
  annotations: Annotation[];
  clips: Clip[];
  sequences: Sequence[];
  /** @description Currently selected sequence ID (null = full video). Lifted to
   * the parent so the sidebar and this area share the same active sequence. */
  activeSequenceId: string | null;
  /** @description Called when the user selects a different sequence (or null). */
  onActiveSequenceChange: (sequenceId: string | null) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onSeek: (time: number) => void;
  videoId: string;
  studyId: string;
  siteId: string;
  /** @description Whether the user can create/edit/delete their own resources. */
  canWrite: boolean;
  /** @description Whether the user can manage any resource regardless of ownership. */
  canAdmin: boolean;
};

/**
 * @description Timeline area with sequence selector, sequence clip bar,
 * annotation timeline, and clip timeline. When a sequence is active, visible
 * clips and annotations are filtered to that sequence's time ranges. Removing
 * a clip from the sequence persists through the /sequences resource route.
 *
 * @param props - Component props
 * @returns The timeline area element
 */
export function ReviewTimelineArea({
  duration,
  currentTime,
  annotations,
  clips,
  sequences,
  activeSequenceId,
  onActiveSequenceChange,
  videoRef,
  onSeek,
  videoId,
  studyId,
  siteId,
  canWrite,
}: ReviewTimelineAreaProps) {
  const sequenceFetcher = useSequenceFetcher();

  const activeSequence = useMemo(
    () => sequences.find((s) => s.id === activeSequenceId) ?? null,
    [sequences, activeSequenceId],
  );

  /** @description Clips that belong to the active sequence, sorted by start time. */
  const sequenceClips = useMemo(() => {
    if (!activeSequence) return clips;
    return sortSequenceClips(activeSequence, clips);
  }, [activeSequence, clips]);

  /** @description Annotations filtered to the active sequence's clip time ranges. */
  const filteredAnnotations = useMemo(() => {
    if (!activeSequence) return annotations;
    return annotations.filter((a) =>
      sequenceClips.some(
        (c) => a.timestamp >= c.startTimeS && a.timestamp <= c.endTimeS,
      ),
    );
  }, [activeSequence, annotations, sequenceClips]);

  const sequencePlayback = useSequencePlayback(sequenceClips, videoRef);

  const timeline = useClipTimeline(duration, videoRef, clips, videoId, studyId, siteId);

  /**
   * @description Removes a clip from the active sequence via the resource route.
   *
   * @param clipId - The clip to remove
   */
  function handleRemoveClip(clipId: string) {
    if (!activeSequence) return;
    sequenceFetcher.removeClipFromSequence(activeSequence.id, clipId);
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <SequenceTabBar
        sequences={sequences}
        activeSequenceId={activeSequenceId}
        onSelect={onActiveSequenceChange}
        isPlayingSequence={sequencePlayback.isPlayingSequence}
        onPlaySequence={sequencePlayback.playSequence}
        onStopSequence={sequencePlayback.stopSequence}
        disabled={!canWrite}
        videoId={videoId}
        studyId={studyId}
        siteId={siteId}
      />

      <SequenceBar
        activeSequence={activeSequence}
        clips={clips}
        activeClipIndex={sequencePlayback.currentClipIndex}
        onRemoveClip={handleRemoveClip}
        onSeekToClip={sequencePlayback.seekToClip}
      />

      <VideoTimeline
        duration={duration}
        currentTime={currentTime}
        markers={annotationsToMarkers(filteredAnnotations)}
        onSeek={onSeek}
      />

      <ClipTimeline duration={duration} timeline={timeline} />
    </div>
  );
}
