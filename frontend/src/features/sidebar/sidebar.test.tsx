import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, beforeAll, vi } from "vitest"
import { AnnotationSidebar } from "./sidebar"
import "@testing-library/jest-dom"

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe("AnnotationSidebar", () => {
  it("renders the sidebar with default clips tab active", () => {
    // Render the Sidebar with its default setup which includes DUMMY_CLIPS
    render(<AnnotationSidebar />)

    // Verify all tabs exist
    expect(screen.getByRole("tab", { name: /clips/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /notes/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /draw/i })).toBeInTheDocument()

    // Verify dummy clip placeholders are visible
    expect(screen.getByText("Clip Card Placeholder - clip-1")).toBeInTheDocument()
    expect(screen.getByText("Clip Card Placeholder - clip-2")).toBeInTheDocument()
  })

  it("switches tabs and displays corresponding content", () => {
    render(<AnnotationSidebar />)

    // The 'clips' tab is active by default. Let's switch to 'notes'
    const notesTab = screen.getByRole("tab", { name: /notes/i })
    fireEvent.click(notesTab)

    // Verify notes dummy placeholder is displayed
    expect(screen.getByText("Note Card Placeholder - note-1")).toBeInTheDocument()

    // Switch to 'draw'
    const drawTab = screen.getByRole("tab", { name: /draw/i })
    fireEvent.click(drawTab)

    // Verify draw dummy placeholder is displayed
    expect(screen.getByText("Draw Card Placeholder - draw-1")).toBeInTheDocument()
  })

  it("renders empty states when no data is provided", () => {
    render(<AnnotationSidebar clips={[]} notes={[]} drawings={[]} />)

    // Verify empty state for clips
    expect(screen.getByText("No clips available.")).toBeInTheDocument()

    // Switch to notes and verify empty state
    fireEvent.click(screen.getByRole("tab", { name: /notes/i }))
    expect(screen.getByText("No notes available.")).toBeInTheDocument()

    // Switch to draw and verify empty state
    fireEvent.click(screen.getByRole("tab", { name: /draw/i }))
    expect(screen.getByText("No drawings available.")).toBeInTheDocument()
  })
})
