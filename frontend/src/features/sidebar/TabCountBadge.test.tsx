import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TabCountBadge } from "./TabCountBadge";

describe("TabCountBadge", () => {
  it("renders the count when greater than zero", () => {
    render(<TabCountBadge count={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders nothing when the count is zero", () => {
    const { container } = render(<TabCountBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});
