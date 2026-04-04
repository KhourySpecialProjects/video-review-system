import { useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import type {
    AnnotationTool,
    DrawingSettings,
    UseAnnotationStateReturn,
} from "../../types";
import { useDrawing } from "../../useDrawing";
import { useCanvasRenderer } from "../../useCanvasRenderer";

/** Props for {@link AnnotationCanvas}. */
export type AnnotationCanvasProps = {
    /** Container element the canvases overlay. Sized via ResizeObserver. */
    containerRef: React.RefObject<HTMLElement | null>;
    /** Annotation data state from `useAnnotationState`. */
    state: UseAnnotationStateReturn;
    /** Current video playback time in seconds. */
    videoCurrentTime: number;
    /** Currently active drawing tool. */
    tool: AnnotationTool;
    /** Current drawing settings (color, brush size). */
    settings: DrawingSettings;
    /** When `false`, pointer-events pass through to the video beneath. */
    enabled: boolean;
};

/**
 * Build a CSS `cursor` value. Eraser tools get an SVG circle
 * matching the brush size; other tools get `crosshair`.
 *
 * @param tool - Active tool.
 * @param enabled - Drawing enabled.
 * @param brushSize - Normalized brush size.
 * @param containerWidth - Container CSS pixel width.
 * @returns CSS cursor value.
 */
function buildCursorStyle(
    tool: AnnotationTool,
    enabled: boolean,
    brushSize: number,
    containerWidth: number,
): string {
    if (!enabled) return "default";
    if (tool !== "eraser" && tool !== "object-eraser") return "crosshair";

    const diameterPx = Math.max(4, Math.min(128, brushSize * containerWidth));
    const radius = diameterPx / 2;

    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${diameterPx}" height="${diameterPx}">`,
        `<circle cx="${radius}" cy="${radius}" r="${radius - 1}" fill="none" stroke="white" stroke-width="1.5"/>`,
        `<circle cx="${radius}" cy="${radius}" r="${radius - 1}" fill="none" stroke="black" stroke-width="0.5"/>`,
        `</svg>`,
    ].join("");

    const encoded = encodeURIComponent(svg);
    return `url("data:image/svg+xml,${encoded}") ${radius} ${radius}, crosshair`;
}

/**
 * Dual-canvas annotation overlay.
 *
 * Renders two stacked `<canvas>` elements:
 * - Bottom: committed annotations (repainted on data/time change)
 * - Top: active stroke (painted via rAF loop, no React re-renders)
 *
 * Pointer events are handled on the top canvas.
 *
 * @param props - See {@link AnnotationCanvasProps}.
 */
export function AnnotationCanvas({
    containerRef,
    state,
    videoCurrentTime,
    tool,
    settings,
    enabled,
}: AnnotationCanvasProps) {
    const committedCanvasRef = useRef<HTMLCanvasElement>(null);
    const activeCanvasRef = useRef<HTMLCanvasElement>(null);

    const drawing = useDrawing({
        canvasRef: activeCanvasRef,
        videoCurrentTime,
        annotations: state.annotations,
        addAnnotation: state.addAnnotation,
        removeAnnotation: state.removeAnnotation,
    });

    useCanvasRenderer({
        committedCanvasRef,
        activeCanvasRef,
        containerRef,
        annotations: state.annotations,
        videoCurrentTime,
        activeRef: drawing.activeRef,
    });

    const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 0;
    const cursorStyle = useMemo(
        () => buildCursorStyle(tool, enabled, settings.brushSize, containerWidth),
        [tool, enabled, settings.brushSize, containerWidth],
    );

    const canvasClass = "absolute inset-0 touch-none";

    return (
        <>
            {/* Bottom layer: committed annotations */}
            <canvas
                ref={committedCanvasRef}
                className={cn(canvasClass, "pointer-events-none")}
                aria-hidden="true"
            />
            {/* Top layer: active stroke + pointer events */}
            <canvas
                ref={activeCanvasRef}
                className={cn(
                    canvasClass,
                    enabled ? "pointer-events-auto" : "pointer-events-none",
                )}
                style={{ cursor: cursorStyle }}
                onPointerDown={(e) => {
                    if (enabled) drawing.onPointerDown(e, tool, settings);
                }}
                onPointerMove={(e) => {
                    if (enabled) drawing.onPointerMove(e);
                }}
                onPointerUp={(e) => {
                    if (enabled) drawing.onPointerUp(e);
                }}
                aria-label="Annotation canvas"
                role="img"
            />
        </>
    );
}
