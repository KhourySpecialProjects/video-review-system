import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VideoPlayer, VideoPlayerSkeleton } from "./VideoPlayer";
import type { useVideoPlayer } from "@/hooks/useVideoPlayer";

/** Creates a mock player object matching the useVideoPlayer return type */
function createMockPlayer(
    overrides: Partial<ReturnType<typeof useVideoPlayer>> = {}
): ReturnType<typeof useVideoPlayer> {
    return {
        videoRef: { current: null },
        isPlaying: false,
        currentTime: 0,
        isMuted: false,
        showControls: true,
        setShowControls: vi.fn(),
        togglePlay: vi.fn(),
        toggleMute: vi.fn(),
        toggleFullscreen: vi.fn(),
        handleSeek: vi.fn(),
        speed: 1.0,
        setSpeed: vi.fn(),
        ...overrides,
    };
}

describe("VideoPlayer", () => {
    it("renders the video element with correct source", () => {
        render(
            <VideoPlayer
                src="https://example.com/video.mp4"
                duration={120}
                player={createMockPlayer()}
            />
        );
        const video = document.querySelector("video");
        expect(video).toBeTruthy();
        expect(video!.getAttribute("src")).toBe("https://example.com/video.mp4");
    });

    it("renders without src — placeholder state", () => {
        render(
            <VideoPlayer
                duration={120}
                player={createMockPlayer()}
            />
        );
        const video = document.querySelector("video");
        expect(video).toBeTruthy();
    });

    it("renders the title when provided", () => {
        render(
            <VideoPlayer
                duration={120}
                title="Seizure Event Review"
                player={createMockPlayer()}
            />
        );
        expect(screen.getByText("Seizure Event Review")).toBeInTheDocument();
    });

    it("does not render a title when not provided", () => {
        render(
            <VideoPlayer
                duration={120}
                player={createMockPlayer()}
            />
        );
        expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });

    it("renders the play button overlay when not playing", () => {
        render(
            <VideoPlayer
                src="https://example.com/video.mp4"
                duration={120}
                player={createMockPlayer({ isPlaying: false })}
            />
        );
        expect(screen.getByLabelText("Play video")).toBeInTheDocument();
    });

    it("does not render play overlay when playing", () => {
        render(
            <VideoPlayer
                src="https://example.com/video.mp4"
                duration={120}
                player={createMockPlayer({ isPlaying: true })}
            />
        );
        expect(screen.queryByLabelText("Play video")).not.toBeInTheDocument();
    });

    it("renders duration display", () => {
        render(
            <VideoPlayer
                src="https://example.com/video.mp4"
                duration={120}
                player={createMockPlayer({ currentTime: 0 })}
            />
        );
        expect(screen.getByText("0:00 / 2:00")).toBeInTheDocument();
    });

    it("renders seek slider", () => {
        render(
            <VideoPlayer
                src="https://example.com/video.mp4"
                duration={120}
                player={createMockPlayer()}
            />
        );
        expect(screen.getByLabelText("Seek video")).toBeInTheDocument();
    });

    it("renders speed selector with default 1x", () => {
        render(
            <VideoPlayer
                src="https://example.com/video.mp4"
                duration={120}
                player={createMockPlayer({ speed: 1.0 })}
            />
        );
        expect(screen.getByText("1x")).toBeInTheDocument();
    });

    it("renders mute button when not muted", () => {
        render(
            <VideoPlayer
                duration={120}
                player={createMockPlayer({ isMuted: false })}
            />
        );
        expect(screen.getByLabelText("Mute")).toBeInTheDocument();
    });

    it("renders unmute button when muted", () => {
        render(
            <VideoPlayer
                duration={120}
                player={createMockPlayer({ isMuted: true })}
            />
        );
        expect(screen.getByLabelText("Unmute")).toBeInTheDocument();
    });
});

describe("VideoPlayerSkeleton", () => {
    it("renders without errors", () => {
        const { container } = render(<VideoPlayerSkeleton />);
        expect(container.firstChild).toBeTruthy();
    });
});