import { useEffect, useRef } from "react";
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
}: UseCanvasRendererParams): void {
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
    }, [committedCanvasRef, annotations, videoCurrentTime]);

    // rAF loop for the active stroke — runs outside React's render cycle
    const rafRef = useRef(0);

    useEffect(() => {
        const canvas = activeCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const paint = () => {
            const { width, height } = getCssDimensions(canvas);
            ctx.clearRect(0, 0, width, height);
            drawActiveStroke(ctx, activeRef.current, width, height);
            rafRef.current = requestAnimationFrame(paint);
        };

        rafRef.current = requestAnimationFrame(paint);

        return () => cancelAnimationFrame(rafRef.current);
    }, [activeCanvasRef, activeRef]);
}
