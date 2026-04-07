import { Tag, X, Pencil, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { TagManagerProps } from "./tag.types";

/**
 * Presentational component for managing tags associated with a video.
 * All interaction logic lives in the useTagManager hook — this component
 * is purely concerned with rendering.
 *
 * @param props - {@link TagManagerProps}
 * @returns The rendered TagManager section
 */
export function TagManager({
  tags,
  onRemoveTag,
  disabled = false,
  manager,
}: TagManagerProps) {
  return (
    <section aria-label="Tag Manager" className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary/15">
          <Tag className="size-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold tracking-tight text-text">
          Tags
        </h3>
        {tags.length > 0 && (
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
            {tags.length}
          </span>
        )}
      </div>

      {/* ── Tag list ── */}
      <div className="flex flex-wrap gap-2" role="list" aria-label="Tags list">
        {tags.length === 0 && (
          <p className="py-3 text-xs text-muted-foreground italic">
            No tags yet
          </p>
        )}

        {tags.map((tag) => (
          <div key={tag} role="listitem">
            {manager.editingTag === tag ? (
              <div className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-1 py-0.5 shadow-sm">
                <Input
                  value={manager.editValue}
                  onChange={(e) => manager.setEditValue(e.target.value)}
                  onKeyDown={manager.handleEditKeyDown}
                  onBlur={manager.commitEdit}
                  className="h-6 w-24 border-none bg-transparent px-2 text-xs shadow-none focus-visible:ring-0"
                  aria-label={`Edit tag ${tag}`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={manager.commitEdit}
                  onMouseDown={(e) => e.preventDefault()}
                  className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-primary transition-colors hover:bg-primary/30"
                  aria-label="Confirm edit"
                >
                  <Check className="size-3" />
                </button>
              </div>
            ) : (
              <Badge
                className="group h-7 gap-1 bg-bg-light rounded-full px-3 text-xs font-medium text-text shadow-s transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-m"
              >
                <span className="max-w-30 truncate">{tag}</span>
                {!disabled && (
                  <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => manager.startEditing(tag)}
                      className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      aria-label={`Edit tag ${tag}`}
                    >
                      <Pencil className="size-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveTag(tag)}
                      className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="size-2.5" />
                    </button>
                  </span>
                )}
              </Badge>
            )}
          </div>
        ))}
      </div>

      {/* ── Add input ── */}
      {!disabled && (
        <Input
          value={manager.inputValue}
          onChange={(e) => manager.setInputValue(e.target.value)}
          onKeyDown={manager.handleInputKeyDown}
          placeholder="Type a tag and press Enter…"
          aria-label="Add new tag"
          className="h-8 rounded-lg border-dashed border-border/60 bg-transparent text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/40 focus:bg-primary/5 focus-visible:ring-0 focus-visible:outline-none"
        />
      )}
    </section>
  );
}
