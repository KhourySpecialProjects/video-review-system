import { motion, LayoutGroup } from "motion/react";
import { formatDuration } from "@/lib/format";
import type { Clip } from "@shared/clip";

type SequenceClipBarProps = {
  /** @description Clips in the sequence, ordered by playOrder. */
  clips: Clip[];
  /** @description Total duration of the source video in seconds. */
  videoDuration: number;
  /** @description Currently playing clip index, or -1 if not playing. */
  activeClipIndex: number;
};

/**
 * @description Visual bar showing clips in a sequence laid out in play order.
 * Each clip is a motion.div with a layoutId matching the sidebar ClipCard,
 * so adding a clip animates it from the sidebar into this bar.
 */
export function SequenceClipBar({
  clips,
  videoDuration,
  activeClipIndex,
}: SequenceClipBarProps) {
  if (clips.length === 0) {
    return (
      <div className="flex h-10 items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
        No clips in this sequence — add clips from the sidebar
      </div>
    );
  }

  const totalSequenceDuration = clips.reduce(
    (sum, c) => sum + (c.endTimeS - c.startTimeS),
    0,
  );

  return (
    <LayoutGroup>
      <div className="flex h-10 gap-0.5 overflow-hidden rounded-md border border-border bg-muted/20">
        {clips.map((clip, index) => {
          const clipDuration = clip.endTimeS - clip.startTimeS;
          const widthPercent =
            totalSequenceDuration > 0
              ? (clipDuration / totalSequenceDuration) * 100
              : 100 / clips.length;

          return (
            <motion.div
              key={clip.id}
              layoutId={`clip-${clip.id}`}
              className={`relative flex items-center justify-center overflow-hidden text-[10px] font-medium ${
                index === activeClipIndex
                  ? "bg-primary/40 text-primary-foreground"
                  : "bg-primary/20 text-foreground"
              }`}
              style={{ width: `${widthPercent}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              title={`${clip.title} (${formatDuration(Math.floor(clip.startTimeS))} → ${formatDuration(Math.floor(clip.endTimeS))})`}
            >
              <span className="truncate px-1">{clip.title}</span>
            </motion.div>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
