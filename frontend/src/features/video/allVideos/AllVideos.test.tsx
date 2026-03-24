import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AllVideos, AllVideosSkeleton } from "./AllVideos";
import type { Video } from "@/lib/types";

const mockVideos: Video[] = [
    {
        id: "vid-001",
        title: "Eating Breakfast",
        description: "He ate breakfast for about 30 minutes",
        duration: 72,
        thumbnailUrl: "",
        videoUrl: "https://example.com/video1.mp4",
        uploadedAt: "2026-02-10T08:00:00Z",
        filmedAt: "2026-02-10T03:15:00Z",
        filmedBy: "Caregiver A",
        status: "received",
    },
    {
        id: "vid-002",
        title: "Morning Walk",
        description: "Went for a walk around the neighborhood",
        duration: 145,
        thumbnailUrl: "",
        videoUrl: "https://example.com/video2.mp4",
        uploadedAt: "2026-02-09T10:30:00Z",
        filmedAt: "2026-02-09T07:45:00Z",
        filmedBy: "Caregiver B",
        status: "pending",
    },
    {
        id: "vid-003",
        title: "Afternoon Nap",
        description: "Rested in the living room for about 45 minutes",
        duration: 210,
        thumbnailUrl: "",
        videoUrl: "https://example.com/video3.mp4",
        uploadedAt: "2026-02-08T15:00:00Z",
        filmedAt: "2026-02-08T13:00:00Z",
        filmedBy: "Caregiver A",
        status: "received",
    },
];

describe("AllVideos", () => {
    it("renders all video titles in accordion", () => {
        render(
            <MemoryRouter>
                <AllVideos videos={mockVideos} />
            </MemoryRouter>
        );
        expect(screen.getByText("Eating Breakfast")).toBeInTheDocument();
        expect(screen.getByText("Morning Walk")).toBeInTheDocument();
        expect(screen.getByText("Afternoon Nap")).toBeInTheDocument();
    });

    it("shows correct video count", () => {
        render(
            <MemoryRouter>
                <AllVideos videos={mockVideos} />
            </MemoryRouter>
        );
        expect(screen.getByText("3 videos found")).toBeInTheDocument();
    });

    it("filters by search query on title", () => {
        render(
            <MemoryRouter>
                <AllVideos videos={mockVideos} />
            </MemoryRouter>
        );
        const searchInput = screen.getByPlaceholderText(
            "Search by title or description..."
        );
        fireEvent.change(searchInput, { target: { value: "Breakfast" } });
        expect(screen.getByText("1 video found")).toBeInTheDocument();
        expect(screen.getByText("Eating Breakfast")).toBeInTheDocument();
    });

    it("filters by search query on description", () => {
        render(
            <MemoryRouter>
                <AllVideos videos={mockVideos} />
            </MemoryRouter>
        );
        const searchInput = screen.getByPlaceholderText(
            "Search by title or description..."
        );
        fireEvent.change(searchInput, { target: { value: "living room" } });
        expect(screen.getByText("1 video found")).toBeInTheDocument();
        expect(screen.getByText("Afternoon Nap")).toBeInTheDocument();
    });

    it("shows empty state when no videos match search", () => {
        render(
            <MemoryRouter>
                <AllVideos videos={mockVideos} />
            </MemoryRouter>
        );
        const searchInput = screen.getByPlaceholderText(
            "Search by title or description..."
        );
        fireEvent.change(searchInput, { target: { value: "nonexistent" } });
        expect(screen.getByText("No videos found")).toBeInTheDocument();
    });

    it("renders the filters button", () => {
        render(
            <MemoryRouter>
                <AllVideos videos={mockVideos} />
            </MemoryRouter>
        );
        expect(screen.getByText("Filters")).toBeInTheDocument();
    });
});

describe("AllVideosSkeleton", () => {
    it("renders without errors", () => {
        const { container } = render(<AllVideosSkeleton />);
        expect(container.firstChild).toBeTruthy();
    });
});
