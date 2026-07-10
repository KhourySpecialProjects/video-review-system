import { useState } from "react";
import { useFetcher } from "react-router";
import { Plus, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Sequence } from "@shared/sequence";

/** @description Sentinel value for the "Full Video" (no sequence) option. */
const FULL_VIDEO_VALUE = "__full_video__";

type SequenceTabBarProps = {
  sequences: Sequence[];
  /** @description ID of the active sequence, or null for full video view. */
  activeSequenceId: string | null;
  /** @description Called when a sequence is selected. Null = full video. */
  onSelect: (sequenceId: string | null) => void;
  /** @description Whether sequence playback is active. */
  isPlayingSequence: boolean;
  /** @description Start playing the active sequence. */
  onPlaySequence: () => void;
  /** @description Stop playing the active sequence. */
  onStopSequence: () => void;
  /** @description Whether creation/editing is allowed (permission-gated). */
  disabled?: boolean;
  /** @description Context IDs needed for creating a sequence. */
  videoId: string;
  studyId: string;
  siteId: string;
};

/**
 * @description Selector for switching between full video view and sequence views.
 * Uses a Shadcn Select to pick the active sequence, shows a play/stop control
 * when a sequence is active, and exposes a "+" button to create a new sequence
 * via useFetcher submitting to the /sequences resource route.
 *
 * @param props - Component props
 * @returns The sequence tab bar element
 */
export function SequenceTabBar({
  sequences,
  activeSequenceId,
  onSelect,
  isPlayingSequence,
  onPlaySequence,
  onStopSequence,
  disabled = false,
  videoId,
  studyId,
  siteId,
}: SequenceTabBarProps) {
  const fetcher = useFetcher();
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  /**
   * @description Submits the new sequence via the fetcher form.
   */
  function handleCreate() {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    fetcher.submit(
      {
        intent: "create",
        payload: JSON.stringify({ title: trimmed, videoId, studyId, siteId }),
      },
      { method: "POST", action: "/sequences" },
    );

    setNewTitle("");
    setIsCreating(false);
  }

  /**
   * @description Translates the Select's string value back into the parent's
   * null-for-full-video contract.
   *
   * @param value - The raw value from the Select control
   */
  function handleSelect(value: string | null) {
    onSelect(value === FULL_VIDEO_VALUE || value === null ? null : value);
  }

  const activeSequence = sequences.find((s) => s.id === activeSequenceId) ?? null;
  const selectValue = activeSequenceId ?? FULL_VIDEO_VALUE;

  return (
    <div className="flex h-9 shrink-0 items-center gap-2">
      <Select value={selectValue} onValueChange={handleSelect}>
        <SelectTrigger size="sm" aria-label="Select sequence" className="min-w-40">
          <SelectValue>
            {activeSequence ? activeSequence.title : "Full Video"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} side="bottom">
          <SelectGroup>
            <SelectItem value={FULL_VIDEO_VALUE}>Full Video</SelectItem>
            {sequences.map((seq) => (
              <SelectItem key={seq.id} value={seq.id}>
                {seq.title}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {activeSequenceId && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={isPlayingSequence ? onStopSequence : onPlaySequence}
          aria-label={isPlayingSequence ? "Stop sequence" : "Play sequence"}
          className="shrink-0"
        >
          {isPlayingSequence ? (
            <Square className="size-3.5" />
          ) : (
            <Play className="size-3.5" />
          )}
        </Button>
      )}

      {!disabled && (
        <>
          {isCreating ? (
            <fetcher.Form
              className="flex items-center gap-1 shrink-0"
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
            >
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Sequence name…"
                autoFocus
                className="h-7 w-32 text-xs"
                onBlur={() => {
                  if (!newTitle.trim()) setIsCreating(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setNewTitle("");
                    setIsCreating(false);
                  }
                }}
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                disabled={!newTitle.trim()}
              >
                <Plus className="size-3.5" />
              </Button>
            </fetcher.Form>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsCreating(true)}
              aria-label="Create new sequence"
              className="shrink-0"
            >
              <Plus className="size-3.5" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
