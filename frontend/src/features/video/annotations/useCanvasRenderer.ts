import { useCallback, useEffect, useRef, useState } from "react";
import type { Annotation } from "./types";
import type { ActiveDrawing } from "./useDrawing";
import { getVisibleAnnotations } from "./helpers";
import { drawAnnotation, drawActiveStroke } from "./renderers";

/** @see {@link useCanvasRenderer} */
export type UseCanvasRendererParams = {
    /** Canvas for committed annotations (bottom layer). */
    committedCanvasRef: React.RefObject<HTMLCanvasElement | null>;
    /** Canvas for the active in-progress stroke (top layer). */
    activeCanvasRef: React.RefObject<HTMLCanvasElement | null>;
    /** Container element to size canvases against via ResizeObserver. */
    containerRef: React.RefObject<HTMLElement | null>;
    /** All committed annotations. */
    annotations: Annotation[];
    /** Current video playback time in seconds. */
    videoCurrentTime: number;
    /** Mutable ref to the in-progress drawing. Read by the rAF loop. */
    activeRef: React.RefObject<ActiveDrawing>;
};

/** @see {@link useCanvasRenderer} */
export type UseCanvasRendererReturn = {
    /** Call to start the rAF paint loop (e.g. on pointer down). */
    startPaintLoop: () => void;
    /** Call to stop the rAF paint loop (e.g. on pointer up). */
    stopPaintLoop: () => void;
};

/**
 * Sync a canvas's backing-store to `width * dpr` and scale its context.
 *
 * @param canvas - Canvas element.
 * @param width - CSS pixel width.
 * @param height - CSS pixel height.
 * @param dpr - Device pixel ratio.
 */
function syncCanvasSize(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    dpr: number,
): void {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
}

/**
 * Get CSS pixel dimensions from a canvas, accounting for DPR.
 *
 * @param canvas - Canvas element.
 * @returns `{ width, height }` in CSS pixels.
 */
function getCssDimensions(canvas: HTMLCanvasElement): { width: number; height: number } {
    const dpr = window.devicePixelRatio || 1;
    return { width: canvas.width / dpr, height: canvas.height / dpr };
}

/**
 * Dual-canvas renderer with a rAF loop for the active stroke.
 *
 * - **Committed canvas**: redrawn only when `annotations` or
 *   `videoCurrentTime` change.
 * - **Active canvas**: painted every animation frame via rAF,
 *   reading directly from the mutable `activeRef`. No React
 *   re-renders needed during drawing.
 *
 * @param params - See {@link UseCanvasRendererParams}.
 */
export function useCanvasRenderer({
    committedCanvasRef,
    activeCanvasRef,
    containerRef,
    annotations,
    videoCurrentTime,
    activeRef,
}: UseCanvasRendererParams): UseCanvasRendererReturn {
    // Bumped on resize so the committed-canvas repaint effect re-runs.
    const [resizeTick, setResizeTick] = useState(0);

    // Resize both canvases when container changes
    useEffect(() => {
        const container = containerRef.current;
        const committed = committedCanvasRef.current;
        const active = activeCanvasRef.current;
        if (!container || !committed || !active) return;

        const syncSize = () => {
            const dpr = window.devicePixelRatio || 1;
            const { width, height } = container.getBoundingClientRect();
            syncCanvasSize(committed, width, height, dpr);
            syncCanvasSize(active, width, height, dpr);
            setResizeTick((t) => t + 1);
        };

        const observer = new ResizeObserver(syncSize);
        observer.observe(container);
        syncSize();

        return () => observer.disconnect();
    }, [containerRef, committedCanvasRef, activeCanvasRef]);

    // Repaint committed annotations only when data or time changes
    useEffect(() => {
        const canvas = committedCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { width, height } = getCssDimensions(canvas);
        ctx.clearRect(0, 0, width, height);

        const visible = getVisibleAnnotations(annotations, videoCurrentTime);
        for (const annotation of visible) {
            drawAnnotation(ctx, annotation, width, height);
        }
    }, [committedCanvasRef, annotations, videoCurrentTime, resizeTick]);

    // rAF loop for the active stroke — only runs while drawing
    const rafRef = useRef(0);

    /**
     * Single rAF paint frame. Schedules the next frame only while
     * `activeRef.current` is non-null.
     */
    const paintRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const canvas = activeCanvasRef.current;
        const committedCanvas = committedCanvasRef.current;
        if (!canvas || !committedCanvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        paintRef.current = () => {
            const { width, height } = getCssDimensions(canvas);
            ctx.clearRect(0, 0, width, height);

            if (!activeRef.current) {
                // Stroke ended — ensure committed canvas is visible and stop.
                committedCanvas.style.visibility = "visible";
                rafRef.current = 0;
                return;
            }

            const isErasing = activeRef.current.type === "eraser";

            // For eraser strokes, copy the committed layer so destination-out
            // can punch holes in real time. Hide the committed canvas to
            // prevent double-draw while the active canvas has the copy.
            if (isErasing) {
                committedCanvas.style.visibility = "hidden";
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.drawImage(committedCanvas, 0, 0);
                ctx.restore();
            } else {
                committedCanvas.style.visibility = "visible";
            }

            drawActiveStroke(ctx, activeRef.current, width, height);
            rafRef.current = requestAnimationFrame(paintRef.current!);
        };

        return () => {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
            if (committedCanvas) {
                committedCanvas.style.visibility = "visible";
            }
        };
    }, [activeCanvasRef, committedCanvasRef, activeRef]);

    /**
     * Start the rAF paint loop. Call on pointer down.
     */
    const startPaintLoop = useCallback(() => {
        if (rafRef.current || !paintRef.current) return;
        rafRef.current = requestAnimationFrame(paintRef.current);
    }, []);

    /**
     * Stop the rAF paint loop. Call on pointer up.
     */
    const stopPaintLoop = useCallback(() => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;

        // Do one final paint to clear the active canvas and restore visibility.
        paintRef.current?.();
    }, []);

    return { startPaintLoop, stopPaintLoop };
}
