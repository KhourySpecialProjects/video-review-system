import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
    VideoDetailsSidebar,
    VideoDetailsSidebarSkeleton,
} from "./VideoDetailsSidebar";
import type { Video } from "@/lib/types";

const mockVideo: Video = {
    id: "vid-001",
    title: "Test Video",
    description: "A test video description",
    duration: 72,
    thumbnailUrl: "",
    videoUrl: "https://example.com/video.mp4",
    uploadedAt: "2026-02-10T08:00:00Z",
    filmedAt: "2026-02-10T03:15:00Z",
    filmedBy: "Caregiver A",
    status: "received",
};

describe("VideoDetailsSidebar", () => {
    it("renders video title", () => {
        render(<VideoDetailsSidebar video={mockVideo} onSave={() => { }} />);
        expect(screen.getByText("Test Video")).toBeInTheDocument();
    });

    it("renders video description", () => {
        render(<VideoDetailsSidebar video={mockVideo} onSave={() => { }} />);
        expect(screen.getByText("A test video description")).toBeInTheDocument();
    });

    it("renders caregiver name", () => {
        render(<VideoDetailsSidebar video={mockVideo} onSave={() => { }} />);
        expect(screen.getByText("Caregiver A")).toBeInTheDocument();
    });

    it("shows received status", () => {
        render(<VideoDetailsSidebar video={mockVideo} onSave={() => { }} />);
        expect(screen.getByText("Received")).toBeInTheDocument();
    });

    it("enters edit mode when pencil button is clicked", () => {
        render(<VideoDetailsSidebar video={mockVideo} onSave={() => { }} />);
        const editButton = screen.getByLabelText("Edit title and description");
        fireEvent.click(editButton);
        expect(screen.getByLabelText("Video title")).toBeInTheDocument();
        expect(screen.getByLabelText("Video description")).toBeInTheDocument();
    });

    it("calls onSave with updated data", () => {
        const onSave = vi.fn();
        render(<VideoDetailsSidebar video={mockVideo} onSave={onSave} />);

        fireEvent.click(screen.getByLabelText("Edit title and description"));

        const titleInput = screen.getByLabelText("Video title");
        fireEvent.change(titleInput, { target: { value: "Updated Title" } });

        fireEvent.click(screen.getByText("Save"));
        expect(onSave).toHaveBeenCalledWith({
            title: "Updated Title",
            description: "A test video description",
        });
    });

    it("cancels editing and restores original values", () => {
        render(<VideoDetailsSidebar video={mockVideo} onSave={() => { }} />);

        fireEvent.click(screen.getByLabelText("Edit title and description"));

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
