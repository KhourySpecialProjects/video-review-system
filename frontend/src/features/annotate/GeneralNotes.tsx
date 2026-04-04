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
      <h3 className="mb-2 text-sm font-semibold text-text">General Notes</h3>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-28 resize-y"
      />
    </section>
  );
}
