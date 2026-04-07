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

  it("shows a textarea when Edit button is clicked", () => {
    render(<TimestampAnnotation {...defaultProps} />)
    fireEvent.click(screen.getByLabelText("Edit comment"))
    expect(screen.getByLabelText("Edit comment text")).toBeInTheDocument()
  })

  it("calls onEdit with updated text when Save is clicked", () => {
    render(<TimestampAnnotation {...defaultProps} />)
    fireEvent.click(screen.getByLabelText("Edit comment"))
    const textarea = screen.getByLabelText("Edit comment text")
    fireEvent.change(textarea, { target: { value: "Updated comment." } })
    fireEvent.click(screen.getByLabelText("Save comment"))
    expect(defaultProps.onEdit).toHaveBeenCalledWith("Updated comment.")
  })

  it("discards changes and hides textarea when Cancel is clicked", () => {
    render(<TimestampAnnotation {...defaultProps} />)
    fireEvent.click(screen.getByLabelText("Edit comment"))
    const textarea = screen.getByLabelText("Edit comment text")
    fireEvent.change(textarea, { target: { value: "Discarded change." } })
    fireEvent.click(screen.getByLabelText("Cancel edit"))
    expect(screen.queryByLabelText("Edit comment text")).not.toBeInTheDocument()
    expect(screen.getByText("This section could be improved.")).toBeInTheDocument()
  })

  it("calls onDelete after confirming deletion", () => {
    render(<TimestampAnnotation {...defaultProps} />)
    fireEvent.click(screen.getByLabelText("Delete comment"))
    fireEvent.click(screen.getByLabelText("Confirm delete"))
    expect(defaultProps.onDelete).toHaveBeenCalled()
  })
})
