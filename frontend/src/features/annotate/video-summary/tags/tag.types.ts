import type { KeyboardEvent } from "react";

/**
 * Props for the TagManager component.
 */
export type TagManagerProps = {
  /** List of current tag labels */
  tags: string[];
  /** Callback fired when a new tag is removed by its label */
  onRemoveTag: (label: string) => void;
  /** Whether tag management actions are disabled */
  disabled?: boolean;
  /** UI interaction state and handlers from useTagManager */
  manager: UseTagManagerReturn;
};

/**
 * Parameters accepted by the useTagManager hook.
 */
export type UseTagManagerParams = {
  /** Callback fired when a new tag is added */
  onAddTag: (label: string) => void;
  /** Callback fired when a tag label is updated */
  onEditTag: (oldLabel: string, newLabel: string) => void;
};

/**
 * Return type for the useTagManager hook.
 */
export type UseTagManagerReturn = {
  /** Current value of the "add tag" input */
  inputValue: string;
  /** Setter for the "add tag" input value */
  setInputValue: (value: string) => void;
  /** Label of the tag currently being edited, or null */
  editingTag: string | null;
  /** Current value of the inline-edit input */
  editValue: string;
  /** Setter for the inline-edit input value */
  setEditValue: (value: string) => void;
  /** Keydown handler for the "add tag" input */
  handleInputKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  /** Enter inline-edit mode for a tag */
  startEditing: (label: string) => void;
  /** Commit the current inline edit */
  commitEdit: () => void;
  /** Cancel inline editing */
  cancelEdit: () => void;
  /** Keydown handler for the inline-edit input */
  handleEditKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
};
