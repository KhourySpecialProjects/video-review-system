import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GeneralNotes } from "./GeneralNotes";

describe("GeneralNotes", () => {
  it("renders the section heading", () => {
    render(<GeneralNotes value="" onChange={() => {}} />);
    expect(screen.getByText("General Notes")).toBeInTheDocument();
  });

  it("displays the current value in the textarea", () => {
    render(<GeneralNotes value="Some existing notes" onChange={() => {}} />);
    expect(screen.getByRole("textbox")).toHaveValue("Some existing notes");
  });

  it("renders with default placeholder when none is provided", () => {
    render(<GeneralNotes value="" onChange={() => {}} />);
    expect(
      screen.getByPlaceholderText("Add general notes about this video...")
    ).toBeInTheDocument();
  });

  it("renders with a custom placeholder", () => {
    render(
      <GeneralNotes value="" onChange={() => {}} placeholder="Custom placeholder" />
    );
    expect(
      screen.getByPlaceholderText("Custom placeholder")
    ).toBeInTheDocument();
  });

  it("calls onChange when the user types", () => {
    const onChange = vi.fn();
    render(<GeneralNotes value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "New note" },
    });
    expect(onChange).toHaveBeenCalledWith("New note");
  });

  it("disables the textarea when disabled prop is true", () => {
    render(<GeneralNotes value="" onChange={() => {}} disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("renders an empty textarea when value is empty", () => {
    render(<GeneralNotes value="" onChange={() => {}} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});
