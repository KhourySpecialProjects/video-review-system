import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { SequenceTabBar } from "./SequenceTabBar";
import type { Sequence } from "@shared/sequence";

const baseProps = {
  activeSequenceId: null,
  onSelect: vi.fn(),
  isPlayingSequence: false,
  onPlaySequence: vi.fn(),
  onStopSequence: vi.fn(),
  videoId: "video-1",
  studyId: "study-1",
  siteId: "site-1",
};

const mockSequences: Sequence[] = [
  {
    id: "seq-1",
    videoId: "video-1",
    studyId: "study-1",
    siteId: "site-1",
    title: "Highlight Reel",
    createdByUserId: "user-1",
    createdAt: "2026-04-01T00:00:00Z",
    items: [],
  },
  {
    id: "seq-2",
    videoId: "video-1",
    studyId: "study-1",
    siteId: "site-1",
    title: "Key Moments",
    createdByUserId: "user-1",
    createdAt: "2026-04-02T00:00:00Z",
    items: [],
  },
];

/**
 * @description Wraps the component in a router context for useFetcher.
 */
function renderWithRouter(ui: React.ReactElement) {
  const router = createMemoryRouter(
    [
      { path: "/", element: ui },
      { path: "/sequences", action: () => ({ ok: true }) },
    ],
    { initialEntries: ["/"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("SequenceTabBar", () => {
  it("renders Full Video tab as default active tab", () => {
    renderWithRouter(
      <SequenceTabBar sequences={[]} {...baseProps} />,
    );

    const tab = screen.getByText("Full Video");
    expect(tab).toBeInTheDocument();
    expect(tab.className).toContain("bg-primary");
  });

  it("renders sequence tabs from data", () => {
    renderWithRouter(
      <SequenceTabBar sequences={mockSequences} {...baseProps} />,
    );

    expect(screen.getByText("Highlight Reel")).toBeInTheDocument();
    expect(screen.getByText("Key Moments")).toBeInTheDocument();
  });

  it("calls onSelect with sequence ID when a tab is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    renderWithRouter(
      <SequenceTabBar
        sequences={mockSequences}
        {...baseProps}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByText("Highlight Reel"));
    expect(onSelect).toHaveBeenCalledWith("seq-1");
  });

  it("calls onSelect with null when Full Video tab is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    renderWithRouter(
      <SequenceTabBar
        sequences={mockSequences}
        {...baseProps}
        activeSequenceId="seq-1"
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByText("Full Video"));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("shows active styling on the selected sequence tab", () => {
    renderWithRouter(
      <SequenceTabBar
        sequences={mockSequences}
        {...baseProps}
        activeSequenceId="seq-2"
      />,
    );

    const activeTab = screen.getByText("Key Moments");
    const inactiveTab = screen.getByText("Full Video");

    expect(activeTab.className).toContain("bg-primary");
    expect(inactiveTab.className).not.toContain("bg-primary text-primary-foreground");
  });

  it("shows + button to create new sequence when not disabled", () => {
    renderWithRouter(
      <SequenceTabBar sequences={[]} {...baseProps} />,
    );

    expect(screen.getByLabelText("Create new sequence")).toBeInTheDocument();
  });

  it("hides + button when disabled", () => {
    renderWithRouter(
      <SequenceTabBar sequences={[]} {...baseProps} disabled />,
    );

    expect(screen.queryByLabelText("Create new sequence")).not.toBeInTheDocument();
  });

  it("shows inline input when + button is clicked", async () => {
    const user = userEvent.setup();

    renderWithRouter(
      <SequenceTabBar sequences={[]} {...baseProps} />,
    );

    await user.click(screen.getByLabelText("Create new sequence"));
    expect(screen.getByPlaceholderText("Sequence name…")).toBeInTheDocument();
  });

  it("shows play button when a sequence is active", () => {
    renderWithRouter(
      <SequenceTabBar
        sequences={mockSequences}
        {...baseProps}
        activeSequenceId="seq-1"
      />,
    );

    expect(screen.getByLabelText("Play sequence")).toBeInTheDocument();
  });

  it("does not show play button in full video mode", () => {
    renderWithRouter(
      <SequenceTabBar sequences={mockSequences} {...baseProps} />,
    );

    expect(screen.queryByLabelText("Play sequence")).not.toBeInTheDocument();
  });
});
