import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DrawingCard } from "./DrawingCard";

describe("DrawingCard", () => {
    const mockOnJumpStart = vi.fn();
    const mockOnDelete = vi.fn();
    const mockOnEditDuration = vi.fn();

    const defaultProps = {
        id: "draw-1",
        type: "freehand" as const,
        color: "#ff0000",
        timestamp: 125,
        duration: 5,
        onJumpStart: mockOnJumpStart,
        onDelete: mockOnDelete,
        onEditDuration: mockOnEditDuration,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Verifies that the component renders the correct visual representation
     * including the tool label, the current duration text, and the timestamp.
     */
    it("renders the drawing card correctly", () => {
        render(<DrawingCard {...defaultProps} />);
        
        expect(screen.getByText("Freehand Stroke")).toBeInTheDocument();
        expect(screen.getByText("Duration:")).toBeInTheDocument();
        expect(screen.getByText("5s")).toBeInTheDocument();
    });

    /**
     * Ensures that clicking the Play button correctly triggers the
     * onJumpStart callback with the drawing's associated timestamp.
     */
    it("calls onJumpStart with correct timestamp when play button is clicked", () => {
        render(<DrawingCard {...defaultProps} />);
        
        const playBtn = screen.getByRole("button", { name: "Play" });
        fireEvent.click(playBtn);
        
        expect(mockOnJumpStart).toHaveBeenCalledWith(125);
    });

    /**
     * Tests the integration with SidebarCard's internal delete state,
     * ensuring that the initial delete click shows the confirmation
     * buttons, and the final confirm click successfully triggers onDelete.
     */
    it("triggers delete confirmation flow from SidebarCard when delete is clicked", () => {
        render(<DrawingCard {...defaultProps} />);
        
        const deleteBtn = screen.getByRole("button", { name: "Delete" });
        fireEvent.click(deleteBtn);
        
        const confirmBtn = screen.getByRole("button", { name: "Confirm delete" });
        expect(confirmBtn).toBeInTheDocument();
        
        fireEvent.click(confirmBtn);
        expect(mockOnDelete).toHaveBeenCalledWith("draw-1");
    });

    /**
     * Verifies the full duration editing flow: entering edit mode,
     * modifying the input field, saving, calling the onEditDuration
     * callback, and safely returning to display mode.
     */
    it("enters edit mode and updates duration correctly", () => {
        render(<DrawingCard {...defaultProps} />);
        
        const editBtn = screen.getByRole("button", { name: "Edit" });
        fireEvent.click(editBtn);
        
        const input = screen.getByRole("spinbutton", { name: "Edit duration in seconds" });
        expect(input).toBeInTheDocument();
        expect(input).toHaveValue(5);
        
        fireEvent.change(input, { target: { value: "10" } });
        expect(input).toHaveValue(10);
        
        const saveBtn = screen.getByRole("button", { name: "Save" });
        fireEvent.click(saveBtn);
        
        expect(mockOnEditDuration).toHaveBeenCalledWith("draw-1", 10);
        
        // Returns to display mode properly
        expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    });

    /**
     * Ensures that when the user edits the duration but clicks Cancel,
     * no changes are saved and the callback is completely bypassed.
     */
    it("cancels edit mode without saving", () => {
        render(<DrawingCard {...defaultProps} />);

        fireEvent.click(screen.getByRole("button", { name: "Edit" }));

        const input = screen.getByRole("spinbutton");
        fireEvent.change(input, { target: { value: "10" } });

        const cancelBtn = screen.getByRole("button", { name: "Cancel edit" });
        fireEvent.click(cancelBtn);

        expect(mockOnEditDuration).not.toHaveBeenCalled();
        expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    });

    /**
     * Verifies that the seconds timestamp is correctly mapped through
     * the formatDuration utility natively before rendering onscreen.
     */
    it("displays the formatted timestamp", () => {
        render(<DrawingCard {...defaultProps} />);
        expect(screen.getByText("2:05")).toBeInTheDocument();
    });

    /**
     * Tests boundary conditions for duration editing, confirming that the state 
     * falls back to the original value if an invalid input (like 0) is submitted.
     */
    it("does not save and reverts when duration is invalid", () => {
        render(<DrawingCard {...defaultProps} />);

        fireEvent.click(screen.getByRole("button", { name: "Edit" }));

        const input = screen.getByRole("spinbutton");
        fireEvent.change(input, { target: { value: "0" } });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        expect(mockOnEditDuration).not.toHaveBeenCalled();
        expect(screen.getByText("5s")).toBeInTheDocument();
    });

    /**
     * Confirms that passing the "circle" type applies the correct text label.
     */
    it("renders the correct label for circle type", () => {
        render(<DrawingCard {...defaultProps} type="circle" />);
        expect(screen.getByText("Circle")).toBeInTheDocument();
    });

    /**
     * Confirms that passing the "rectangle" type applies the correct text label.
     */
    it("renders the correct label for rectangle type", () => {
        render(<DrawingCard {...defaultProps} type="rectangle" />);
        expect(screen.getByText("Rectangle")).toBeInTheDocument();
    });
});
