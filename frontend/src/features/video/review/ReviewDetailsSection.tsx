import { useState } from "react";
import { ChevronUp, LockIcon, StickyNote, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GeneralNotes } from "@/features/annotate/video-summary/comment/GeneralNotes";
import { useGeneralNotes } from "@/features/annotate/video-summary/comment/useGeneralNotes";
import { TagManager } from "@/features/annotate/video-summary/tags/TagManager";
import { useTagManager } from "@/features/annotate/video-summary/tags/useTagManager";
import { useTags } from "@/features/annotate/video-summary/tags/useTags";

type ReviewDetailsSectionProps = {
  /** @description Whether editing is disabled (READ-only users). */
  disabled: boolean;
};

/** @description Max tag chips shown inline on the summary strip. */
const INLINE_TAG_LIMIT = 4;

/**
 * @description Compact summary strip pinned to the bottom of the review page
 * showing tag chips and a one-line notes preview. Clicking anywhere on the
 * strip opens a bottom sheet with the full `GeneralNotes` + `TagManager`
 * editors. Keeps the video workspace unobstructed while keeping metadata
 * one click away.
 */
export function ReviewDetailsSection({
  disabled,
}: ReviewDetailsSectionProps) {
  const { notes, setNotes } = useGeneralNotes();
  const { tags, addTag, removeTag, editTag } = useTags();
  const tagManager = useTagManager({ onAddTag: addTag, onEditTag: editTag });
  const [open, setOpen] = useState(false);

  const visibleTags = tags.slice(0, INLINE_TAG_LIMIT);
  const hiddenTagCount = Math.max(0, tags.length - INLINE_TAG_LIMIT);
  const notesPreview = notes.trim();

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        aria-label="Open video details"
        disableMotion
        className="group/button flex h-auto w-full cursor-pointer items-center justify-start gap-3 rounded-none border-x-0 border-b-0 border-t-2 bg-bg-light px-4 py-2 text-left shadow-s hover:bg-primary/5 hover:shadow-m"
      >
        <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <Tag className="size-3.5" aria-hidden="true" />
          <span>Tags</span>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          {tags.length === 0 ? (
            <span className="truncate text-xs italic text-muted-foreground">
              No tags
            </span>
          ) : (
            <>
              {visibleTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex h-6 max-w-32 items-center truncate rounded-full bg-primary/10 px-2.5 text-xs font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
              {hiddenTagCount > 0 && (
                <span className="text-xs font-medium text-muted-foreground">
                  +{hiddenTagCount}
                </span>
              )}
            </>
          )}
        </div>

        <Separator orientation="vertical" className="h-5" />

        <div className="flex min-w-0 flex-2 items-center gap-1.5 overflow-hidden">
          <StickyNote
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span
            className={
              notesPreview
                ? "truncate text-xs text-text"
                : "truncate text-xs italic text-muted-foreground"
            }
          >
            {notesPreview || "No notes yet"}
          </span>
        </div>

        {disabled && (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <LockIcon className="size-3" aria-hidden="true" />
                  Read-only
                </span>
              }
            />
            <TooltipContent>
              You don't have permission to edit this section.
            </TooltipContent>
          </Tooltip>
        )}

        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-text shadow-s transition-all group-hover/button:border-primary/40 group-hover/button:text-primary">
          Expand
          <ChevronUp
            className="size-3.5 transition-transform group-hover/button:-translate-y-0.5"
            aria-hidden="true"
          />
        </span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-2xl"
        >
          <SheetHeader className="flex-row items-center justify-between">
            <SheetTitle className="text-xl">Video Details</SheetTitle>
            {disabled && (
              <span className="mr-10 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <LockIcon className="size-3.5" aria-hidden="true" />
                Read-only
              </span>
            )}
          </SheetHeader>
          <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 p-6 md:grid-cols-2">
            <GeneralNotes value={notes} onChange={setNotes} disabled={disabled} />
            <TagManager
              tags={tags}
              onRemoveTag={removeTag}
              disabled={disabled}
              manager={tagManager}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
