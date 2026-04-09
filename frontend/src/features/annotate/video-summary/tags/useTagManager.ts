import { useState, useCallback, type KeyboardEvent } from "react";
import type { UseTagManagerParams, UseTagManagerReturn } from "./tag.types";

/**
 * Hook that manages the TagManager component's UI interaction state.
 * Handles input value, inline editing, and keyboard navigation
 * so the TagManager component stays purely presentational.
 *
 * @param params - Tag callbacks passed from the parent
 * @returns UI state and event handlers for the TagManager
 */
export function useTagManager({
  onAddTag,
  onEditTag,
}: UseTagManagerParams): UseTagManagerReturn {
  const [inputValue, setInputValue] = useState("");
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  /**
   * Handles keydown on the "add tag" input.
   * Submits the tag on Enter.
   *
   * @param e - The keyboard event from the input
   */
  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onAddTag(inputValue);
        setInputValue("");
      }
    },
    [inputValue, onAddTag],
  );

  /**
   * Enters inline-edit mode for a tag.
   *
   * @param label - The current label of the tag to edit
   */
  const startEditing = useCallback((label: string) => {
    setEditingTag(label);
    setEditValue(label);
  }, []);

  /**
   * Commits the current edit and exits edit mode.
   */
  const commitEdit = useCallback(() => {
    if (editingTag !== null) {
      onEditTag(editingTag, editValue);
      setEditingTag(null);
      setEditValue("");
    }
  }, [editingTag, editValue, onEditTag]);

  /**
   * Cancels inline editing and resets edit state.
   */
  const cancelEdit = useCallback(() => {
    setEditingTag(null);
    setEditValue("");
  }, []);

  /**
   * Handles keydown on the inline-edit input.
   * Commits on Enter, cancels on Escape.
   *
   * @param e - The keyboard event from the edit input
   */
  const handleEditKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitEdit();
      } else if (e.key === "Escape") {
        cancelEdit();
      }
    },
    [commitEdit, cancelEdit],
  );

  return {
    inputValue,
    setInputValue,
    editingTag,
    editValue,
    setEditValue,
    handleInputKeyDown,
    startEditing,
    commitEdit,
    cancelEdit,
    handleEditKeyDown,
  };
}
