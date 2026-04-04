import { useState, useCallback } from "react";
import type { UseGeneralNotesReturn } from "./hook.types";

/**
 * Custom hook that manages general notes state and operations.
 * Extracts business logic from the GeneralNotes component.
 *
 * @param initialValue - Optional initial notes text
 * @returns Notes state and mutation functions
 */
export function useGeneralNotes(initialValue = ""): UseGeneralNotesReturn {
  const [notes, setNotes] = useState(initialValue);

  /** Resets notes to an empty string. */
  const clearNotes = useCallback(() => {
    setNotes("");
  }, []);

  return {
    notes,
    setNotes,
    clearNotes,
    hasContent: notes.trim().length > 0,
  };
}
