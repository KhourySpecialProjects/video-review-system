import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { VideoPlayer } from "@/features/video/videoPlayer/VideoPlayer";
import { AnnotationCanvas } from "@/features/video/annotations/drawing/canvas/AnnotationCanvas";
import { AnnotationToolbar } from "@/features/video/annotations/drawing/toolbar/AnnotationToolbar";
import { useAnnotationState } from "@/features/video/annotations/useAnnotationState";
import type { AnnotationTool, DrawingSettings } from "@/features/video/annotations/types";
import type { useVideoPlayer } from "@/hooks/useVideoPlayer";

type ReviewVideoAreaProps = {
  src: string;
  duration: number;
  poster?: string;
  /** @description Pre-created player state from useVideoPlayer, lifted for shared access. */
  playerState: ReturnType<typeof useVideoPlayer>;
  /** @description Whether the user has write permission (enables drawing controls). */
  canWrite: boolean;
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
}: ReviewVideoAreaProps) {
  const annotationState = useAnnotationState();

  const [drawingEnabled, setDrawingEnabled] = useState(false);
  const [tool, setTool] = useState<AnnotationTool>("freehand");
  const [settings, setSettings] = useState<DrawingSettings>({
    color: "#ef4444",
    brushSize: 0.005,
  });

  /**
   * @description Toggles drawing mode on/off. Used by player controls and keyboard shortcut.
   */
  const toggleDrawing = useCallback(() => {
    setDrawingEnabled((prev) => !prev);
  }, []);

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
            onClear={annotationState.clear}
            canUndo={annotationState.annotations.length > 0}
            canClear={annotationState.annotations.length > 0}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );

  const annotationOverlay = (
    <AnnotationCanvas
      containerRef={playerState.containerRef}
      state={annotationState}
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
    />
  );
}

export { type ReviewVideoAreaProps };
