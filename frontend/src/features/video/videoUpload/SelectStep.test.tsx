import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SelectStep } from "./SelectStep";

describe("SelectStep", () => {
  it("shows a spinner and 'Preparing video' during processing", () => {
    render(
      <SelectStep
        onFileSelected={vi.fn()}
        upload={{ status: "processing", fileName: "clip.mov", progress: 0, eta: 0 }}
      />,
    );
    expect(screen.getAllByText(/Preparing video/i).length).toBeGreaterThan(0);
    expect(screen.getByText("clip.mov")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument(); // Spinner
    // No pause button and no determinate progress during processing.
    expect(screen.queryByText(/Upload Later/i)).not.toBeInTheDocument();
  });

  it("shows the progress bar while uploading", () => {
    render(
      <SelectStep
        onFileSelected={vi.fn()}
        upload={{ status: "uploading", fileName: "clip.mp4", progress: 42, eta: 0 }}
        onPause={vi.fn()}
      />,
    );
    expect(screen.getByText("clip.mp4")).toBeInTheDocument();
    expect(screen.getByText(/Upload Later/i)).toBeInTheDocument();
  });
});
