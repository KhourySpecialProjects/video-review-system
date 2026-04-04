import { describe, it, expect } from "vitest";
import {
    normalizeCoord,
    denormalizeCoord,
    normalizePoint,
    denormalizePoint,
    isAnnotationVisible,
    getVisibleAnnotations,
    distance,
    distanceToSegment,
    hitTestAnnotation,
    generateAnnotationId,
} from "./helpers";
import type {
    FreehandAnnotation,
    CircleAnnotation,
    RectangleAnnotation,
    EraserAnnotation,
    DrawingSettings,
} from "./types";

const defaultSettings: DrawingSettings = {
    color: "#ff0000",
    brushSize: 0.005,
};

/**
 * Build a freehand annotation with sensible defaults.
 */
function makeFreehand(
    overrides: Partial<FreehandAnnotation> = {},
): FreehandAnnotation {
    return {
        id: "fh-1",
        type: "freehand",
        timestamp: 0,
        duration: 5,
        settings: defaultSettings,
        points: [
            { x: 0.1, y: 0.1 },
            { x: 0.5, y: 0.5 },
        ],
        ...overrides,
    };
}

/**
 * Build a circle annotation with sensible defaults.
 */
function makeCircle(
    overrides: Partial<CircleAnnotation> = {},
): CircleAnnotation {
    return {
        id: "c-1",
        type: "circle",
        timestamp: 0,
        duration: 5,
        settings: defaultSettings,
        center: { x: 0.5, y: 0.5 },
        radiusX: 0.2,
        radiusY: 0.2,
        ...overrides,
    };
}

/**
 * Build a rectangle annotation with sensible defaults.
 */
function makeRectangle(
    overrides: Partial<RectangleAnnotation> = {},
): RectangleAnnotation {
    return {
        id: "r-1",
        type: "rectangle",
        timestamp: 0,
        duration: 5,
        settings: defaultSettings,
        origin: { x: 0.2, y: 0.2 },
        end: { x: 0.8, y: 0.8 },
        ...overrides,
    };
}

describe("normalizeCoord", () => {
    it("normalizes a midpoint value to 0.5", () => {
        expect(normalizeCoord(500, 1000)).toBe(0.5);
    });

    it("clamps to 0 when px is negative", () => {
        expect(normalizeCoord(-10, 1000)).toBe(0);
    });

    it("clamps to 1 when px exceeds size", () => {
        expect(normalizeCoord(1200, 1000)).toBe(1);
    });

    it("returns 0 when size is 0", () => {
        expect(normalizeCoord(100, 0)).toBe(0);
    });

    it("returns 0 when size is negative", () => {
        expect(normalizeCoord(100, -500)).toBe(0);
    });
});

describe("denormalizeCoord", () => {
    it("converts 0.5 to half the size", () => {
        expect(denormalizeCoord(0.5, 1000)).toBe(500);
    });

    it("converts 0 to 0", () => {
        expect(denormalizeCoord(0, 1000)).toBe(0);
    });

    it("converts 1 to the full size", () => {
        expect(denormalizeCoord(1, 800)).toBe(800);
    });
});

describe("normalizePoint", () => {
    it("normalizes pixel coordinates to [0,1] range", () => {
        const result = normalizePoint({ x: 400, y: 300 }, 800, 600);
        expect(result).toEqual({ x: 0.5, y: 0.5 });
    });

    it("clamps coordinates that are out of bounds", () => {
        const result = normalizePoint({ x: -10, y: 700 }, 800, 600);
        expect(result.x).toBe(0);
        expect(result.y).toBe(1);
    });
});

describe("denormalizePoint", () => {
    it("converts normalized point to pixel coordinates", () => {
        const result = denormalizePoint({ x: 0.5, y: 0.25 }, 800, 600);
        expect(result).toEqual({ x: 400, y: 150 });
    });
});

describe("isAnnotationVisible", () => {
    const annotation = makeFreehand({ timestamp: 10, duration: 5 });

    it("returns true at the start of the visibility window", () => {
        expect(isAnnotationVisible(annotation, 10)).toBe(true);
    });

    it("returns true in the middle of the window", () => {
        expect(isAnnotationVisible(annotation, 12.5)).toBe(true);
    });

    it("returns false at the exact end of the window", () => {
        expect(isAnnotationVisible(annotation, 15)).toBe(false);
    });

    it("returns false before the window starts", () => {
        expect(isAnnotationVisible(annotation, 9.99)).toBe(false);
    });

    it("returns false after the window ends", () => {
        expect(isAnnotationVisible(annotation, 16)).toBe(false);
    });
});

describe("getVisibleAnnotations", () => {
    const annotations = [
        makeFreehand({ id: "a", timestamp: 0, duration: 5 }),
        makeFreehand({ id: "b", timestamp: 3, duration: 5 }),
        makeFreehand({ id: "c", timestamp: 10, duration: 5 }),
    ];

    it("returns all annotations visible at time 4", () => {
        const visible = getVisibleAnnotations(annotations, 4);
        expect(visible.map((a) => a.id)).toEqual(["a", "b"]);
    });

    it("returns empty array when none are visible", () => {
        const visible = getVisibleAnnotations(annotations, 20);
        expect(visible).toEqual([]);
    });
});

