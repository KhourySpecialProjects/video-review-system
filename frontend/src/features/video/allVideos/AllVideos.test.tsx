import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { AllVideos, AllVideosSkeleton } from "./AllVideos";
import type { Video } from "@/lib/types";
import type { SearchLoaderData } from "@/lib/video.service";

const mockVideos: Video[] = [
    {
        id: "vid-001",
        title: "Eating Breakfast",
        description: "He ate breakfast for about 30 minutes",
        imgUrl: "/placeholder-thumbnail.jpg",
        durationSeconds: 72,
        fileSize: 1024 * 1024,
        createdAt: "2026-02-10T08:00:00Z",
        takenAt: "2026-02-10T03:15:00Z",
        uploadedBy: "Caregiver A",
        status: "UPLOADED",
    },
    {
        id: "vid-002",
        title: "Morning Walk",
        description: "Went for a walk around the neighborhood",
        imgUrl: "/placeholder-thumbnail.jpg",
        durationSeconds: 145,
        fileSize: 2 * 1024 * 1024,
        createdAt: "2026-02-09T10:30:00Z",
        takenAt: "2026-02-09T07:45:00Z",
        uploadedBy: "Caregiver B",
        status: "UPLOADING",
    },
    {
        id: "vid-003",
        title: "Afternoon Nap",
        description: "Rested in the living room for about 45 minutes",
        imgUrl: "/placeholder-thumbnail.jpg",
        durationSeconds: 210,
        fileSize: 3 * 1024 * 1024,
        createdAt: "2026-02-08T15:00:00Z",
        takenAt: "2026-02-08T13:00:00Z",
        uploadedBy: "Caregiver A",
        status: "UPLOADED",
    },
];

/**
 * @description Renders AllVideos inside a memory router with a loader
 * that returns the given search data.
 *
 * @param data - The SearchLoaderData to provide via the loader
 */
function renderWithRouter(data: SearchLoaderData) {
    const router = createMemoryRouter(
        [{ path: "/", element: <AllVideos />, loader: () => data }],
        { initialEntries: ["/"] },
    );
    return render(<RouterProvider router={router} />);
}

describe("AllVideos", () => {
    it("renders all video titles", async () => {
        renderWithRouter({ searchPromise: Promise.resolve({ videos: mockVideos, total: 3, limit: 50, offset: 0 }), q: "" });
        expect((await screen.findAllByText("Eating Breakfast")).length).toBeGreaterThan(0);
        expect(screen.getAllByText("Morning Walk").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Afternoon Nap").length).toBeGreaterThan(0);
    });

    it("shows correct video count", async () => {
        renderWithRouter({ searchPromise: Promise.resolve({ videos: mockVideos, total: 3, limit: 50, offset: 0 }), q: "" });
        expect(await screen.findByText("3 videos found")).toBeInTheDocument();
    });

    it("shows empty state when no videos", async () => {
        renderWithRouter({ searchPromise: Promise.resolve({ videos: [], total: 0, limit: 50, offset: 0 }), q: "" });
        expect((await screen.findAllByText("No videos found")).length).toBeGreaterThan(0);
    });

    it("renders the search input and filters button", async () => {
        renderWithRouter({ searchPromise: Promise.resolve({ videos: mockVideos, total: 3, limit: 50, offset: 0 }), q: "" });
        expect(await screen.findByPlaceholderText("Search by title or description...")).toBeInTheDocument();
        expect(screen.getByText("Filters")).toBeInTheDocument();
    });
});

describe("AllVideosSkeleton", () => {
    it("renders without errors", () => {
        const { container } = render(<AllVideosSkeleton />);
        expect(container.firstChild).toBeTruthy();
    });
});
