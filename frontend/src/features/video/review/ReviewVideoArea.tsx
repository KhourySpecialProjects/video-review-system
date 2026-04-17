import { useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { VideoPlayer } from "@/features/video/videoPlayer/VideoPlayer";
import { AnnotationCanvas } from "@/features/video/annotations/drawing/canvas/AnnotationCanvas";
import { AnnotationToolbar } from "@/features/video/annotations/drawing/toolbar/AnnotationToolbar";
import { useAnnotationState } from "@/features/video/annotations/useAnnotationState";
import type { Annotation, AnnotationTool, DrawingSettings, NormalizedPoint } from "@/features/video/annotations/types";
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
    author: (item.payload.author as string) ?? "",
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
  /** @description Annotations loaded from the route loader to hydrate the canvas. */
  initialAnnotations?: AnnotationListItem[];
  /** @description Called with each new annotation after the user finishes a stroke. */
  onAnnotationSaved?: (annotation: Annotation) => void;
};

/**
 * @description Video player area with annotation overlay and drawing toolbar.
 * The toolbar slides down from the top of the video container when drawing
 * mode is toggled via the player controls or the "D" keyboard shortcut.
 */
export function ReviewVideoArea({
  src,
  duration,
  poster,
  playerState,
  canWrite,
  initialAnnotations,
  onAnnotationSaved,
}: ReviewVideoAreaProps) {
  const seed = initialAnnotations?.flatMap((item) => {
    const a = toCanvasAnnotation(item);
    return a ? [a] : [];
  });
  const annotationState = useAnnotationState(seed);

  const [drawingEnabled, setDrawingEnabled] = useState(false);
  const [tool, setTool] = useState<AnnotationTool>("freehand");
  const [settings, setSettings] = useState<DrawingSettings>({
    color: "#ef4444",
    brushSize: 0.005,
  });

  /**
   * Unsaved annotation ids added during the current drawing session.
   * Persisted and cleared when the user toggles drawing off; discarded
   * wholesale when the user clicks the trash button.
   */
  const unsavedIdsRef = useRef<Set<string>>(new Set());

  /**
   * @description Adds a new annotation to local state and marks it unsaved.
   * Persistence is deferred until the user toggles drawing off.
   */
  function addLocal(annotation: Annotation) {
    unsavedIdsRef.current.add(annotation.id);
    annotationState.addAnnotation(annotation);
  }

  /**
   * @description Drops all unsaved annotations from local state without
   * persisting them. Leaves already-saved annotations untouched.
   */
  function discardUnsaved() {
    if (unsavedIdsRef.current.size === 0) return;
    const kept = annotationState.annotations.filter(
      (a) => !unsavedIdsRef.current.has(a.id),
    );
    unsavedIdsRef.current.clear();
    annotationState.init(kept);
  }

  /**
   * @description Toggles drawing mode on/off. Pauses the video when enabling
   * so users can't start playback while drawing. When disabling, persists
   * any annotations drawn during the session and resets the undo history.
   */
  const toggleDrawing = useCallback(() => {
    if (drawingEnabled) {
      for (const a of annotationState.annotations) {
        if (unsavedIdsRef.current.has(a.id)) onAnnotationSaved?.(a);
      }
      unsavedIdsRef.current.clear();
      annotationState.init(annotationState.annotations);
      setDrawingEnabled(false);
    } else {
      playerState.videoRef.current?.pause();
      setDrawingEnabled(true);
    }
  }, [drawingEnabled, playerState.videoRef, annotationState, onAnnotationSaved]);

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
            onUndo={annotationState.undo}
            onClear={discardUnsaved}
            canUndo={annotationState.annotations.length > 0}
            canClear={unsavedIdsRef.current.size > 0}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );

  const annotationOverlay = (
    <AnnotationCanvas
      containerRef={playerState.containerRef}
      state={{ ...annotationState, addAnnotation: addLocal }}
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
