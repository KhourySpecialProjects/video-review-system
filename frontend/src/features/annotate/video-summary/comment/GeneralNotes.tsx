import { Textarea } from "@/components/ui/textarea";
import type { GeneralNotesProps } from "./general-notes.types";

/**
 * A section component for viewing and editing general notes on a video.
 * Provides a labeled textarea where reviewers can add free-form notes.
 *
 * @param props - {@link GeneralNotesProps}
 * @returns The rendered GeneralNotes section
 */
export function GeneralNotes({
  value,
  onChange,
  placeholder = "Add general notes about this video...",
  disabled = false,
}: GeneralNotesProps) {
  return (
    <section aria-label="General Notes">
      <h3 className="mb-2 text-sm font-medium text-text">General Notes</h3>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-32 resize-y rounded-lg border-none bg-bg shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
      />
    </section>
  );
}
