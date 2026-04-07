import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { TimestampAnnotation, type TimestampAnnotationProps } from "./TimestampAnnotation"

describe("TimestampAnnotation", () => {
  const defaultProps: TimestampAnnotationProps = {
    timestamp: "01:23",
    tag: "Feedback",
    comment: "This section could be improved.",
    onNavigate: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  }

  it("renders correctly with given props", () => {
    render(<TimestampAnnotation {...defaultProps} />)
    
    expect(screen.getByText("01:23")).toBeInTheDocument()
    expect(screen.getByText("Feedback")).toBeInTheDocument()
    expect(screen.getByText("This section could be improved.")).toBeInTheDocument()
  })

  it("calls onNavigate with timestamp when Play button is clicked", () => {
    render(<TimestampAnnotation {...defaultProps} />)
    const playButton = screen.getByLabelText("Navigate to timestamp")
    fireEvent.click(playButton)
    expect(defaultProps.onNavigate).toHaveBeenCalledWith("01:23")
  })

  it("calls onEdit when Edit button is clicked", () => {
    render(<TimestampAnnotation {...defaultProps} />)
    const editButton = screen.getByLabelText("Edit comment")
    fireEvent.click(editButton)
    expect(defaultProps.onEdit).toHaveBeenCalled()
  })

  it("calls onDelete when Delete button is clicked", () => {
    render(<TimestampAnnotation {...defaultProps} />)
    const deleteButton = screen.getByLabelText("Delete comment")
    fireEvent.click(deleteButton)
    expect(defaultProps.onDelete).toHaveBeenCalled()
  })
})
