import { useState, useCallback } from "react";
import type { UseTagsReturn } from "./hook.types";

/**
 * Custom hook that manages tag state and CRUD operations.
 * Extracts all business logic from the TagManager component.
 *
 * Tags are stored as unique, case-insensitive string labels.
 *
 * @param initialTags - Optional initial list of tag labels
 * @returns Tag state and mutation functions
 */
export function useTags(initialTags: string[] = []): UseTagsReturn {
  const [tags, setTags] = useState<string[]>(initialTags);

  /**
   * Adds a new tag with the given label.
   * Ignores empty or whitespace-only labels and duplicate labels (case-insensitive).
   *
   * @param label - The label for the new tag
   */
  const addTag = useCallback((label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    setTags((prev) => {
      const isDuplicate = prev.some(
        (tag) => tag.toLowerCase() === trimmed.toLowerCase()
      );
      if (isDuplicate) return prev;
      return [...prev, trimmed];
    });
  }, []);

  /**
   * Removes a tag by its label.
   *
   * @param label - The label of the tag to remove
   */
  const removeTag = useCallback((label: string) => {
    setTags((prev) => prev.filter((tag) => tag !== label));
  }, []);

  /**
   * Updates a tag's label.
   * Ignores empty labels and labels that would create duplicates (case-insensitive).
   *
   * @param oldLabel - The current label of the tag to edit
   * @param newLabel - The new label for the tag
   */
  const editTag = useCallback((oldLabel: string, newLabel: string) => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;

    setTags((prev) => {
      const isDuplicate = prev.some(
        (tag) => tag !== oldLabel && tag.toLowerCase() === trimmed.toLowerCase()
      );
      if (isDuplicate) return prev;
      return prev.map((tag) => (tag === oldLabel ? trimmed : tag));
    });
  }, []);

  return {
    tags,
    addTag,
    removeTag,
    editTag,
    hasTags: tags.length > 0,
  };
}
