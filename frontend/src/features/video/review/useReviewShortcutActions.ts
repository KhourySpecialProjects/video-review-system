import { useReviewKeyboardShortcuts } from "@/features/video/review/useReviewKeyboardShortcuts";

/**
 * @description Wires the review page's keyboard shortcuts to DOM events that
 * the player and sidebar already listen for. Extracted so `VideoReview.tsx`
 * doesn't have to declare and define these tiny dispatchers inline.
 */
export function useReviewShortcutActions() {
  useReviewKeyboardShortcuts({
    onToggleDrawing: () =>
      document.dispatchEvent(new CustomEvent("review:toggle-drawing")),
    onAddComment: () =>
      document.dispatchEvent(new CustomEvent("review:add-comment")),
  });
}
