import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClipCard } from "./ClipCard";

describe("ClipCard", () => {
  let onJumpStart: ReturnType<typeof vi.fn>;
  let onEdit: ReturnType<typeof vi.fn>;
  let onDelete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onJumpStart = vi.fn();
    onEdit = vi.fn();
    onDelete = vi.fn();
  });

  const defaultProps = () => ({
    id: "test-clip-id",
    title: "Seizure",
    startMs: 80000,  // 1:20
    endMs: 125000,   // 2:05
    onJumpStart: onJumpStart as any,
    onEdit: onEdit as any,
    onDelete: onDelete as any,
  });

  it("renders the clip card with correct title and timing information", () => {
    render(<ClipCard {...defaultProps()} />);

    expect(screen.getByText("Seizure")).toBeInTheDocument();
    expect(screen.getByText("1:20")).toBeInTheDocument();
    expect(screen.getByText("2:05")).toBeInTheDocument();
    expect(screen.getByText("0:45")).toBeInTheDocument();
  });

  it("calls onJumpStart when the jump to start button is clicked", async () => {
    const user = userEvent.setup();
    render(<ClipCard {...defaultProps()} />);

    await user.click(screen.getByRole("button", { name: "Jump to start" }));

    expect(onJumpStart).toHaveBeenCalledOnce();
  });

  it("calls onEdit when the edit button is clicked", async () => {
    const user = userEvent.setup();
    render(<ClipCard {...defaultProps()} />);

    await user.click(screen.getByRole("button", { name: "Edit clip" }));

    expect(onEdit).toHaveBeenCalledOnce();
  });

  describe("delete confirmation", () => {
    it("shows confirm and cancel buttons after clicking delete", async () => {
      const user = userEvent.setup();
      render(<ClipCard {...defaultProps()} />);

      await user.click(screen.getByRole("button", { name: "Delete clip" }));

      expect(screen.getByRole("button", { name: "Confirm delete" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel delete" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Delete clip" })).not.toBeInTheDocument();
    });

    it("calls onDelete when the confirmation is accepted", async () => {
      const user = userEvent.setup();
      render(<ClipCard {...defaultProps()} />);

      await user.click(screen.getByRole("button", { name: "Delete clip" }));
      await user.click(screen.getByRole("button", { name: "Confirm delete" }));

      expect(onDelete).toHaveBeenCalledOnce();
    });

    it("does not call onDelete when cancelling", async () => {
      const user = userEvent.setup();
      render(<ClipCard {...defaultProps()} />);

      await user.click(screen.getByRole("button", { name: "Delete clip" }));
      await user.click(screen.getByRole("button", { name: "Cancel delete" }));

      expect(onDelete).not.toHaveBeenCalled();
    });

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
