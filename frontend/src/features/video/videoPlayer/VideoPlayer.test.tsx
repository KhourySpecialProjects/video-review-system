import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { VideoPlayer, VideoPlayerSkeleton } from "./VideoPlayer";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";

vi.mock("@/hooks/useVideoPlayer", () => ({
    useVideoPlayer: vi.fn(),
}));

const mockUseVideoPlayer = vi.mocked(useVideoPlayer);

function mockPlayer(overrides: Partial<ReturnType<typeof useVideoPlayer>> = {}): ReturnType<typeof useVideoPlayer> {
    return {
        videoRef: { current: null },
        containerRef: { current: null },
        isPlaying: false,
        currentTime: 0,
        isMuted: false,
        showControls: true,
        resetInactivityTimer: vi.fn(),
        videoEventHandlers: {},
        togglePlay: vi.fn(),
        toggleMute: vi.fn(),
        toggleFullscreen: vi.fn(),
        handleSeek: vi.fn(),
        speed: 1.0,
        setSpeed: vi.fn(),
        volume: 1.0,
        setVolume: vi.fn(),
        aspectRatio: null,
        ...overrides,
    } as ReturnType<typeof useVideoPlayer>;
}

describe("VideoPlayer", () => {
    beforeEach(() => {
        mockUseVideoPlayer.mockReturnValue(mockPlayer());
    });

    it("renders the video element with correct source", () => {
        render(<VideoPlayer src="https://example.com/video.mp4" duration={120} />);
        const video = document.querySelector("video");
        expect(video).toBeTruthy();
        expect(video!.getAttribute("src")).toBe("https://example.com/video.mp4");
    });

    it("renders without src — placeholder state", () => {
        render(<VideoPlayer duration={120} />);
        const video = document.querySelector("video");
        expect(video).toBeTruthy();
    });

    it("renders the title when provided", () => {
        render(<VideoPlayer duration={120} title="Seizure Event Review" />);
        expect(screen.getByText("Seizure Event Review")).toBeInTheDocument();
    });

    it("does not render a title when not provided", () => {
        render(<VideoPlayer duration={120} />);
        expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });

    it("renders the play button overlay when not playing", () => {
        render(<VideoPlayer src="https://example.com/video.mp4" duration={120} />);
        expect(screen.getByLabelText("Play video")).toBeInTheDocument();
    });

    it("does not render play overlay when playing", () => {
        mockUseVideoPlayer.mockReturnValueOnce(mockPlayer({ isPlaying: true }));
        render(<VideoPlayer src="https://example.com/video.mp4" duration={120} />);
        expect(screen.queryByLabelText("Play video")).not.toBeInTheDocument();
    });

    it("renders duration display", () => {
        render(<VideoPlayer src="https://example.com/video.mp4" duration={120} />);
        // The time display interleaves "0:00", a " / " separator span, and
        // "2:00" — match on the parent via a function matcher.
        expect(
            screen.getByText((_, node) => {
                if (!node) return false;
                const text = node.textContent?.trim();
                return text === "0:00 / 2:00";
            }),
        ).toBeInTheDocument();
    });

    it("renders seek slider", () => {
        render(<VideoPlayer src="https://example.com/video.mp4" duration={120} />);
        expect(screen.getByLabelText("Seek video")).toBeInTheDocument();
    });

    it("renders speed selector", () => {
        render(<VideoPlayer src="https://example.com/video.mp4" duration={120} />);
        // SpeedToggle is a ToggleGroup with one ToggleGroupItem per speed.
        expect(screen.getByLabelText("1x speed")).toBeInTheDocument();
        expect(screen.getByLabelText("2x speed")).toBeInTheDocument();
    });

    it("renders mute button when not muted", () => {
        render(<VideoPlayer duration={120} />);
        expect(screen.getByLabelText("Mute")).toBeInTheDocument();
    });

    it("renders unmute button when muted", () => {
        mockUseVideoPlayer.mockReturnValueOnce(mockPlayer({ isMuted: true }));
        render(<VideoPlayer duration={120} />);
        expect(screen.getByLabelText("Unmute")).toBeInTheDocument();
    });
});

describe("VideoPlayerSkeleton", () => {
    it("renders without errors", () => {
        const { container } = render(<VideoPlayerSkeleton />);
        expect(container.firstChild).toBeTruthy();
    });
});