describe("distance", () => {
    it("returns 0 for identical points", () => {
        expect(distance({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 })).toBe(0);
    });

    it("computes correct distance for unit separation", () => {
        expect(distance({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(1);
    });

    it("computes correct diagonal distance", () => {
        const d = distance({ x: 0, y: 0 }, { x: 0.3, y: 0.4 });
        expect(d).toBeCloseTo(0.5);
    });
});

describe("distanceToSegment", () => {
    it("returns 0 when point is on the segment", () => {
        const d = distanceToSegment(
            { x: 0.5, y: 0.5 },
            { x: 0, y: 0 },
            { x: 1, y: 1 },
        );
        expect(d).toBeCloseTo(0);
    });

    it("returns distance to nearest endpoint for zero-length segment", () => {
        const d = distanceToSegment(
            { x: 0.3, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
        );
        expect(d).toBeCloseTo(0.3);
    });

    it("returns perpendicular distance to segment midpoint", () => {
        const d = distanceToSegment(
            { x: 0.5, y: 0.6 },
            { x: 0, y: 0.5 },
            { x: 1, y: 0.5 },
        );
        expect(d).toBeCloseTo(0.1);
    });
});

describe("hitTestAnnotation", () => {
    describe("freehand", () => {
        it("hits a point near the stroke", () => {
            const ann = makeFreehand({
                points: [
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                ],
            });
            expect(hitTestAnnotation({ x: 0.5, y: 0.5 }, ann)).toBe(true);
        });

        it("misses a point far from the stroke", () => {
            const ann = makeFreehand({
                points: [
                    { x: 0, y: 0 },
                    { x: 0.1, y: 0.1 },
                ],
            });
            expect(hitTestAnnotation({ x: 0.9, y: 0.9 }, ann)).toBe(false);
        });

        it("returns false for empty points array", () => {
            const ann = makeFreehand({ points: [] });
            expect(hitTestAnnotation({ x: 0.5, y: 0.5 }, ann)).toBe(false);
        });

        it("hits a single-point annotation when close enough", () => {
            const ann = makeFreehand({ points: [{ x: 0.5, y: 0.5 }] });
            expect(hitTestAnnotation({ x: 0.51, y: 0.5 }, ann)).toBe(true);
        });
    });

    describe("eraser", () => {
        it("hit-tests identically to freehand", () => {
            const ann: EraserAnnotation = {
                id: "e-1",
                type: "eraser",
                timestamp: 0,
                duration: 5,
                settings: defaultSettings,
                points: [
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                ],
            };
            expect(hitTestAnnotation({ x: 0.5, y: 0.5 }, ann)).toBe(true);
        });
    });

    describe("circle", () => {
        it("hits a point on the circle boundary", () => {
            const ann = makeCircle({
                center: { x: 0.5, y: 0.5 },
                radiusX: 0.2,
                radiusY: 0.2,
            });
            expect(hitTestAnnotation({ x: 0.7, y: 0.5 }, ann)).toBe(true);
        });

        it("misses a point inside the circle (not near boundary)", () => {
            const ann = makeCircle({
                center: { x: 0.5, y: 0.5 },
                radiusX: 0.3,
                radiusY: 0.3,
            });
            expect(hitTestAnnotation({ x: 0.5, y: 0.5 }, ann)).toBe(false);
        });

        it("returns false for zero-radius circle", () => {
            const ann = makeCircle({ radiusX: 0, radiusY: 0 });
            expect(hitTestAnnotation({ x: 0.5, y: 0.5 }, ann)).toBe(false);
        });
    });

    describe("rectangle", () => {
        it("hits a point near the top edge", () => {
            const ann = makeRectangle({
                origin: { x: 0.2, y: 0.2 },
                end: { x: 0.8, y: 0.8 },
            });
            expect(hitTestAnnotation({ x: 0.5, y: 0.2 }, ann)).toBe(true);
        });

        it("hits a point near the left edge", () => {
            const ann = makeRectangle({
                origin: { x: 0.2, y: 0.2 },
                end: { x: 0.8, y: 0.8 },
            });
            expect(hitTestAnnotation({ x: 0.2, y: 0.5 }, ann)).toBe(true);
        });

        it("misses a point in the interior far from edges", () => {
            const ann = makeRectangle({
                origin: { x: 0.2, y: 0.2 },
                end: { x: 0.8, y: 0.8 },
            });
            expect(hitTestAnnotation({ x: 0.5, y: 0.5 }, ann)).toBe(false);
        });
    });
});

describe("generateAnnotationId", () => {
    it("returns a non-empty string", () => {
        const id = generateAnnotationId();
        expect(id.length).toBeGreaterThan(0);
    });

    it("generates unique IDs on successive calls", () => {
        const ids = new Set(
            Array.from({ length: 100 }, () => generateAnnotationId()),
        );
        expect(ids.size).toBe(100);
    });
});
