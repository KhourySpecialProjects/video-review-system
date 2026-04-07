import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDrawing } from "./useDrawing";
import type { Annotation, FreehandAnnotation, DrawingSettings } from "./types";

const defaultSettings: DrawingSettings = {
    color: "#ff0000",
    brushSize: 0.005,
};

/**
 * Build a freehand annotation with sensible defaults.
 */
function makeFreehand(id: string, timestamp = 0): FreehandAnnotation {
    return {
        id,
        type: "freehand",
        timestamp,
        duration: 5,
        settings: defaultSettings,
        points: [
            { x: 0.1, y: 0.1 },
            { x: 0.5, y: 0.5 },
        ],
    };
}

/**
 * Create a mock canvas with stubbed methods for jsdom.
 */
function createMockCanvas() {
    const canvas = document.createElement("canvas");

    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
    });

    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();

    return canvas;
}

/**
 * Create a minimal PointerEvent-like object for testing.
 */
function makePointerEvent(
    clientX: number,
    clientY: number,
    pointerId = 1,
): React.PointerEvent<HTMLCanvasElement> {
    return {
        clientX,
        clientY,
        pointerId,
        preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLCanvasElement>;
}

describe("useDrawing", () => {
    let mockCanvas: HTMLCanvasElement;
    let addAnnotation: Mock<(annotation: Annotation) => void>;
    let removeAnnotation: Mock<(id: string) => void>;

    beforeEach(() => {
        mockCanvas = createMockCanvas();
        addAnnotation = vi.fn<(annotation: Annotation) => void>();
        removeAnnotation = vi.fn<(id: string) => void>();
    });

    it("starts with null activeRef", () => {
        const canvasRef = { current: mockCanvas };

        const { result } = renderHook(() =>
            useDrawing({
                canvasRef,
                videoCurrentTime: 0,
                annotations: [],
                addAnnotation,
                removeAnnotation,
            }),
        );

        expect(result.current.activeRef.current).toBeNull();
    });

    it("begins a freehand stroke on pointer down", () => {
        const canvasRef = { current: mockCanvas };

        const { result } = renderHook(() =>
            useDrawing({
                canvasRef,
                videoCurrentTime: 10,
                annotations: [],
                addAnnotation,
                removeAnnotation,
            }),
        );

        act(() => {
            result.current.onPointerDown(
                makePointerEvent(400, 300),
                "freehand",
                defaultSettings,
            );
        });

        expect(result.current.activeRef.current).not.toBeNull();
        expect(result.current.activeRef.current!.type).toBe("freehand");
    });

    it("extends freehand stroke on pointer move", () => {
        const canvasRef = { current: mockCanvas };

        const { result } = renderHook(() =>
            useDrawing({
                canvasRef,
                videoCurrentTime: 10,
                annotations: [],
                addAnnotation,
                removeAnnotation,
            }),
        );

        act(() => {
            result.current.onPointerDown(
                makePointerEvent(400, 300),
                "freehand",
                defaultSettings,
            );
        });

        act(() => {
            result.current.onPointerMove(makePointerEvent(500, 400));
        });

        const active = result.current.activeRef.current;
        expect(active!.type).toBe("freehand");
        if (active!.type === "freehand") {
            expect(active!.points.length).toBeGreaterThan(1);
        }
    });

    it("commits freehand annotation on pointer up", () => {
        const canvasRef = { current: mockCanvas };

        const { result } = renderHook(() =>
            useDrawing({
                canvasRef,
                videoCurrentTime: 10,
                annotations: [],
                addAnnotation,
                removeAnnotation,
            }),
        );

        act(() => {
            result.current.onPointerDown(
                makePointerEvent(400, 300),
                "freehand",
                defaultSettings,
            );
        });
        act(() => {
            result.current.onPointerUp(makePointerEvent(500, 400));
        });

        expect(addAnnotation).toHaveBeenCalledTimes(1);
        const committed = addAnnotation.mock.calls[0][0] as Annotation;
        expect(committed.type).toBe("freehand");
        expect(committed.timestamp).toBe(10);
        expect(result.current.activeRef.current).toBeNull();
    });

    it("begins and commits a rectangle annotation", () => {
        const canvasRef = { current: mockCanvas };

        const { result } = renderHook(() =>
            useDrawing({
                canvasRef,
                videoCurrentTime: 5,
                annotations: [],
                addAnnotation,
                removeAnnotation,
            }),
        );

        act(() => {
            result.current.onPointerDown(
                makePointerEvent(100, 100),
                "rectangle",
                defaultSettings,
            );
        });

        expect(result.current.activeRef.current!.type).toBe("rectangle");

        act(() => {
            result.current.onPointerMove(makePointerEvent(600, 500));
        });
        act(() => {
            result.current.onPointerUp(makePointerEvent(600, 500));
        });

        expect(addAnnotation).toHaveBeenCalledTimes(1);
        expect(addAnnotation.mock.calls[0][0].type).toBe("rectangle");
    });

    it("begins and commits a circle annotation", () => {
        const canvasRef = { current: mockCanvas };

        const { result } = renderHook(() =>
            useDrawing({
                canvasRef,
                videoCurrentTime: 5,
                annotations: [],
                addAnnotation,
                removeAnnotation,
            }),
        );

        act(() => {
            result.current.onPointerDown(
                makePointerEvent(400, 300),
                "circle",
                defaultSettings,
            );
        });

        expect(result.current.activeRef.current!.type).toBe("circle");

        act(() => {
            result.current.onPointerMove(makePointerEvent(600, 450));
        });
        act(() => {
            result.current.onPointerUp(makePointerEvent(600, 450));
        });

        expect(addAnnotation).toHaveBeenCalledTimes(1);
        expect(addAnnotation.mock.calls[0][0].type).toBe("circle");
    });

    it("discards tiny shapes below the minimum size threshold", () => {
        const canvasRef = { current: mockCanvas };

        const { result } = renderHook(() =>
            useDrawing({
                canvasRef,
                videoCurrentTime: 5,
                annotations: [],
                addAnnotation,
                removeAnnotation,
            }),
        );

        act(() => {
            result.current.onPointerDown(
                makePointerEvent(400, 300),
                "rectangle",
                defaultSettings,
            );
        });
        act(() => {
            result.current.onPointerUp(makePointerEvent(401, 301));
        });

        expect(addAnnotation).not.toHaveBeenCalled();
    });

    it("removes annotation on object-eraser click when hit", () => {
        const canvasRef = { current: mockCanvas };
        const annotation = makeFreehand("a1", 0);

        const { result } = renderHook(() =>
            useDrawing({
                canvasRef,
                videoCurrentTime: 2,
                annotations: [annotation],
                addAnnotation,
                removeAnnotation,
            }),
        );

        act(() => {
            result.current.onPointerDown(
                makePointerEvent(240, 180),
                "object-eraser",
                defaultSettings,
            );
        });

        expect(removeAnnotation).toHaveBeenCalledWith("a1");
        expect(result.current.activeRef.current).toBeNull();
    });

    it("does nothing when pointer up is called without an active drawing", () => {
        const canvasRef = { current: mockCanvas };

        const { result } = renderHook(() =>
            useDrawing({
                canvasRef,
                videoCurrentTime: 0,
                annotations: [],
                addAnnotation,
                removeAnnotation,
            }),
        );

        act(() => {
            result.current.onPointerUp(makePointerEvent(400, 300));
        });

        expect(addAnnotation).not.toHaveBeenCalled();
        expect(result.current.activeRef.current).toBeNull();
    });

    it("creates eraser annotations with type eraser", () => {
        const canvasRef = { current: mockCanvas };

        const { result } = renderHook(() =>
            useDrawing({
                canvasRef,
                videoCurrentTime: 0,
                annotations: [],
                addAnnotation,
                removeAnnotation,
            }),
        );

        act(() => {
            result.current.onPointerDown(
                makePointerEvent(100, 100),
                "eraser",
                defaultSettings,
            );
        });
        act(() => {
            result.current.onPointerUp(makePointerEvent(200, 200));
        });

        expect(addAnnotation).toHaveBeenCalledTimes(1);
        expect(addAnnotation.mock.calls[0][0].type).toBe("eraser");
    });
});
