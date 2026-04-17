import { useState, useMemo } from "react";
import { LayoutGroup } from "motion/react";
import { VideoTimeline, annotationsToMarkers } from "@/features/video/timeline/VideoTimeline";
import { ClipTimeline } from "@/features/video/clips/ClipTimeline";
import { useClipTimeline } from "@/features/video/clips/useClipTimeline";
import { SequenceTabBar } from "@/features/video/sequences/SequenceTabBar";
import { SequenceClipBar } from "@/features/video/sequences/SequenceClipBar";
import { useSequencePlayback } from "@/features/video/sequences/useSequencePlayback";
import type { Clip } from "@shared/clip";
import type { Sequence } from "@shared/sequence";
import type { Annotation } from "@/features/video/annotations/types";

type ReviewTimelineAreaProps = {
  duration: number;
  currentTime: number;
  annotations: Annotation[];
  clips: Clip[];
  sequences: Sequence[];
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
 * @description Timeline area with sequence tab bar, annotation timeline,
 * and clip timeline. Switching tabs filters visible clips and annotations
 * to those within the active sequence's time ranges.
 */
export function ReviewTimelineArea({
  duration,
  currentTime,
  annotations,
  clips,
  sequences,
  videoRef,
  onSeek,
  videoId,
  studyId,
  siteId,
  canWrite,
}: ReviewTimelineAreaProps) {
  const [activeSequenceId, setActiveSequenceId] = useState<string | null>(null);

  const activeSequence = useMemo(
    () => sequences.find((s) => s.id === activeSequenceId) ?? null,
    [sequences, activeSequenceId],
  );

  /** @description Clips that belong to the active sequence, resolved from clip IDs. */
  const sequenceClips = useMemo(() => {
    if (!activeSequence) return clips;
    const clipIds = new Set(activeSequence.items.map((item) => item.clipId));
    return clips.filter((c) => clipIds.has(c.id));
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

  const timeline = useClipTimeline(duration, videoRef, (clip) => {
    console.log("Clip created:", clip);
  });

  return (
    <LayoutGroup>
      <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
        <SequenceTabBar
          sequences={sequences}
          activeSequenceId={activeSequenceId}
          onSelect={setActiveSequenceId}
          isPlayingSequence={sequencePlayback.isPlayingSequence}
          onPlaySequence={sequencePlayback.playSequence}
          onStopSequence={sequencePlayback.stopSequence}
          disabled={!canWrite}
          videoId={videoId}
          studyId={studyId}
          siteId={siteId}
        />

        {/* Sequence clip bar — shows ordered clips when a sequence is active */}
        {activeSequence && (
          <SequenceClipBar
            clips={sequenceClips}
            videoDuration={duration}
            activeClipIndex={sequencePlayback.currentClipIndex}
          />
        )}

        <VideoTimeline
          duration={duration}
          currentTime={currentTime}
          markers={annotationsToMarkers(filteredAnnotations)}
          onSeek={onSeek}
        />

        <ClipTimeline duration={duration} timeline={timeline} />
      </div>
    </LayoutGroup>
  );
}
