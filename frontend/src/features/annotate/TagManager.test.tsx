import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TagManager } from "./TagManager";

const defaultProps = {
  tags: [] as string[],
  onAddTag: vi.fn(),
  onRemoveTag: vi.fn(),
  onEditTag: vi.fn(),
};

describe("TagManager", () => {
  describe("empty state", () => {
    it("renders the section heading", () => {
      render(<TagManager {...defaultProps} />);
      expect(screen.getByText("Tags")).toBeInTheDocument();
    });

    it("shows empty state message when no tags exist", () => {
      render(<TagManager {...defaultProps} />);
      expect(screen.getByText("No tags yet")).toBeInTheDocument();
    });

    it("renders the tag input", () => {
      render(<TagManager {...defaultProps} />);
      expect(screen.getByLabelText("Add new tag")).toBeInTheDocument();
    });
  });

  describe("with tags", () => {
    it("renders all provided tags as badges", () => {
      render(
        <TagManager {...defaultProps} tags={["Important", "Follow-up", "Urgent"]} />
      );
      expect(screen.getByText("Important")).toBeInTheDocument();
      expect(screen.getByText("Follow-up")).toBeInTheDocument();
      expect(screen.getByText("Urgent")).toBeInTheDocument();
    });

    it("does not show the empty state message", () => {
      render(<TagManager {...defaultProps} tags={["Tag1"]} />);
      expect(screen.queryByText("No tags yet")).not.toBeInTheDocument();
    });
  });

  describe("adding tags", () => {
    it("calls onAddTag when Enter is pressed with input value", () => {
      const onAddTag = vi.fn();
      render(<TagManager {...defaultProps} onAddTag={onAddTag} />);

      const input = screen.getByLabelText("Add new tag");
      fireEvent.change(input, { target: { value: "New Tag" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onAddTag).toHaveBeenCalledWith("New Tag");
    });

    it("clears the input after adding a tag", () => {
      render(<TagManager {...defaultProps} />);

      const input = screen.getByLabelText("Add new tag");
      fireEvent.change(input, { target: { value: "New Tag" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(input).toHaveValue("");
    });

    it("does not call onAddTag for non-Enter keys", () => {
      const onAddTag = vi.fn();
      render(<TagManager {...defaultProps} onAddTag={onAddTag} />);

      const input = screen.getByLabelText("Add new tag");
      fireEvent.change(input, { target: { value: "Test" } });
      fireEvent.keyDown(input, { key: "Tab" });

      expect(onAddTag).not.toHaveBeenCalled();
    });
  });

  describe("removing tags", () => {
    it("calls onRemoveTag when the remove button is clicked", () => {
      const onRemoveTag = vi.fn();
      render(
        <TagManager {...defaultProps} tags={["RemoveMe"]} onRemoveTag={onRemoveTag} />
      );

      fireEvent.click(screen.getByLabelText("Remove tag RemoveMe"));
      expect(onRemoveTag).toHaveBeenCalledWith("RemoveMe");
    });
  });

  describe("editing tags", () => {
    it("enters edit mode when the edit button is clicked", () => {
      render(<TagManager {...defaultProps} tags={["EditMe"]} />);

      fireEvent.click(screen.getByLabelText("Edit tag EditMe"));
      expect(screen.getByDisplayValue("EditMe")).toBeInTheDocument();
    });

    it("calls onEditTag when Enter is pressed in edit mode", () => {
      const onEditTag = vi.fn();
      render(
        <TagManager {...defaultProps} tags={["Original"]} onEditTag={onEditTag} />
      );

      fireEvent.click(screen.getByLabelText("Edit tag Original"));
      const editInput = screen.getByDisplayValue("Original");
      fireEvent.change(editInput, { target: { value: "Updated" } });
      fireEvent.keyDown(editInput, { key: "Enter" });

      expect(onEditTag).toHaveBeenCalledWith("Original", "Updated");
    });

    it("calls onEditTag when the confirm button is clicked", () => {
      const onEditTag = vi.fn();
      render(
        <TagManager {...defaultProps} tags={["Original"]} onEditTag={onEditTag} />
      );

      fireEvent.click(screen.getByLabelText("Edit tag Original"));
      const editInput = screen.getByDisplayValue("Original");
      fireEvent.change(editInput, { target: { value: "Updated" } });
      fireEvent.click(screen.getByLabelText("Confirm edit"));

      expect(onEditTag).toHaveBeenCalledWith("Original", "Updated");
    });

    it("cancels editing when Escape is pressed", () => {
      render(<TagManager {...defaultProps} tags={["KeepMe"]} />);

      fireEvent.click(screen.getByLabelText("Edit tag KeepMe"));
      const editInput = screen.getByDisplayValue("KeepMe");
      fireEvent.change(editInput, { target: { value: "Changed" } });
      fireEvent.keyDown(editInput, { key: "Escape" });

      expect(screen.getByText("KeepMe")).toBeInTheDocument();
      expect(screen.queryByDisplayValue("Changed")).not.toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("does not render edit and remove buttons when disabled", () => {
      render(<TagManager {...defaultProps} tags={["Locked"]} disabled />);

      expect(screen.getByText("Locked")).toBeInTheDocument();
      expect(screen.queryByLabelText("Edit tag Locked")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Remove tag Locked")).not.toBeInTheDocument();
    });

    it("does not render the add input when disabled", () => {
      render(<TagManager {...defaultProps} disabled />);
      expect(screen.queryByLabelText("Add new tag")).not.toBeInTheDocument();
    });
  });
});
