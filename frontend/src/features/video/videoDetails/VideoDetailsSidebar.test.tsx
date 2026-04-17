import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import {
    VideoDetailsSidebar,
    VideoDetailsSidebarSkeleton,
} from "./VideoDetailsSidebar";
import type { Video } from "@/lib/types";

const mockVideo: Video = {
    id: "vid-001",
    title: "Test Video",
    description: "A test video description",
    imgUrl: "/placeholder-thumbnail.jpg",
    durationSeconds: 72,
    fileSize: 1024 * 1024,
    createdAt: "2026-02-10T08:00:00Z",
    takenAt: "2026-02-10T03:15:00Z",
    uploadedBy: "Caregiver A",
    status: "UPLOADED",
};

/**
 * @description Renders VideoDetailsSidebar inside a data router so
 * hooks like useActionData work correctly in tests.
 *
 * @param props - Props forwarded to VideoDetailsSidebar
 */
function renderInRouter(props: { video: Video; isSaving?: boolean }) {
    const router = createMemoryRouter(
        [{ path: "/", element: <VideoDetailsSidebar {...props} /> }],
        { initialEntries: ["/"] },
    );
    return render(<RouterProvider router={router} />);
}

describe("VideoDetailsSidebar", () => {
    it("renders video title", async () => {
        renderInRouter({ video: mockVideo });
        expect(await screen.findByText("Test Video")).toBeInTheDocument();
    });

    it("renders video description", async () => {
        renderInRouter({ video: mockVideo });
        expect(await screen.findByText("A test video description")).toBeInTheDocument();
    });

    it("renders uploader name", async () => {
        renderInRouter({ video: mockVideo });
        expect(await screen.findByText("Caregiver A")).toBeInTheDocument();
    });

    it("shows uploaded status", async () => {
        renderInRouter({ video: mockVideo });
        expect(await screen.findByText("Uploaded")).toBeInTheDocument();
    });

    it("enters edit mode when pencil button is clicked", async () => {
        renderInRouter({ video: mockVideo });
        const editButton = await screen.findByLabelText("Edit title and description");
        fireEvent.click(editButton);
        expect(screen.getByLabelText("Video title")).toBeInTheDocument();
        expect(screen.getByLabelText("Video description")).toBeInTheDocument();
    });

    it("cancels editing and restores original values", async () => {
        renderInRouter({ video: mockVideo });

        fireEvent.click(await screen.findByLabelText("Edit title and description"));

        const titleInput = screen.getByLabelText("Video title");
        fireEvent.change(titleInput, { target: { value: "Changed Title" } });

        fireEvent.click(screen.getByText("Cancel"));

        expect(screen.getByText("Test Video")).toBeInTheDocument();
    });
});

describe("VideoDetailsSidebarSkeleton", () => {
    it("renders without errors", () => {
        const { container } = render(<VideoDetailsSidebarSkeleton />);
        expect(container.firstChild).toBeTruthy();
    });
});
