import { useState } from "react";
import { useFetcher } from "react-router";
import { Plus, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Sequence } from "@shared/sequence";

type SequenceTabBarProps = {
  sequences: Sequence[];
  /** @description ID of the active sequence, or null for full video view. */
  activeSequenceId: string | null;
  /** @description Called when a tab is selected. Null = full video. */
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
 * @description Tab bar for switching between full video view and sequence views.
 * Shows "Full Video" as the default tab, a tab per sequence, and a "+ New" button
 * that reveals an inline title input. New sequences are created via useFetcher
 * submitting to the /sequences resource route.
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

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {/* Full Video tab */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          activeSequenceId === null
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        }`}
      >
        Full Video
      </button>

      {/* Sequence tabs */}
      {sequences.map((seq) => (
        <button
          key={seq.id}
          type="button"
          onClick={() => onSelect(seq.id)}
          className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            activeSequenceId === seq.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {seq.title}
        </button>
      ))}

      {/* Play/Stop button for active sequence */}
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

      {/* New sequence creation */}
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
