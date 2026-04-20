import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { createMemoryRouter, RouterProvider } from "react-router"
import { AnnotationSidebar, type AnnotationSidebarProps } from "./sidebar"
import "@testing-library/jest-dom"

/**
 * @description Renders AnnotationSidebar inside a memory data router.
 * Stubs the `/clips` and `/annotations` resource routes that the
 * sidebar's mutation fetchers submit to.
 */
const defaultIds = { videoId: "video-1", studyId: "study-1", siteId: "site-1" }

function renderSidebar(props: Partial<AnnotationSidebarProps> = {}) {
  const merged: AnnotationSidebarProps = { ...defaultIds, ...props }
  const router = createMemoryRouter([
    { path: "/", element: <AnnotationSidebar {...merged} /> },
    { path: "/clips", loader: () => ({ clips: [] }), action: () => ({ ok: true }) },
    { path: "/annotations", loader: () => ({ annotations: [] }), action: () => ({ ok: true }) },
  ])
  return render(<RouterProvider router={router} />)
}

const sampleClips = [
  { id: "clip-1", title: "First clip", startTimeS: 0, endTimeS: 5, themeColor: "#f00" },
  { id: "clip-2", title: "Second clip", startTimeS: 6, endTimeS: 12, themeColor: "#0f0" },
]

describe("AnnotationSidebar", () => {
  it("renders all three tabs", () => {
    renderSidebar()
    expect(screen.getByRole("tab", { name: /clips/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /notes/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /draw/i })).toBeInTheDocument()
  })

  it("renders provided clips on the default clips tab", () => {
    renderSidebar({ clips: sampleClips })
    expect(screen.getByText("First clip")).toBeInTheDocument()
    expect(screen.getByText("Second clip")).toBeInTheDocument()
  })

  it("renders empty states when no data is provided", () => {
    renderSidebar({ clips: [], notes: [], drawings: [] })

    expect(screen.getByText("No clips available.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: /notes/i }))
    expect(screen.getByText("No notes available.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: /draw/i }))
    expect(screen.getByText("No drawings available.")).toBeInTheDocument()
  })
})
