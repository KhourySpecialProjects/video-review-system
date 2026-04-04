/**
 * Return type for the useGeneralNotes hook.
 */
export type UseGeneralNotesReturn = {
  /** Current notes value */
  notes: string;
  /** Update the notes value */
  setNotes: (value: string) => void;
  /** Clear all notes */
  clearNotes: () => void;
  /** Whether the notes field has content */
  hasContent: boolean;
};

/**
 * Return type for the useTags hook.
 */
export type UseTagsReturn = {
  /** Current list of tag labels */
  tags: string[];
  /** Add a new tag by label */
  addTag: (label: string) => void;
  /** Remove a tag by label */
  removeTag: (label: string) => void;
  /** Edit an existing tag's label */
  editTag: (oldLabel: string, newLabel: string) => void;
  /** Whether any tags exist */
  hasTags: boolean;
};
