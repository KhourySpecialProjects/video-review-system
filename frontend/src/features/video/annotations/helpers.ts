import type { Annotation, NormalizedPoint } from "./types";

/**
 * Convert a pixel coordinate to a normalized `[0, 1]` value.
 *
 * @param px - The pixel coordinate (e.g. offsetX or offsetY).
 * @param size - The total size of the axis in pixels (canvas width or height).
 * @returns A value clamped to `[0, 1]`.
 */
export function normalizeCoord(px: number, size: number): number {
  if (size <= 0) return 0;
  return Math.max(0, Math.min(1, px / size));
}

/**
 * Convert a normalized `[0, 1]` value back to a pixel coordinate.
 *
 * @param norm - The normalized value.
 * @param size - The total size of the axis in pixels.
 * @returns The pixel coordinate.
 */
export function denormalizeCoord(norm: number, size: number): number {
  return norm * size;
}

/**
 * Convert a pixel position `{ x, y }` to a normalized point.
 *
 * @param px - The pixel position.
 * @param canvasWidth - Canvas width in pixels.
 * @param canvasHeight - Canvas height in pixels.
 * @returns A {@link NormalizedPoint} with values clamped to `[0, 1]`.
 */
export function normalizePoint(
  px: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number
): NormalizedPoint {
  return {
    x: normalizeCoord(px.x, canvasWidth),
    y: normalizeCoord(px.y, canvasHeight),
  };
}

/**
 * Convert a normalized point back to pixel coordinates.
 *
 * @param point - The normalized point.
 * @param canvasWidth - Canvas width in pixels.
 * @param canvasHeight - Canvas height in pixels.
 * @returns Pixel coordinates `{ x, y }`.
 */
export function denormalizePoint(
  point: NormalizedPoint,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  return {
    x: denormalizeCoord(point.x, canvasWidth),
    y: denormalizeCoord(point.y, canvasHeight),
  };
}

/**
 * Check whether an annotation should be visible at a given video time.
 *
 * An annotation is visible when `timestamp <= time < timestamp + duration`.
 *
 * @param annotation - The annotation to check.
 * @param currentTime - The current video playback time in seconds.
 * @returns `true` if the annotation is visible.
 */
export function isAnnotationVisible(
  annotation: Annotation,
  currentTime: number
): boolean {
  return (
    currentTime >= annotation.timestamp &&
    currentTime < annotation.timestamp + annotation.duration
  );
}

/**
 * Filter an array of annotations to only those visible at the given time.
 *
 * @param annotations - All annotations.
 * @param currentTime - The current video playback time in seconds.
 * @returns Annotations whose time window includes `currentTime`.
 */
export function getVisibleAnnotations(
  annotations: Annotation[],
  currentTime: number
): Annotation[] {
  return annotations.filter((a) => isAnnotationVisible(a, currentTime));
}

/**
 * Compute the Euclidean distance between two normalized points.
 *
 * @param a - First point.
 * @param b - Second point.
 * @returns The distance in normalized coordinate space.
 */
export function distance(a: NormalizedPoint, b: NormalizedPoint): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Compute the minimum distance from a point to a line segment.
 *
 * Used for hit-testing freehand strokes. The distance is calculated
 * in normalized coordinate space.
 *
 * @param point - The test point.
 * @param segStart - Start of the line segment.
 * @param segEnd - End of the line segment.
 * @returns The minimum distance from `point` to the segment.
 */
export function distanceToSegment(
  point: NormalizedPoint,
  segStart: NormalizedPoint,
  segEnd: NormalizedPoint
): number {
  const dx = segEnd.x - segStart.x;
  const dy = segEnd.y - segStart.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return distance(point, segStart);

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lenSq
    )
  );

  return distance(point, {
    x: segStart.x + t * dx,
    y: segStart.y + t * dy,
  });
}

/**
 * Hit-test a normalized point against a single annotation.
 *
 * For freehand / eraser strokes, checks proximity to each line segment.
 * For circles, checks distance from the ellipse boundary.
 * For rectangles, checks proximity to each edge.
 *
 * @param point - The normalized point to test (e.g. where the user clicked).
 * @param annotation - The annotation to test against.
 * @param threshold - Hit distance threshold in normalized units.
 *   Defaults to `0.02` (~2% of canvas width).
 * @returns `true` if the point is close enough to the annotation.
 */
export function hitTestAnnotation(
  point: NormalizedPoint,
  annotation: Annotation,
  threshold: number = 0.02
): boolean {
  switch (annotation.type) {
    case "freehand":
    case "eraser": {
      const { points } = annotation;
      if (points.length === 0) return false;
      if (points.length === 1) return distance(point, points[0]) <= threshold;
      for (let i = 0; i < points.length - 1; i++) {
        if (distanceToSegment(point, points[i], points[i + 1]) <= threshold) {
          return true;
        }
      }
      return false;
    }
    case "circle": {
      const { center, radiusX, radiusY } = annotation;
      if (radiusX === 0 || radiusY === 0) return false;
      const normalizedDist = Math.sqrt(
        ((point.x - center.x) / radiusX) ** 2 +
          ((point.y - center.y) / radiusY) ** 2
      );
      return (
        Math.abs(normalizedDist - 1) <= threshold / Math.max(radiusX, radiusY)
      );
    }
    case "rectangle": {
      const { origin, end } = annotation;
      const left = Math.min(origin.x, end.x);
      const right = Math.max(origin.x, end.x);
      const top = Math.min(origin.y, end.y);
      const bottom = Math.max(origin.y, end.y);

      const edges: [NormalizedPoint, NormalizedPoint][] = [
        [
          { x: left, y: top },
          { x: right, y: top },
        ],
        [
          { x: right, y: top },
          { x: right, y: bottom },
        ],
        [
          { x: right, y: bottom },
          { x: left, y: bottom },
        ],
        [
          { x: left, y: bottom },
          { x: left, y: top },
        ],
      ];

      return edges.some(
        ([a, b]) => distanceToSegment(point, a, b) <= threshold
      );
    }
    default: {
      // Exhaustive check: TypeScript will error if a new annotation type is added
      const _exhaustive: never = annotation;
      return _exhaustive;
    }
  }
}

/**
 * Generate a unique ID for a new annotation.
 *
 * Uses `crypto.randomUUID()` when available, falls back to a
 * timestamp-based ID.
 *
 * @returns A unique string identifier.
 */
export function generateAnnotationId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
