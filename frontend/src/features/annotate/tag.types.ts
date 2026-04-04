/**
 * Props for the TagManager component.
 */
export type TagManagerProps = {
  /** List of current tag labels */
  tags: string[];
  /** Callback fired when a new tag is added */
  onAddTag: (label: string) => void;
  /** Callback fired when a tag is removed by its label */
  onRemoveTag: (label: string) => void;
  /** Callback fired when a tag label is updated */
  onEditTag: (oldLabel: string, newLabel: string) => void;
  /** Whether tag management actions are disabled */
  disabled?: boolean;
};
