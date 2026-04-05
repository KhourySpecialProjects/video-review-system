import type { Annotation } from "./types";
import type { ActiveDrawing } from "./useDrawing";
import { denormalizeCoord } from "./helpers";

/**
 * Draw a freehand or eraser stroke path on the canvas.
 *
 * Shared by both committed annotations and active drawing previews
 * since freehand and eraser strokes render identically (the
 * composite operation is set by the caller).
 *
 * @param ctx - The canvas 2D rendering context.
 * @param points - The normalized points forming the stroke.
 * @param width - Canvas CSS width in pixels.
 * @param height - Canvas CSS height in pixels.
 */
function drawStrokePath(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    width: number,
    height: number,
): void {
    if (points.length === 0) return;

    ctx.beginPath();
    ctx.moveTo(
        denormalizeCoord(points[0].x, width),
        denormalizeCoord(points[0].y, height),
    );

    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(
            denormalizeCoord(points[i].x, width),
            denormalizeCoord(points[i].y, height),
        );
    }
    ctx.stroke();
}

/**
 * Draw a single committed annotation onto the canvas 2D context.
 *
 * Translates normalized coordinates to pixel coordinates using
 * the current canvas dimensions, then renders the appropriate
 * shape. Eraser annotations use `destination-out` compositing
 * to punch holes in previously drawn content.
 *
 * @param ctx - The canvas 2D rendering context.
 * @param annotation - The annotation to render.
 * @param width - Canvas CSS width in pixels.
 * @param height - Canvas CSS height in pixels.
 */
export function drawAnnotation(
    ctx: CanvasRenderingContext2D,
    annotation: Annotation,
    width: number,
    height: number,
): void {
    ctx.save();

    const brushPx = denormalizeCoord(annotation.settings.brushSize, width);

    if (annotation.type === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
    } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = annotation.settings.color;
    }

    ctx.lineWidth = brushPx;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (annotation.type) {
        case "freehand":
        case "eraser": {
            drawStrokePath(ctx, annotation.points, width, height);
            break;
        }
        case "circle": {
            const cx = denormalizeCoord(annotation.center.x, width);
            const cy = denormalizeCoord(annotation.center.y, height);
            const rx = denormalizeCoord(annotation.radiusX, width);
            const ry = denormalizeCoord(annotation.radiusY, height);

            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
            break;
        }
        case "rectangle": {
            const x1 = denormalizeCoord(annotation.origin.x, width);
            const y1 = denormalizeCoord(annotation.origin.y, height);
            const x2 = denormalizeCoord(annotation.end.x, width);
            const y2 = denormalizeCoord(annotation.end.y, height);

            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            break;
        }
        default: {
            const _exhaustive: never = annotation;
            throw new Error(`Unhandled annotation type: ${(_exhaustive as Annotation).type}`);
        }
    }

    ctx.restore();
}

/**
 * Draw the in-progress (active) stroke/shape onto the canvas.
 *
 * This renders the transient drawing that hasn't been committed
 * yet, giving the user real-time visual feedback as they draw.
 *
 * @param ctx - The canvas 2D rendering context.
 * @param active - The active drawing state from `useDrawing`.
 * @param width - Canvas CSS width in pixels.
 * @param height - Canvas CSS height in pixels.
 */
export function drawActiveStroke(
    ctx: CanvasRenderingContext2D,
    active: ActiveDrawing,
    width: number,
    height: number,
): void {
    if (!active) return;

    ctx.save();

    const brushPx = denormalizeCoord(active.settings.brushSize, width);

    if (active.type === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
    } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = active.settings.color;
    }

    ctx.lineWidth = brushPx;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (active.type) {
        case "freehand":
        case "eraser": {
            drawStrokePath(ctx, active.points, width, height);
            break;
        }
        case "circle": {
            const cx = denormalizeCoord(active.center.x, width);
            const cy = denormalizeCoord(active.center.y, height);
            const rx = Math.abs(
                denormalizeCoord(active.current.x, width) - cx,
            );
            const ry = Math.abs(
                denormalizeCoord(active.current.y, height) - cy,
            );

            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
            break;
        }
        case "rectangle": {
            const x1 = denormalizeCoord(active.origin.x, width);
            const y1 = denormalizeCoord(active.origin.y, height);
            const x2 = denormalizeCoord(active.current.x, width);
            const y2 = denormalizeCoord(active.current.y, height);

            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            break;
        }
        default: {
            const _exhaustive: never = active;
            throw new Error(`Unhandled active drawing type: ${(_exhaustive as NonNullable<ActiveDrawing>).type}`);
        }
    }

    ctx.restore();
}
