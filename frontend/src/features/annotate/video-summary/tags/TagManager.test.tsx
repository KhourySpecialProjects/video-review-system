import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TagManager } from "./TagManager";
import type { UseTagManagerReturn } from "./tag.types";

/**
 * Creates a mock UseTagManagerReturn with sensible defaults.
 * Individual fields can be overridden via the partial parameter.
 *
 * @param overrides - Partial overrides for the manager return
 * @returns A fully-formed mock UseTagManagerReturn
 */
function createMockManager(
  overrides: Partial<UseTagManagerReturn> = {},
): UseTagManagerReturn {
  return {
    inputValue: "",
    setInputValue: vi.fn(),
    editingTag: null,
    editValue: "",
    setEditValue: vi.fn(),
    handleInputKeyDown: vi.fn(),
    startEditing: vi.fn(),
    commitEdit: vi.fn(),
    cancelEdit: vi.fn(),
    handleEditKeyDown: vi.fn(),
    ...overrides,
  };
}

const defaultProps = {
  tags: [] as string[],
  onRemoveTag: vi.fn(),
  manager: createMockManager(),
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
        <TagManager
          {...defaultProps}
          tags={["Important", "Follow-up", "Urgent"]}
        />,
      );
      expect(screen.getByText("Important")).toBeInTheDocument();
      expect(screen.getByText("Follow-up")).toBeInTheDocument();
      expect(screen.getByText("Urgent")).toBeInTheDocument();
    });

    it("does not show the empty state message", () => {
      render(<TagManager {...defaultProps} tags={["Tag1"]} />);
      expect(screen.queryByText("No tags yet")).not.toBeInTheDocument();
    });

    it("shows the tag count badge", () => {
      render(
        <TagManager
          {...defaultProps}
          tags={["A", "B", "C"]}
        />,
      );
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  describe("adding tags", () => {
    it("delegates keydown to manager.handleInputKeyDown", () => {
      const handleInputKeyDown = vi.fn();
      const manager = createMockManager({ handleInputKeyDown });
      render(<TagManager {...defaultProps} manager={manager} />);

      const input = screen.getByLabelText("Add new tag");
      fireEvent.keyDown(input, { key: "Enter" });

      expect(handleInputKeyDown).toHaveBeenCalled();
    });

    it("delegates input changes to manager.setInputValue", () => {
      const setInputValue = vi.fn();
      const manager = createMockManager({ setInputValue });
      render(<TagManager {...defaultProps} manager={manager} />);

      const input = screen.getByLabelText("Add new tag");
      fireEvent.change(input, { target: { value: "New Tag" } });

      expect(setInputValue).toHaveBeenCalledWith("New Tag");
    });
  });

  describe("removing tags", () => {
    it("calls onRemoveTag when the remove button is clicked", () => {
      const onRemoveTag = vi.fn();
      render(
        <TagManager
          {...defaultProps}
          tags={["RemoveMe"]}
          onRemoveTag={onRemoveTag}
        />,
      );

      fireEvent.click(screen.getByLabelText("Remove tag RemoveMe"));
      expect(onRemoveTag).toHaveBeenCalledWith("RemoveMe");
    });
  });

  describe("editing tags", () => {
    it("calls manager.startEditing when the edit button is clicked", () => {
      const startEditing = vi.fn();
      const manager = createMockManager({ startEditing });
      render(
        <TagManager {...defaultProps} tags={["EditMe"]} manager={manager} />,
      );

      fireEvent.click(screen.getByLabelText("Edit tag EditMe"));
      expect(startEditing).toHaveBeenCalledWith("EditMe");
    });

    it("renders the edit input when editingTag matches", () => {
      const manager = createMockManager({
        editingTag: "EditMe",
        editValue: "EditMe",
      });
      render(
        <TagManager {...defaultProps} tags={["EditMe"]} manager={manager} />,
      );

      expect(screen.getByDisplayValue("EditMe")).toBeInTheDocument();
    });

    it("calls manager.commitEdit when the confirm button is clicked", () => {
      const commitEdit = vi.fn();
      const manager = createMockManager({
        editingTag: "Original",
        editValue: "Updated",
        commitEdit,
      });
      render(
        <TagManager
          {...defaultProps}
          tags={["Original"]}
          manager={manager}
        />,
      );

      fireEvent.click(screen.getByLabelText("Confirm edit"));
      expect(commitEdit).toHaveBeenCalled();
    });

    it("delegates edit keydown to manager.handleEditKeyDown", () => {
      const handleEditKeyDown = vi.fn();
      const manager = createMockManager({
        editingTag: "Tag",
        editValue: "Tag",
        handleEditKeyDown,
      });
      render(
        <TagManager {...defaultProps} tags={["Tag"]} manager={manager} />,
      );

      const editInput = screen.getByDisplayValue("Tag");
      fireEvent.keyDown(editInput, { key: "Enter" });

      expect(handleEditKeyDown).toHaveBeenCalled();
    });
  });

  describe("disabled state", () => {
    it("does not render edit and remove buttons when disabled", () => {
      render(<TagManager {...defaultProps} tags={["Locked"]} disabled />);

      expect(screen.getByText("Locked")).toBeInTheDocument();
      expect(
        screen.queryByLabelText("Edit tag Locked"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText("Remove tag Locked"),
      ).not.toBeInTheDocument();
    });

    it("does not render the add input when disabled", () => {
      render(<TagManager {...defaultProps} disabled />);
      expect(screen.queryByLabelText("Add new tag")).not.toBeInTheDocument();
    });
  });
});
