import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnnotationCanvas } from "./AnnotationCanvas";
import type { UseAnnotationStateReturn } from "../../types";

beforeEach(() => {
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe = vi.fn();
            unobserve = vi.fn();
            disconnect = vi.fn();
        },
    );

    vi.stubGlobal("requestAnimationFrame", vi.fn((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
    }));

    vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

/**
 * Create a mock annotation state return value.
 */
function mockAnnotationState(): UseAnnotationStateReturn {
    return {
        annotations: [],
        addAnnotation: vi.fn(),
        removeAnnotation: vi.fn(),
        updateAnnotation: vi.fn(),
        undo: vi.fn(),
        clear: vi.fn(),
        init: vi.fn(),
    };
}

describe("AnnotationCanvas", () => {
    it("renders two canvas elements", () => {
        const container = document.createElement("div");
        const containerRef = { current: container };

        render(
            <AnnotationCanvas
                containerRef={containerRef}
                state={mockAnnotationState()}
                videoCurrentTime={0}
                tool="freehand"
                settings={{ color: "#ff0000", brushSize: 0.005 }}
                enabled={true}
            />,
        );

        const canvases = document.querySelectorAll("canvas");
        expect(canvases.length).toBe(2);
    });

    it("renders the interactive canvas with correct aria attributes", () => {
        const container = document.createElement("div");
        const containerRef = { current: container };

        render(
            <AnnotationCanvas
                containerRef={containerRef}
                state={mockAnnotationState()}
                videoCurrentTime={0}
                tool="freehand"
                settings={{ color: "#ff0000", brushSize: 0.005 }}
                enabled={true}
            />,
        );

        const canvas = screen.getByRole("img", { name: "Annotation canvas" });
        expect(canvas).toBeInTheDocument();
        expect(canvas.tagName).toBe("CANVAS");
    });

    it("sets pointer-events-auto on interactive canvas when enabled", () => {
        const container = document.createElement("div");
        const containerRef = { current: container };

        render(
            <AnnotationCanvas
                containerRef={containerRef}
                state={mockAnnotationState()}
                videoCurrentTime={0}
                tool="freehand"
                settings={{ color: "#ff0000", brushSize: 0.005 }}
                enabled={true}
            />,
        );

        const canvas = screen.getByRole("img");
        expect(canvas.className).toContain("pointer-events-auto");
    });

    it("sets pointer-events-none on interactive canvas when disabled", () => {
        const container = document.createElement("div");
        const containerRef = { current: container };

        render(
            <AnnotationCanvas
                containerRef={containerRef}
                state={mockAnnotationState()}
                videoCurrentTime={0}
                tool="freehand"
                settings={{ color: "#ff0000", brushSize: 0.005 }}
                enabled={false}
            />,
        );

        const canvas = screen.getByRole("img");
        expect(canvas.className).toContain("pointer-events-none");
    });

    it("applies crosshair cursor for drawing tools when enabled", () => {
        const container = document.createElement("div");
        const containerRef = { current: container };

        render(
            <AnnotationCanvas
                containerRef={containerRef}
                state={mockAnnotationState()}
                videoCurrentTime={0}
                tool="freehand"
                settings={{ color: "#ff0000", brushSize: 0.005 }}
                enabled={true}
            />,
        );

        const canvas = screen.getByRole("img");
        expect(canvas.style.cursor).toBe("crosshair");
    });

    it("applies default cursor when disabled", () => {
        const container = document.createElement("div");
        const containerRef = { current: container };

        render(
            <AnnotationCanvas
                containerRef={containerRef}
                state={mockAnnotationState()}
                videoCurrentTime={0}
                tool="freehand"
                settings={{ color: "#ff0000", brushSize: 0.005 }}
                enabled={false}
            />,
        );

        const canvas = screen.getByRole("img");
        expect(canvas.style.cursor).toBe("default");
    });
});
