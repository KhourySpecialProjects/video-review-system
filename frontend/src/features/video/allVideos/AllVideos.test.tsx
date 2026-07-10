import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AllVideos, AllVideosSkeleton } from "./AllVideos";
import type { Video } from "@/lib/types";
import { searchKeys } from "@/lib/queryClient";

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
 * @description Renders AllVideos inside a memory router with the TanStack
 * Query cache pre-seeded for the empty search params key. The component
 * reads results via `useSuspenseQuery(searchVideosQuery(searchParams))`, so
 * the test has to prime the cache that the loader would otherwise populate.
 *
 * @param videos - Seeded video results for the default (empty) search params
 */
function renderWithRouter(videos: Video[]) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    const searchParams = "";
    queryClient.setQueryData(searchKeys.list(searchParams), {
        videos,
        total: videos.length,
        limit: 50,
        offset: 0,
    });
    const router = createMemoryRouter(
        [{ path: "/", element: <AllVideos />, loader: () => ({ searchParams, q: "" }) }],
        { initialEntries: ["/"] },
    );
    return render(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>,
    );
}

describe("AllVideos", () => {
    it("renders all video titles", async () => {
        renderWithRouter(mockVideos);
        expect((await screen.findAllByText("Eating Breakfast")).length).toBeGreaterThan(0);
        expect(screen.getAllByText("Morning Walk").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Afternoon Nap").length).toBeGreaterThan(0);
    });

    it("shows correct video count", async () => {
        renderWithRouter(mockVideos);
        expect(await screen.findByText("3 videos found")).toBeInTheDocument();
    });

    it("shows empty state when no videos", async () => {
        renderWithRouter([]);
        expect((await screen.findAllByText("No videos found")).length).toBeGreaterThan(0);
    });

    it("renders the search input and filters button", async () => {
        renderWithRouter(mockVideos);
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
