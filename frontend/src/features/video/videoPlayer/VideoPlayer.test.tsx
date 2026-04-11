import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VideoPlayer, VideoPlayerSkeleton } from "./VideoPlayer";

describe("VideoPlayer", () => {
    it("renders the video element with correct source", () => {
        render(
            <VideoPlayer
                src="https://example.com/video.mp4"
                duration={120}
            />
        );
        const video = document.querySelector("video");
        expect(video).toBeTruthy();
        expect(video!.getAttribute("src")).toBe("https://example.com/video.mp4");
    });

    it("renders the play button overlay", () => {
        render(
            <VideoPlayer
                src="https://example.com/video.mp4"
                duration={120}
            />
        );
        expect(screen.getByLabelText("Play video")).toBeInTheDocument();
    });

    it("renders duration display", () => {
        render(
            <VideoPlayer
                src="https://example.com/video.mp4"
                duration={120}
            />
        );
        expect(screen.getByText("0:00 / 2:00")).toBeInTheDocument();
    });

    it("renders seek slider", () => {
        render(
            <VideoPlayer
                src="https://example.com/video.mp4"
                duration={120}
            />
        );
        expect(screen.getByLabelText("Seek video")).toBeInTheDocument();
    });
});

describe("VideoPlayerSkeleton", () => {
    it("renders without errors", () => {
        const { container } = render(<VideoPlayerSkeleton />);
        expect(container.firstChild).toBeTruthy();
    });
});
