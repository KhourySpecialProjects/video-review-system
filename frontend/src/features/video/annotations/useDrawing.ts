import { useRef } from "react";
import type {
    Annotation,
    AnnotationTool,
    DrawingSettings,
    NormalizedPoint,
    FreehandAnnotation,
    EraserAnnotation,
    CircleAnnotation,
    RectangleAnnotation,
} from "./types";
import { DEFAULT_ANNOTATION_DURATION } from "./types";
import {
    normalizePoint,
    hitTestAnnotation,
    getVisibleAnnotations,
    generateAnnotationId,
} from "./helpers";

/** @see {@link useDrawing} */
export type UseDrawingParams = {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    videoCurrentTime: number;
    annotations: Annotation[];
    addAnnotation: (annotation: Annotation) => void;
    removeAnnotation: (id: string) => void;
};

/**
 * In-progress stroke/shape. `null` when idle.
 */
export type ActiveDrawing =
    | { type: "freehand"; points: NormalizedPoint[]; settings: DrawingSettings }
    | { type: "eraser"; points: NormalizedPoint[]; settings: DrawingSettings }
    | { type: "circle"; center: NormalizedPoint; current: NormalizedPoint; settings: DrawingSettings }
    | { type: "rectangle"; origin: NormalizedPoint; current: NormalizedPoint; settings: DrawingSettings }
    | null;

/** @see {@link useDrawing} */
export type UseDrawingReturn = {
    /** Mutable ref holding the in-progress drawing. Read by the renderer's rAF loop. */
    activeRef: React.RefObject<ActiveDrawing>;
    /** @param e - Pointer event. @param tool - Active tool. @param settings - Draw settings. */
    onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>, tool: AnnotationTool, settings: DrawingSettings) => void;
    /** @param e - Pointer event. */
    onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
    /** @param e - Pointer event. */
    onPointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => void;
};

/**
 * Normalize a pointer event position to `[0, 1]` canvas space.
 *
 * @param e - The pointer event.
 * @param canvas - The canvas element.
 * @returns Normalized point.
 */
function getPointFromEvent(
    e: React.PointerEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
): NormalizedPoint {
    const rect = canvas.getBoundingClientRect();
    return normalizePoint(
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        rect.width,
        rect.height,
    );
}

/**
 * Manages canvas pointer interactions for drawing annotations.
 *
 * The active drawing lives in a mutable ref so freehand points
 * are pushed in-place (O(1) per move). Memoization is left to
 * the React Compiler.
 *
 * @param params - See {@link UseDrawingParams}.
 * @returns See {@link UseDrawingReturn}.
 */
export function useDrawing({
    canvasRef,
    videoCurrentTime,
    annotations,
    addAnnotation,
    removeAnnotation,
}: UseDrawingParams): UseDrawingReturn {
    const activeRef = useRef<ActiveDrawing>(null);

    /**
     * Start a stroke/shape or hit-test for object-eraser.
     *
     * @param e - Pointer event.
     * @param tool - Active tool.
     * @param settings - Drawing settings.
     */
    function onPointerDown(
        e: React.PointerEvent<HTMLCanvasElement>,
        tool: AnnotationTool,
        settings: DrawingSettings,
    ) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        const point = getPointFromEvent(e, canvas);

        if (tool === "object-eraser") {
            const visible = getVisibleAnnotations(annotations, videoCurrentTime);
            for (let i = visible.length - 1; i >= 0; i--) {
                if (hitTestAnnotation(point, visible[i])) {
                    removeAnnotation(visible[i].id);
                    return;
                }
            }
            return;
        }

        switch (tool) {
            case "freehand":
                activeRef.current = { type: "freehand", points: [point], settings };
                break;
            case "eraser":
                activeRef.current = { type: "eraser", points: [point], settings };
                break;
            case "circle":
                activeRef.current = { type: "circle", center: point, current: point, settings };
                break;
            case "rectangle":
                activeRef.current = { type: "rectangle", origin: point, current: point, settings };
                break;
        }
    }

    /**
     * Extend the in-progress stroke/shape. Mutates the ref in-place.
     *
     * @param e - Pointer event.
     */
    function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current;
        const active = activeRef.current;
        if (!canvas || !active) return;

        const point = getPointFromEvent(e, canvas);

        switch (active.type) {
            case "freehand":
            case "eraser":
                active.points.push(point);
                break;
            case "circle":
            case "rectangle":
                active.current = point;
                break;
        }
    }

    /**
     * Finalize the drawing, snapshot the mutable data, and commit.
     * Discards shapes below 0.5% of canvas to prevent micro-clicks.
     *
     * @param e - Pointer event.
     */
    function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.releasePointerCapture(e.pointerId);

        const active = activeRef.current;
        if (!active) return;

        const timestamp = videoCurrentTime;
        const id = generateAnnotationId();
        let annotation: Annotation | null = null;

        switch (active.type) {
            case "freehand": {
                if (active.points.length > 0) {
                    const freehand: FreehandAnnotation = {
                        id, type: "freehand", timestamp,
                        duration: DEFAULT_ANNOTATION_DURATION,
                        settings: active.settings,
                        points: [...active.points],
                    };
                    annotation = freehand;
                }
                break;
            }
            case "eraser": {
                if (active.points.length > 0) {
                    const eraser: EraserAnnotation = {
                        id, type: "eraser", timestamp,
                        duration: DEFAULT_ANNOTATION_DURATION,
                        settings: active.settings,
                        points: [...active.points],
                    };
                    annotation = eraser;
                }
                break;
            }
            case "circle": {
                const dx = active.current.x - active.center.x;
                const dy = active.current.y - active.center.y;
                if (Math.abs(dx) > 0.005 || Math.abs(dy) > 0.005) {
                    const circle: CircleAnnotation = {
                        id, type: "circle", timestamp,
                        duration: DEFAULT_ANNOTATION_DURATION,
                        settings: active.settings,
                        center: active.center,
                        radiusX: Math.abs(dx),
                        radiusY: Math.abs(dy),
                    };
                    annotation = circle;
                }
                break;
            }
            case "rectangle": {
                const w = Math.abs(active.current.x - active.origin.x);
                const h = Math.abs(active.current.y - active.origin.y);
                if (w > 0.005 || h > 0.005) {
                    const rect: RectangleAnnotation = {
                        id, type: "rectangle", timestamp,
                        duration: DEFAULT_ANNOTATION_DURATION,
                        settings: active.settings,
                        origin: active.origin,
                        end: active.current,
                    };
                    annotation = rect;
                }
                break;
            }
        }

        if (annotation) {
            addAnnotation(annotation);
        }

        activeRef.current = null;
    }

    return {
        activeRef,
        onPointerDown,
        onPointerMove,
        onPointerUp,
    };
}
