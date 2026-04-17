import { useEffect } from "react";

/** @description Tags where keyboard shortcuts should be suppressed. */
const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

type ShortcutCallbacks = {
  /** @description Called when "D" is pressed — toggles drawing mode. */
  onToggleDrawing: () => void;
  /** @description Called when "C" is pressed — opens timestamped comment input. */
  onAddComment: () => void;
};

/**
 * @description Registers global keyboard shortcuts scoped to the review page.
 * Shortcuts are disabled when the user is focused on an input/textarea.
 *
 * - **D** — Toggle drawing mode on/off
 * - **C** — Create a timestamped comment at current video time
 *
 * @param callbacks - Functions to invoke for each shortcut
 */
export function useReviewKeyboardShortcuts({
  onToggleDrawing,
  onAddComment,
}: ShortcutCallbacks) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip when typing in form fields
      if (INPUT_TAGS.has((e.target as HTMLElement)?.tagName)) return;
      // Skip when modifier keys are held
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case "d":
          e.preventDefault();
          onToggleDrawing();
          break;
        case "c":
          e.preventDefault();
          onAddComment();
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onToggleDrawing, onAddComment]);
}
