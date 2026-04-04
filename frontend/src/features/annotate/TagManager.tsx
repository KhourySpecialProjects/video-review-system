import { useState, type KeyboardEvent } from "react";
import { X, Pencil, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { TagManagerProps } from "./tag.types";

/**
 * A section component for managing tags associated with a video.
 * Clinical reviewers can add, edit, and remove tags displayed as badges.
 *
 * @param props - {@link TagManagerProps}
 * @returns The rendered TagManager section
 */
export function TagManager({
  tags,
  onAddTag,
  onRemoveTag,
  onEditTag,
  disabled = false,
}: TagManagerProps) {
  const [inputValue, setInputValue] = useState("");
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  /**
   * Handles keydown events on the tag input.
   * Adds a tag when Enter is pressed.
   *
   * @param e - The keyboard event from the input
   */
  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddTag(inputValue);
      setInputValue("");
    }
  }

  /**
   * Starts editing a tag by setting the editing state.
   *
   * @param label - The label of the tag to begin editing
   */
  function startEditing(label: string) {
    setEditingTag(label);
    setEditValue(label);
  }

  /**
   * Commits the current edit by calling onEditTag and resetting state.
   */
  function commitEdit() {
    if (editingTag !== null) {
      onEditTag(editingTag, editValue);
      setEditingTag(null);
      setEditValue("");
    }
  }

  /**
   * Handles keydown events on the edit input.
   * Commits on Enter, cancels on Escape.
   *
   * @param e - The keyboard event from the edit input
   */
  function handleEditKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      setEditingTag(null);
      setEditValue("");
    }
  }

  return (
    <section aria-label="Tag Manager">
      <h3 className="mb-2 text-sm font-semibold text-text">Tags</h3>

      <div className="mb-3 flex flex-wrap gap-2" role="list" aria-label="Tags list">
        {tags.length === 0 && (
          <p className="text-sm text-muted-foreground">No tags yet</p>
        )}
        {tags.map((tag) => (
          <div key={tag} role="listitem" className="flex items-center gap-1">
            {editingTag === tag ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={commitEdit}
                  className="h-6 w-24 text-xs"
                  aria-label={`Edit tag ${tag}`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={commitEdit}
                  className="text-muted-foreground hover:text-text"
                  aria-label="Confirm edit"
                >
                  <Check className="size-3" />
                </button>
              </div>
            ) : (
              <Badge variant="secondary" className="gap-1.5">
                {tag}
                {!disabled && (
                  <>
                    <button
                      type="button"
                      onClick={() => startEditing(tag)}
                      className="text-muted-foreground hover:text-text"
                      aria-label={`Edit tag ${tag}`}
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveTag(tag)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="size-3" />
                    </button>
                  </>
                )}
              </Badge>
            )}
          </div>
        ))}
      </div>

      {!disabled && (
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Type a tag and press Enter..."
          aria-label="Add new tag"
          className="h-8 text-sm"
        />
      )}
    </section>
  );
}
