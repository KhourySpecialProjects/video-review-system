import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { VideoCard, VideoCardSkeleton } from "./VideoCard";
import type { Video } from "@/lib/types";

const mockVideo: Video = {
    id: "vid-001",
    title: "Test Video",
    description: "A test video description for testing purposes",
    duration: 72,
    thumbnailUrl: "",
    videoUrl: "https://example.com/video.mp4",
    uploadedAt: "2026-02-10T08:00:00Z",
    filmedAt: "2026-02-10T03:15:00Z",
    filmedBy: "Caregiver A",
    status: "received",
};

describe("VideoCard", () => {
    it("renders the video title", () => {
        render(
            <MemoryRouter>
                <VideoCard video={mockVideo} />
            </MemoryRouter>
        );
        expect(screen.getByText("Test Video")).toBeInTheDocument();
    });

    it("renders the video description", () => {
        render(
            <MemoryRouter>
                <VideoCard video={mockVideo} />
            </MemoryRouter>
        );
        expect(
            screen.getByText("A test video description for testing purposes")
        ).toBeInTheDocument();
    });

    it("renders the formatted duration", () => {
        render(
            <MemoryRouter>
                <VideoCard video={mockVideo} />
            </MemoryRouter>
        );
        expect(screen.getByText("1:12")).toBeInTheDocument();
    });

    it("links to the video view page", () => {
        render(
            <MemoryRouter>
                <VideoCard video={mockVideo} />
            </MemoryRouter>
        );
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("href", "/videos/vid-001");
    });
});

describe("VideoCardSkeleton", () => {
    it("renders without errors", () => {
        const { container } = render(<VideoCardSkeleton />);
        expect(container.firstChild).toBeTruthy();
    });
});
