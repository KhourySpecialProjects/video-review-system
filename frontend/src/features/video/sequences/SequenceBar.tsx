import { motion, AnimatePresence } from "motion/react";
import { ListVideo, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatDuration } from "@/lib/format";
import { useClipMorph } from "@/features/video/sequences/clipMorphContext";
import type { Clip } from "@shared/clip";
import type { Sequence } from "@shared/sequence";

type SequenceBarProps = {
  /** @description The currently selected sequence, or null for full video view. */
  activeSequence: Sequence | null;
  /** @description All clips for the current video (will be filtered to the sequence). */
  clips: Clip[];
  /** @description Currently playing clip index in the sorted sequence, or -1 if not playing. */
  activeClipIndex: number;
  /** @description Called when the user removes a clip from the active sequence. */
  onRemoveClip: (clipId: string) => void;
  /** @description Called when the user clicks a clip card to seek to its start. */
  onSeekToClip: (index: number) => void;
};

/**
 * @description Visual bar showing clips that belong to the active sequence.
 * Each clip is rendered as a Shadcn Card wrapped in a motion.div with a
 * matching layoutId so adding a clip from the sidebar morphs it into place.
 * Clips are always sorted by start time (earliest first). Shows a Shadcn
 * Empty state when the sequence has no clips.
 *
 * @param props - Component props
 * @returns The sequence bar element
 */
export function SequenceBar({
  activeSequence,
  clips,
  activeClipIndex,
  onRemoveClip,
  onSeekToClip,
}: SequenceBarProps) {
  const { morphLayoutId } = useClipMorph();

  if (!activeSequence) return null;

  const sequenceClips = sortSequenceClips(activeSequence, clips);

  if (sequenceClips.length === 0) {
    return (
      <Empty className="min-h-0 p-6 border border-dashed border-border rounded-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ListVideo />
          </EmptyMedia>
          <EmptyTitle>No clips in this sequence</EmptyTitle>
          <EmptyDescription>
            Add clips from the sidebar with the “Add to sequence” button.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex min-h-20 items-stretch gap-2 rounded-md border border-border bg-muted/20 p-2">
      <AnimatePresence mode="popLayout">
        {sequenceClips.map((clip, index) => (
          <motion.div
            key={clip.id}
            layoutId={morphLayoutId(clip.id)}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="min-w-0 flex-1"
          >
            <div
              className={`flex h-full w-full items-center gap-2 rounded-sm border border-border bg-card px-2 py-1 border-l-4 ${
                index === activeClipIndex ? "ring-2 ring-primary" : ""
              }`}
              style={{ borderLeftColor: clip.themeColor }}
            >
              <button
                type="button"
                onClick={() => onSeekToClip(index)}
                className="min-w-0 flex-1 text-left cursor-pointer"
                aria-label={`Seek to ${clip.title}`}
              >
                <div
                  className="truncate text-xs font-medium leading-tight"
                  title={clip.title}
                >
                  {clip.title}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {formatDuration(Math.floor(clip.startTimeS))} →{" "}
                  {formatDuration(Math.floor(clip.endTimeS))}
                </div>
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onRemoveClip(clip.id)}
                aria-label={`Remove ${clip.title} from sequence`}
                className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <X className="size-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * @description Resolves a sequence's clip IDs to full Clip objects and sorts
 * them by start time. Items in the sequence that reference a missing clip
 * are dropped.
 *
 * @param sequence - The active sequence whose items should be resolved
 * @param clips - All known clips for the video
 * @returns The sequence's clips, sorted by startTimeS ascending
 */
export function sortSequenceClips(sequence: Sequence, clips: Clip[]): Clip[] {
  const items = sequence.items ?? [];
  const clipsById = new Map(clips.map((c) => [c.id, c]));
  return items
    .map((item) => clipsById.get(item.clipId))
    .filter((c): c is Clip => c !== undefined)
    .slice()
    .sort((a, b) => a.startTimeS - b.startTimeS);
}
