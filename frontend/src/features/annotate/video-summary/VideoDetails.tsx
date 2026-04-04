import { Separator } from "@/components/ui/separator";
import { GeneralNotes } from "./comment/GeneralNotes";
import { useGeneralNotes } from "./comment/useGeneralNotes";
import { TagManager } from "./tags/TagManager";
import { useTagManager } from "./tags/useTagManager";
import { useTags } from "./tags/useTags";
import type { VideoDetailsProps } from "./video-details.types";

/**
 * Combined section displaying general notes and tags for a video.
 * Manages its own state via the useGeneralNotes and useTags hooks.
 *
 * @param props - {@link VideoDetailsProps}
 * @returns The rendered VideoDetails section
 */
export function VideoDetails({ disabled = false }: VideoDetailsProps) {
  const { notes, setNotes } = useGeneralNotes();
  const { tags, addTag, removeTag, editTag } = useTags();
  const tagManager = useTagManager({ onAddTag: addTag, onEditTag: editTag });

  return (
    <div className="rounded-xl bg-bg-light shadow-l">
      <div className="px-6 pt-5 pb-2">
        <h2 className="text-xl font-semibold text-text">Video Details</h2>
      </div>
      <div className="flex gap-0 p-6">
        <div className="flex-1 pr-6">
          <GeneralNotes value={notes} onChange={setNotes} disabled={disabled} />
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
  );
}
