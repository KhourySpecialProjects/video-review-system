import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAnnotationState } from "./useAnnotationState";
import { annotationReducer, createInitialState } from "./useAnnotationState";
import type { Annotation, FreehandAnnotation, DrawingSettings } from "./types";

const defaultSettings: DrawingSettings = {
    color: "#ff0000",
    brushSize: 0.005,
};

/**
 * Build a freehand annotation with sensible defaults.
 */
function makeFreehand(id: string): FreehandAnnotation {
    return {
        id,
        type: "freehand",
        timestamp: 0,
        duration: 5,
        settings: defaultSettings,
        points: [{ x: 0.1, y: 0.1 }],
    };
}

describe("annotationReducer", () => {
    it("adds an annotation and pushes previous state to history", () => {
        const initial = createInitialState();
        const annotation = makeFreehand("a1");

        const next = annotationReducer(initial, { type: "ADD", annotation });

        expect(next.annotations).toHaveLength(1);
        expect(next.annotations[0].id).toBe("a1");
        expect(next.history).toHaveLength(1);
        expect(next.history[0]).toEqual([]);
    });

    it("removes an annotation by id", () => {
        const state = {
            annotations: [makeFreehand("a1"), makeFreehand("a2")],
            history: [] as Annotation[][],
        };

        const next = annotationReducer(state, { type: "REMOVE", id: "a1" });

        expect(next.annotations).toHaveLength(1);
        expect(next.annotations[0].id).toBe("a2");
        expect(next.history).toHaveLength(1);
    });

    it("undoes the last action by restoring from history", () => {
        const previousAnnotations = [makeFreehand("a1")];
        const state = {
            annotations: [makeFreehand("a1"), makeFreehand("a2")],
            history: [previousAnnotations],
        };

        const next = annotationReducer(state, { type: "UNDO" });

        expect(next.annotations).toHaveLength(1);
        expect(next.annotations[0].id).toBe("a1");
        expect(next.history).toHaveLength(0);
    });

    it("returns same state when undoing with empty history", () => {
        const state = createInitialState();
        const next = annotationReducer(state, { type: "UNDO" });
        expect(next).toBe(state);
    });

    it("clears all annotations and history", () => {
        const state = {
            annotations: [makeFreehand("a1")],
            history: [[]] as Annotation[][],
        };

        const next = annotationReducer(state, { type: "CLEAR" });

        expect(next.annotations).toEqual([]);
        expect(next.history).toEqual([]);
    });

    it("initializes with provided annotations and clears history", () => {
        const state = {
            annotations: [makeFreehand("a1")],
            history: [[]] as Annotation[][],
        };

        const loaded = [makeFreehand("b1"), makeFreehand("b2")];
        const next = annotationReducer(state, {
            type: "INIT",
            annotations: loaded,
        });

        expect(next.annotations).toHaveLength(2);
        expect(next.annotations[0].id).toBe("b1");
        expect(next.history).toEqual([]);
    });

    it("caps history at 50 entries", () => {
        let state = createInitialState();

        // Add 55 annotations to push history beyond the cap
        for (let i = 0; i < 55; i++) {
            state = annotationReducer(state, {
                type: "ADD",
                annotation: makeFreehand(`a${i}`),
            });
        }

        expect(state.history.length).toBeLessThanOrEqual(50);
    });
});

describe("createInitialState", () => {
    it("creates empty state when no initial annotations provided", () => {
        const state = createInitialState();
        expect(state.annotations).toEqual([]);
        expect(state.history).toEqual([]);
    });

    it("creates state with initial annotations", () => {
        const initial = [makeFreehand("a1")];
        const state = createInitialState(initial);
        expect(state.annotations).toHaveLength(1);
        expect(state.history).toEqual([]);
    });
});

describe("useAnnotationState", () => {
    it("starts with empty annotations by default", () => {
        const { result } = renderHook(() => useAnnotationState());
        expect(result.current.annotations).toEqual([]);
    });

    it("starts with provided initial annotations", () => {
        const initial = [makeFreehand("a1")];
        const { result } = renderHook(() => useAnnotationState(initial));
        expect(result.current.annotations).toHaveLength(1);
    });

    it("adds an annotation via addAnnotation", () => {
        const { result } = renderHook(() => useAnnotationState());

        act(() => {
            result.current.addAnnotation(makeFreehand("a1"));
        });

        expect(result.current.annotations).toHaveLength(1);
        expect(result.current.annotations[0].id).toBe("a1");
    });

    it("removes an annotation via removeAnnotation", () => {
        const { result } = renderHook(() =>
            useAnnotationState([makeFreehand("a1"), makeFreehand("a2")]),
        );

        act(() => {
            result.current.removeAnnotation("a1");
        });

        expect(result.current.annotations).toHaveLength(1);
        expect(result.current.annotations[0].id).toBe("a2");
    });

    it("undoes the last action", () => {
        const { result } = renderHook(() => useAnnotationState());

        act(() => {
            result.current.addAnnotation(makeFreehand("a1"));
        });
        act(() => {
            result.current.addAnnotation(makeFreehand("a2"));
        });
        act(() => {
            result.current.undo();
        });

        expect(result.current.annotations).toHaveLength(1);
        expect(result.current.annotations[0].id).toBe("a1");
    });

    it("clears all annotations", () => {
        const { result } = renderHook(() => useAnnotationState());

        act(() => {
            result.current.addAnnotation(makeFreehand("a1"));
        });
        act(() => {
            result.current.clear();
        });

        expect(result.current.annotations).toEqual([]);
    });

    it("initializes from external data via init", () => {
        const { result } = renderHook(() => useAnnotationState());

        act(() => {
            result.current.addAnnotation(makeFreehand("a1"));
        });
        act(() => {
            result.current.init([makeFreehand("b1"), makeFreehand("b2")]);
        });

        expect(result.current.annotations).toHaveLength(2);
        expect(result.current.annotations[0].id).toBe("b1");
    });
});
