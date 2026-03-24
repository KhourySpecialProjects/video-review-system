import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { WelcomeCard, WelcomeCardSkeleton } from "./WelcomeCard";
import type { Video } from "@/lib/types";

const mockVideos: Video[] = [
    {
        id: "vid-001",
        title: "Test Video 1",
        description: "Description 1",
        duration: 60,
        thumbnailUrl: "",
        videoUrl: "https://example.com/video1.mp4",
        uploadedAt: "2026-02-10T08:00:00Z",
        filmedAt: "2026-02-10T03:15:00Z",
        filmedBy: "Caregiver A",
        status: "received",
    },
    {
        id: "vid-002",
        title: "Test Video 2",
        description: "Description 2",
        duration: 120,
        thumbnailUrl: "",
        videoUrl: "https://example.com/video2.mp4",
        uploadedAt: "2026-02-09T10:30:00Z",
        filmedAt: "2026-02-09T07:45:00Z",
        filmedBy: "Caregiver B",
        status: "pending",
    },
];

describe("WelcomeCard", () => {
    it("renders welcome text", () => {
        render(
            <MemoryRouter>
                <WelcomeCard videos={mockVideos} userName="Test User" />
            </MemoryRouter>
        );
        expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    });

    it("renders video titles", () => {
        render(
            <MemoryRouter>
                <WelcomeCard videos={mockVideos} userName="Test User" />
            </MemoryRouter>
        );
        expect(screen.getByText("Test Video 1")).toBeInTheDocument();
        expect(screen.getByText("Test Video 2")).toBeInTheDocument();
    });

    it("shows received status for received videos", () => {
        render(
            <MemoryRouter>
                <WelcomeCard videos={mockVideos} userName="Test User" />
            </MemoryRouter>
        );
        expect(screen.getByText("Received")).toBeInTheDocument();
        expect(screen.getByText("Pending")).toBeInTheDocument();
    });
});

describe("WelcomeCardSkeleton", () => {
    it("renders without errors", () => {
        const { container } = render(<WelcomeCardSkeleton />);
        expect(container.firstChild).toBeTruthy();
    });
});
