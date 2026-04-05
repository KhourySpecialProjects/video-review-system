import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnnotationToolbar } from "./AnnotationToolbar";
import type { AnnotationTool, DrawingSettings } from "../../types";

/**
 * Default props for toolbar rendering.
 */
function defaultProps(overrides: Partial<Parameters<typeof AnnotationToolbar>[0]> = {}) {
    return {
        tool: "freehand" as AnnotationTool,
        onToolChange: vi.fn(),
        settings: { color: "#ff0000", brushSize: 0.005 } as DrawingSettings,
        onSettingsChange: vi.fn(),
        onUndo: vi.fn(),
        onClear: vi.fn(),
        canUndo: true,
        canClear: true,
        ...overrides,
    };
}

describe("AnnotationToolbar", () => {
    it("renders all tool buttons", () => {
        render(<AnnotationToolbar {...defaultProps()} />);

        expect(screen.getByLabelText("Freehand")).toBeInTheDocument();
        expect(screen.getByLabelText("Circle")).toBeInTheDocument();
        expect(screen.getByLabelText("Rectangle")).toBeInTheDocument();
        expect(screen.getByLabelText("Pixel Eraser")).toBeInTheDocument();
        expect(screen.getByLabelText("Object Eraser")).toBeInTheDocument();
    });

    it("renders undo and clear buttons", () => {
        render(<AnnotationToolbar {...defaultProps()} />);

        expect(screen.getByLabelText("Undo last annotation")).toBeInTheDocument();
        expect(screen.getByLabelText("Clear all annotations")).toBeInTheDocument();
    });

    it("disables undo when canUndo is false", () => {
        render(<AnnotationToolbar {...defaultProps({ canUndo: false })} />);

        const undoButton = screen.getByLabelText("Undo last annotation");
        expect(undoButton).toBeDisabled();
    });

    it("disables clear when canClear is false", () => {
        render(<AnnotationToolbar {...defaultProps({ canClear: false })} />);

        const clearButton = screen.getByLabelText("Clear all annotations");
        expect(clearButton).toBeDisabled();
    });

    it("calls onUndo when undo button is clicked", () => {
        const onUndo = vi.fn();
        render(<AnnotationToolbar {...defaultProps({ onUndo })} />);

        fireEvent.click(screen.getByLabelText("Undo last annotation"));
        expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it("calls onClear when clear button is clicked", () => {
        const onClear = vi.fn();
        render(<AnnotationToolbar {...defaultProps({ onClear })} />);

        fireEvent.click(screen.getByLabelText("Clear all annotations"));
        expect(onClear).toHaveBeenCalledTimes(1);
    });

    it("renders color preset buttons", () => {
        render(<AnnotationToolbar {...defaultProps()} />);

        expect(screen.getByLabelText("Select Red color")).toBeInTheDocument();
        expect(screen.getByLabelText("Select Blue color")).toBeInTheDocument();
        expect(screen.getByLabelText("Select White color")).toBeInTheDocument();
    });

    it("calls onSettingsChange with new color when a preset is clicked", () => {
        const onSettingsChange = vi.fn();
        render(
            <AnnotationToolbar
                {...defaultProps({ onSettingsChange })}
            />,
        );

        fireEvent.click(screen.getByLabelText("Select Blue color"));
        expect(onSettingsChange).toHaveBeenCalledWith({
            color: "#3b82f6",
            brushSize: 0.005,
        });
    });

    it("renders the custom color picker input", () => {
        render(<AnnotationToolbar {...defaultProps()} />);

        expect(screen.getByLabelText("Custom color picker")).toBeInTheDocument();
    });

    it("renders the brush size slider", () => {
        render(<AnnotationToolbar {...defaultProps()} />);

        expect(screen.getByLabelText("Brush size")).toBeInTheDocument();
    });
});
