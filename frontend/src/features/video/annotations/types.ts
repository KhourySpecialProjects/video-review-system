/**
 * Normalized 2D point with coordinates in the `[0, 1]` range.
 *
 * Values are relative to the video's natural dimensions so that
 * annotations render correctly at any resolution or aspect ratio.
 *
 * @example
 * ```ts
 * const center: NormalizedPoint = { x: 0.5, y: 0.5 };
 * ```
 */
export type NormalizedPoint = {
    /** Horizontal position, `0` = left edge, `1` = right edge. */
    x: number;
    /** Vertical position, `0` = top edge, `1` = bottom edge. */
    y: number;
};

/**
 * The drawing tool the user has currently selected.
 *
 * - `"freehand"` — draw freeform strokes.
 * - `"circle"` — draw ellipses from center-drag.
 * - `"rectangle"` — draw rectangles from corner-drag.
 * - `"eraser"` — pixel-level eraser (composites with `destination-out`).
 * - `"object-eraser"` — removes entire annotation objects on click.
 *
 * @example
 * ```ts
 * const tool: AnnotationTool = "freehand";
 * ```
 */
export type AnnotationTool =
    | "freehand"
    | "circle"
    | "rectangle"
    | "eraser"
    | "object-eraser";

/**
 * Visual settings applied when drawing an annotation.
 *
 * Stored with each annotation so it can be re-rendered faithfully.
 *
 * @example
 * ```ts
 * const settings: DrawingSettings = {
 *     color: "#ff0000",
 *     brushSize: 4,
 * };
 * ```
 */
export type DrawingSettings = {
    /** CSS color string (hex, rgb, etc.). */
    color: string;
    /**
     * Brush width in normalized units relative to canvas width.
     *
     * Stored normalized so strokes scale with resolution.
     * Typical range: `0.002` – `0.02`.
     */
    brushSize: number;
};

/**
 * Base fields shared by every annotation shape.
 *
 * Each annotation is timestamped to a point in the video and
 * displayed for a configurable duration.
 */
type AnnotationBase = {
    /** Unique identifier for this annotation. */
    id: string;
    /** Video time (seconds) when this annotation becomes visible. */
    timestamp: number;
    /** How long (seconds) the annotation stays visible. Defaults to `5`. */
    duration: number;
    /** Visual settings used when this annotation was drawn. */
    settings: DrawingSettings;
};

/**
 * A freehand stroke annotation stored as an array of normalized points.
 *
 * @example
 * ```ts
 * const stroke: FreehandAnnotation = {
 *     id: "a1",
 *     type: "freehand",
 *     timestamp: 12.5,
 *     duration: 5,
 *     settings: { color: "#ff0000", brushSize: 0.005 },
 *     points: [{ x: 0.1, y: 0.2 }, { x: 0.15, y: 0.25 }],
 * };
 * ```
 */
export type FreehandAnnotation = AnnotationBase & {
    type: "freehand";
    /** Ordered array of normalized points forming the stroke path. */
    points: NormalizedPoint[];
};

/**
 * A pixel-level eraser stroke.
 *
 * Rendered identically to a freehand stroke but composited with
 * `globalCompositeOperation: "destination-out"` to erase pixels.
 *
 * @example
 * ```ts
 * const eraser: EraserAnnotation = {
 *     id: "e1",
 *     type: "eraser",
 *     timestamp: 12.5,
 *     duration: 5,
 *     settings: { color: "#000000", brushSize: 0.01 },
 *     points: [{ x: 0.3, y: 0.4 }],
 * };
 * ```
 */
export type EraserAnnotation = AnnotationBase & {
    type: "eraser";
    /** Ordered array of normalized points forming the eraser path. */
    points: NormalizedPoint[];
};

/**
 * A circle (ellipse) annotation defined by center and radii.
 *
 * @example
 * ```ts
 * const circle: CircleAnnotation = {
 *     id: "c1",
 *     type: "circle",
 *     timestamp: 30,
 *     duration: 5,
 *     settings: { color: "#00ff00", brushSize: 0.004 },
 *     center: { x: 0.5, y: 0.5 },
 *     radiusX: 0.2,
 *     radiusY: 0.15,
 * };
 * ```
 */
export type CircleAnnotation = AnnotationBase & {
    type: "circle";
    /** Center point of the ellipse in normalized coordinates. */
    center: NormalizedPoint;
    /** Horizontal radius in normalized units. */
    radiusX: number;
    /** Vertical radius in normalized units. */
    radiusY: number;
};

/**
 * A rectangle annotation defined by two opposite corners.
 *
 * @example
 * ```ts
 * const rect: RectangleAnnotation = {
 *     id: "r1",
 *     type: "rectangle",
 *     timestamp: 45,
 *     duration: 5,
 *     settings: { color: "#0000ff", brushSize: 0.004 },
 *     origin: { x: 0.1, y: 0.1 },
 *     end: { x: 0.5, y: 0.5 },
 * };
 * ```
 */
export type RectangleAnnotation = AnnotationBase & {
    type: "rectangle";
    /** First corner (where the user started dragging). */
    origin: NormalizedPoint;
    /** Opposite corner (where the user released). */
    end: NormalizedPoint;
};

/**
 * Discriminated union of all annotation shapes.
 *
 * Use the `type` field to narrow:
 * ```ts
 * if (annotation.type === "freehand") {
 *     annotation.points; // TS knows this is FreehandAnnotation
 * }
 * ```
 */
export type Annotation =
    | FreehandAnnotation
    | EraserAnnotation
    | CircleAnnotation
    | RectangleAnnotation;

/**
 * Actions that can be dispatched to the annotation reducer.
 *
 * @example
 * ```ts
 * dispatch({ type: "ADD", annotation });
 * dispatch({ type: "REMOVE", id: "a1" });
 * dispatch({ type: "UNDO" });
 * dispatch({ type: "CLEAR" });
 * ```
 */
export type AnnotationAction =
    | { type: "ADD"; annotation: Annotation }
    | { type: "REMOVE"; id: string }
    | { type: "UNDO" }
    | { type: "CLEAR" }
    | { type: "INIT"; annotations: Annotation[] };

/**
 * Internal state shape for the annotation reducer.
 *
 * Tracks both the current annotation list and a history stack
 * for undo support.
 */
export type AnnotationReducerState = {
    /** Current list of all annotations. */
    annotations: Annotation[];
    /** Stack of previous annotation arrays for undo. */
    history: Annotation[][];
};

/**
 * Return value of the `useAnnotationState` hook.
 *
 * Exposes the annotation data and mutation methods.
 * This is the "data" layer that the parent component owns
 * and will eventually persist to the database.
 *
 * @example
 * ```ts
 * const state = useAnnotationState();
 * state.addAnnotation(newAnnotation);
 * state.undo();
 * ```
 */
export type UseAnnotationStateReturn = {
    /** Current list of all annotations. */
    annotations: Annotation[];
    /**
     * Add a new annotation to the list.
     *
     * @param annotation - The annotation to add.
     */
    addAnnotation: (annotation: Annotation) => void;
    /**
     * Remove an annotation by its ID.
     *
     * @param id - The unique ID of the annotation to remove.
     */
    removeAnnotation: (id: string) => void;
    /** Undo the last annotation action, restoring the previous state. */
    undo: () => void;
    /** Remove all annotations and clear history. */
    clear: () => void;
    /**
     * Initialize annotations from an external source (e.g. route loader).
     *
     * @param annotations - The annotations to load.
     */
    init: (annotations: Annotation[]) => void;
};

/** Default duration in seconds for a new annotation. */
export const DEFAULT_ANNOTATION_DURATION = 5;
