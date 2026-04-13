import { useReducer, useCallback } from "react";
import type {
    Annotation,
    AnnotationAction,
    AnnotationReducerState,
    UseAnnotationStateReturn,
} from "./types";

/**
 * Maximum number of undo history entries retained by the reducer.
 *
 * Prevents unbounded memory growth during long annotation sessions.
 */
const MAX_HISTORY = 50;

/**
 * Reducer function for annotation state.
 *
 * Handles add, remove, undo, clear, and init actions while
 * maintaining an undo history stack capped at {@link MAX_HISTORY}.
 *
 * @param state - The current reducer state.
 * @param action - The action to apply.
 * @returns The next reducer state.
 */
export function annotationReducer(
    state: AnnotationReducerState,
    action: AnnotationAction,
): AnnotationReducerState {
    switch (action.type) {
        case "ADD": {
            const history = [
                ...state.history,
                state.annotations,
            ].slice(-MAX_HISTORY);
            return {
                annotations: [...state.annotations, action.annotation],
                history,
            };
        }
        case "REMOVE": {
            const history = [
                ...state.history,
                state.annotations,
            ].slice(-MAX_HISTORY);
            return {
                annotations: state.annotations.filter((a) => a.id !== action.id),
                history,
            };
        }
        case "UNDO": {
            if (state.history.length === 0) return state;
            const previous = state.history[state.history.length - 1];
            return {
                annotations: previous,
                history: state.history.slice(0, -1),
            };
        }
        case "CLEAR": {
            return {
                annotations: [],
                history: [],
            };
        }
        case "INIT": {
            return {
                annotations: action.annotations,
                history: [],
            };
        }
    }
}

/**
 * Create the initial state for the annotation reducer.
 *
 * @param initialAnnotations - Optional array of annotations to start with
 *   (e.g. loaded from a route loader / database).
 * @returns The initial reducer state.
 */
export function createInitialState(
    initialAnnotations?: Annotation[],
): AnnotationReducerState {
    return {
        annotations: initialAnnotations ?? [],
        history: [],
    };
}

/**
 * Hook that owns annotation data and exposes mutation methods.
 *
 * This is the "data layer" for annotations. The parent component
 * calls this hook and passes the returned state down to
 * `AnnotationCanvas` and `AnnotationToolbar`. The annotation list
 * is the data that will eventually be persisted as JSONB.
 *
 * @param initialAnnotations - Optional annotations to hydrate from
 *   (e.g. from a route loader).
 * @returns An {@link UseAnnotationStateReturn} object with the current
 *   annotations and methods to mutate them.
 *
 * @example
 * ```tsx
 * const annotationState = useAnnotationState();
 * // pass to children:
 * <AnnotationCanvas state={annotationState} ... />
 * <AnnotationToolbar annotations={annotationState.annotations} onUndo={annotationState.undo} />
 * ```
 */
export function useAnnotationState(
    initialAnnotations?: Annotation[],
): UseAnnotationStateReturn {
    const [state, dispatch] = useReducer(
        annotationReducer,
        initialAnnotations,
        createInitialState,
    );

    const addAnnotation = useCallback(
        (annotation: Annotation) => dispatch({ type: "ADD", annotation }),
        [],
    );

    const removeAnnotation = useCallback(
        (id: string) => dispatch({ type: "REMOVE", id }),
        [],
    );

    const undo = useCallback(() => dispatch({ type: "UNDO" }), []);

    const clear = useCallback(() => dispatch({ type: "CLEAR" }), []);

    const init = useCallback(
        (annotations: Annotation[]) => dispatch({ type: "INIT", annotations }),
        [],
    );

    return {
        annotations: state.annotations,
        addAnnotation,
        removeAnnotation,
        undo,
        clear,
        init,
    };
}
