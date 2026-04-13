import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { WelcomeCard, WelcomeCardSkeleton } from "./WelcomeCard";
import type { Video } from "@/lib/types";

vi.mock("./incomplete-uploads.service", () => ({
    fetchIncompleteUploads: vi.fn().mockResolvedValue([]),
}));

const mockVideos: Video[] = [
    {
        id: "vid-001",
        title: "Test Video 1",
        description: "Description 1",
        durationSeconds: 60,
        fileSize: 1024 * 1024,
        createdAt: "2026-02-10T08:00:00Z",
        takenAt: "2026-02-10T03:15:00Z",
        uploadedBy: "Caregiver A",
        status: "UPLOADED",
    },
    {
        id: "vid-002",
        title: "Test Video 2",
        description: "Description 2",
        durationSeconds: 120,
        fileSize: 2 * 1024 * 1024,
        createdAt: "2026-02-09T10:30:00Z",
        takenAt: "2026-02-09T07:45:00Z",
        uploadedBy: "Caregiver B",
        status: "UPLOADING",
    },
];

describe("WelcomeCard", () => {
    it("renders welcome text", async () => {
        render(
            <MemoryRouter>
                <WelcomeCard videos={mockVideos} userName="Test User" />
            </MemoryRouter>
        );
        await waitFor(() => {
            expect(screen.getByText("Welcome Back")).toBeInTheDocument();
        });
    });

    it("renders video titles", async () => {
        render(
            <MemoryRouter>
                <WelcomeCard videos={mockVideos} userName="Test User" />
            </MemoryRouter>
        );
        await waitFor(() => {
            expect(screen.getByText("Test Video 1")).toBeInTheDocument();
            expect(screen.getByText("Test Video 2")).toBeInTheDocument();
        });
    });

    it("shows correct status labels", async () => {
        render(
            <MemoryRouter>
                <WelcomeCard videos={mockVideos} userName="Test User" />
            </MemoryRouter>
        );
        await waitFor(() => {
            expect(screen.getByText("Uploaded")).toBeInTheDocument();
            expect(screen.getByText("Uploading")).toBeInTheDocument();
        });
    });
});

describe("WelcomeCardSkeleton", () => {
    it("renders without errors", () => {
        const { container } = render(<WelcomeCardSkeleton />);
        expect(container.firstChild).toBeTruthy();
    });
});
