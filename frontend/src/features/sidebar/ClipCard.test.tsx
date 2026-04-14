import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipCard } from "./ClipCard";

/**
 * Tests for the ClipCard component.
 *
 * Covers rendering of clip metadata, action button callbacks (jump, edit, delete),
 * and the two-step delete confirmation flow.
 */
describe("ClipCard", () => {
  let onJumpStart: ReturnType<typeof vi.fn>;
  let onEdit: ReturnType<typeof vi.fn>;
  let onDelete: ReturnType<typeof vi.fn>;

  /** Reset all mocks before each test to ensure isolation. */
  beforeEach(() => {
    onJumpStart = vi.fn();
    onEdit = vi.fn();
    onDelete = vi.fn();
  });

  /**
   * Returns a default set of props for rendering a ClipCard.
   * startMs=80000 (1:20), endMs=125000 (2:05), duration=45000 (0:45).
   */
  const defaultProps = () => ({
    id: "test-clip-id",
    title: "Seizure",
    startMs: 80000,  // 1:20
    endMs: 125000,   // 2:05
    onJumpStart: onJumpStart as any,
    onEdit: onEdit as any,
    onDelete: onDelete as any,
  });

  /** Verifies the card displays the clip title, start time, end time, and duration. */
  it("renders the clip card with correct title and timing information", () => {
    render(<ClipCard {...defaultProps()} />);

    expect(screen.getByText("Seizure")).toBeInTheDocument();
    expect(screen.getByText("1:20")).toBeInTheDocument();
    expect(screen.getByText("2:05")).toBeInTheDocument();
    expect(screen.getByText("0:45")).toBeInTheDocument();
  });

  /** Verifies that clicking "Jump to start" invokes the onJumpStart callback. */
  it("calls onJumpStart when the jump to start button is clicked", async () => {
    const user = userEvent.setup();
    render(<ClipCard {...defaultProps()} />);

    await user.click(screen.getByRole("button", { name: "Jump to start" }));

    expect(onJumpStart).toHaveBeenCalledOnce();
  });

  /** Verifies that clicking "Edit clip" invokes the onEdit callback. */
  it("calls onEdit when the edit button is clicked", async () => {
    const user = userEvent.setup();
    render(<ClipCard {...defaultProps()} />);

    await user.click(screen.getByRole("button", { name: "Edit clip" }));

    expect(onEdit).toHaveBeenCalledOnce();
  });

  /**
   * Tests for the two-step delete confirmation flow.
   * Clicking "Delete clip" first shows confirm/cancel buttons instead of immediately deleting.
   */
  describe("delete confirmation", () => {
    /** Verifies that the confirm and cancel buttons appear after clicking delete, replacing the delete button. */
    it("shows confirm and cancel buttons after clicking delete", async () => {
      const user = userEvent.setup();
      render(<ClipCard {...defaultProps()} />);

      await user.click(screen.getByRole("button", { name: "Delete clip" }));

      expect(screen.getByRole("button", { name: "Confirm delete" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel delete" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Delete clip" })).not.toBeInTheDocument();
    });

    /** Verifies that confirming the delete dialog invokes the onDelete callback. */
    it("calls onDelete when the confirmation is accepted", async () => {
      const user = userEvent.setup();
      render(<ClipCard {...defaultProps()} />);

      await user.click(screen.getByRole("button", { name: "Delete clip" }));
      await user.click(screen.getByRole("button", { name: "Confirm delete" }));

      expect(onDelete).toHaveBeenCalledOnce();
    });

    /** Verifies that cancelling the delete dialog does not invoke onDelete. */
    it("does not call onDelete when cancelling", async () => {
      const user = userEvent.setup();
      render(<ClipCard {...defaultProps()} />);

      await user.click(screen.getByRole("button", { name: "Delete clip" }));
      await user.click(screen.getByRole("button", { name: "Cancel delete" }));

      expect(onDelete).not.toHaveBeenCalled();
    });

    /** Verifies that cancelling delete restores the original delete button and hides the confirm button. */
    it("returns to normal state after cancelling delete", async () => {
      const user = userEvent.setup();
      render(<ClipCard {...defaultProps()} />);

      await user.click(screen.getByRole("button", { name: "Delete clip" }));
      await user.click(screen.getByRole("button", { name: "Cancel delete" }));

      expect(screen.getByRole("button", { name: "Delete clip" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Confirm delete" })).not.toBeInTheDocument();
    });
  });
});
