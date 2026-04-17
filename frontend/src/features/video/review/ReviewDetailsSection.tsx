import { Separator } from "@/components/ui/separator";
import { GeneralNotes } from "@/features/annotate/video-summary/comment/GeneralNotes";
import { useGeneralNotes } from "@/features/annotate/video-summary/comment/useGeneralNotes";
import { TagManager } from "@/features/annotate/video-summary/tags/TagManager";
import { useTagManager } from "@/features/annotate/video-summary/tags/useTagManager";
import { useTags } from "@/features/annotate/video-summary/tags/useTags";

type ReviewDetailsSectionProps = {
  /** @description Whether editing is disabled (READ-only users). */
  disabled: boolean;
};

/**
 * @description Bottom section of the review page with general notes
 * and tag management. Disabled for users without write permission.
 */
export function ReviewDetailsSection({
  disabled,
}: ReviewDetailsSectionProps) {
  const { notes, setNotes } = useGeneralNotes();
  const { tags, addTag, removeTag, editTag } = useTags();
  const tagManager = useTagManager({ onAddTag: addTag, onEditTag: editTag });

  return (
    <div className="my-4">
      <div className="rounded-xl bg-bg-light shadow-l">
        <div className="px-6 pt-5 pb-2">
          <h2 className="text-xl font-semibold text-text">Video Details</h2>
        </div>
        <div className="flex gap-0 p-6">
          <div className="flex-1 pr-6">
            <GeneralNotes
              value={notes}
              onChange={setNotes}
              disabled={disabled}
            />
          </div>
          <Separator orientation="vertical" className="self-stretch" />
          <div className="flex-1 pl-6">
            <TagManager
              tags={tags}
              onRemoveTag={removeTag}
              disabled={disabled}
              manager={tagManager}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
