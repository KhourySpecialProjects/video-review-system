import { useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { VideoPlayer } from "@/features/video/videoPlayer/VideoPlayer";
import { AnnotationCanvas } from "@/features/video/annotations/drawing/canvas/AnnotationCanvas";
import { AnnotationToolbar } from "@/features/video/annotations/drawing/toolbar/AnnotationToolbar";
import { useAnnotationState } from "@/features/video/annotations/useAnnotationState";
import type { Annotation, AnnotationTool, DrawingSettings, NormalizedPoint, UseAnnotationStateReturn } from "@/features/video/annotations/types";
import type { useVideoPlayer } from "@/hooks/useVideoPlayer";
import type { AnnotationListItem } from "@shared/annotation";
import type { NoteAnnotation } from "@/features/sidebar/sidebar";

/**
 * @description Converts an API text_comment annotation into the sidebar's
 * NoteAnnotation shape. Returns null for non-note annotation types.
 *
 * @param item - API annotation record
 * @returns NoteAnnotation for sidebar display, or null if not a note
 */
export function toNoteAnnotation(item: AnnotationListItem): NoteAnnotation | null {
  if (item.type !== "text_comment") return null;
  const mins = Math.floor(item.timestampS / 60);
  const secs = String(Math.floor(item.timestampS % 60)).padStart(2, "0");
  return {
    id: item.id,
    createdBy: item.authorName,
    title: (item.payload.title as string) ?? "",
    content: (item.payload.text as string) ?? "",
    timestamp: `${mins}:${secs}`,
  };
}

/**
 * @description Converts an API AnnotationListItem to the canvas Annotation shape.
 * Returns null for types that have no canvas representation (e.g. text_comment, tag).
 *
 * @param item - API annotation record
 * @returns Canvas annotation or null
 */
export function toCanvasAnnotation(item: AnnotationListItem): Annotation | null {
  const base = {
    id: item.id,
    timestamp: item.timestampS,
    duration: item.durationS,
    settings: (item.payload.settings as Annotation["settings"]) ?? { color: "#ef4444", brushSize: 0.005 },
  };
  switch (item.type) {
    case "freehand_drawing":
      return { ...base, type: "freehand", points: (item.payload.points as NormalizedPoint[]) ?? [] };
    case "drawing_circle":
      return { ...base, type: "circle", center: item.payload.center, radiusX: item.payload.radiusX, radiusY: item.payload.radiusY } as Annotation;
    case "drawing_box":
      return { ...base, type: "rectangle", origin: item.payload.origin, end: item.payload.end } as Annotation;
    default:
      return null;
  }
}

type ReviewVideoAreaProps = {
  src: string;
  duration: number;
  poster?: string;
  /** @description Pre-created player state from useVideoPlayer, lifted for shared access. */
  playerState: ReturnType<typeof useVideoPlayer>;
  /** @description Whether the user has write permission (enables drawing controls). */
  canWrite: boolean;
  /** @description Server-backed saved annotations (owned by the React Query cache). */
  savedAnnotations?: AnnotationListItem[];
  /** @description Called with each new annotation after the user finishes a stroke. */
  onAnnotationSaved?: (annotation: Annotation) => void;
  /** @description Called when the object-eraser removes a saved annotation. */
  onAnnotationDeleted?: (id: string) => void;
};

/**
 * @description Video player area with annotation overlay and drawing toolbar.
 * Saved annotations come from the query cache via `savedAnnotations`; the
 * local reducer owns only the user's in-progress unsaved drawings. The canvas
 * renders the merged list so server-side edits (e.g. duration changes) take
 * effect without remounting.
 */
export function ReviewVideoArea({
  src,
  duration,
  poster,
  playerState,
  canWrite,
  savedAnnotations,
  onAnnotationSaved,
  onAnnotationDeleted,
}: ReviewVideoAreaProps) {
  const unsavedState = useAnnotationState();

  const savedCanvas = useMemo(
    () =>
      savedAnnotations?.flatMap((item) => {
        const a = toCanvasAnnotation(item);
        return a ? [a] : [];
      }) ?? [],
    [savedAnnotations],
  );

  const savedIds = useMemo(
    () => new Set(savedCanvas.map((a) => a.id)),
    [savedCanvas],
  );

  const mergedAnnotations = useMemo(
    () => [...savedCanvas, ...unsavedState.annotations],
    [savedCanvas, unsavedState.annotations],
  );

  const [drawingEnabled, setDrawingEnabled] = useState(false);
  const [tool, setTool] = useState<AnnotationTool>("freehand");
  const [settings, setSettings] = useState<DrawingSettings>({
    color: "#ef4444",
    brushSize: 0.005,
  });

  /**
   * @description Removes an annotation. Saved annotations are deleted via the
   * mutation callback; unsaved (in-session) annotations are dropped from the
   * local reducer.
   */
  const removeAnnotation = useCallback(
    (id: string) => {
      if (savedIds.has(id)) {
        onAnnotationDeleted?.(id);
      } else {
        unsavedState.removeAnnotation(id);
      }
    },
    [savedIds, onAnnotationDeleted, unsavedState],
  );

  /**
   * @description Discards all unsaved annotations from the current session.
   */
  function discardUnsaved() {
    if (unsavedState.annotations.length === 0) return;
    unsavedState.clear();
  }

  /**
   * @description Toggles drawing mode on/off. Pauses the video when enabling
   * so users can't start playback while drawing. When disabling, persists any
   * annotations drawn during the session; the cache invalidation on save will
   * reconcile them back into `savedAnnotations`.
   */
  const toggleDrawing = useCallback(() => {
    if (drawingEnabled) {
      for (const a of unsavedState.annotations) {
        onAnnotationSaved?.(a);
      }
      unsavedState.clear();
      setDrawingEnabled(false);
    } else {
      playerState.videoRef.current?.pause();
      setDrawingEnabled(true);
    }
  }, [drawingEnabled, playerState.videoRef, unsavedState, onAnnotationSaved]);

  const canvasState: UseAnnotationStateReturn = {
    annotations: mergedAnnotations,
    addAnnotation: unsavedState.addAnnotation,
    removeAnnotation,
    updateAnnotation: unsavedState.updateAnnotation,
    undo: unsavedState.undo,
    clear: unsavedState.clear,
    init: unsavedState.init,
  };

  const drawToolbar = (
    <AnimatePresence>
      {drawingEnabled && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute inset-x-0 top-0 z-20"
        >
          <AnnotationToolbar
            tool={tool}
            onToolChange={setTool}
            settings={settings}
            onSettingsChange={setSettings}
            onUndo={unsavedState.undo}
            onClear={discardUnsaved}
            canUndo={unsavedState.annotations.length > 0}
            canClear={unsavedState.annotations.length > 0}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );

  const annotationOverlay = (
    <AnnotationCanvas
      containerRef={playerState.containerRef}
      state={canvasState}
      videoCurrentTime={playerState.currentTime}
      tool={tool}
      settings={settings}
      enabled={drawingEnabled}
    />
  );

  return (
    <VideoPlayer
      src={src}
      duration={duration}
      poster={poster}
      playerState={playerState}
      onDrawToggle={canWrite ? toggleDrawing : undefined}
      drawingEnabled={drawingEnabled}
      drawToolbarSlot={drawToolbar}
      overlaySlot={annotationOverlay}
      fill
    />
  );
}

export { type ReviewVideoAreaProps };
