/**
 * Props for the GeneralNotes component.
 */
export type GeneralNotesProps = {
  /** Current notes text content */
  value: string;
  /** Callback fired when the notes text changes */
  onChange: (value: string) => void;
  /** Placeholder text shown when notes are empty */
  placeholder?: string;
  /** Whether the textarea is disabled */
  disabled?: boolean;
};
