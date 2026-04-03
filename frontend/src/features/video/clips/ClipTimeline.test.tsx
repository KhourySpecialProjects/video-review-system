import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useRef } from "react";
import { ClipTimeline } from "./ClipTimeline";
import { useClipTimeline } from "./useClipTimeline";
import type { ClipRange } from "./types";

const TRACK_WIDTH = 200;

beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
        left: 0,
        width: TRACK_WIDTH,
        right: TRACK_WIDTH,
        top: 0,
        bottom: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
    } as DOMRect);
});

// Wrapper that mirrors how the parent calls the hook and passes it down
function Timeline({
    duration = 120,
    onClipCreated,
}: {
    duration?: number;
    onClipCreated?: (clip: ClipRange) => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const timeline = useClipTimeline(duration, videoRef, onClipCreated);
    return <ClipTimeline duration={duration} timeline={timeline} />;
}

function getTrack() {
    return screen.getByRole("slider", { name: "Video timeline" });
}

/** Fire a mouseMove at the given clientX on the track. */
function moveAt(clientX: number) {
    fireEvent.mouseMove(getTrack(), { clientX });
}

/** Fire a click at the given clientX on the track. */
function clickAt(clientX: number) {
    fireEvent.click(getTrack(), { clientX });
}

/** Finds the innermost element whose combined textContent matches the given string. */
function getByTextContent(text: string) {
    const matches = screen.getAllByText((_content, element) => {
        return element?.textContent === text;
    });
    return matches[matches.length - 1];
}

describe("ClipTimeline — initial render", () => {
    it("renders the timeline container", () => {
        render(<Timeline />);
        expect(screen.getByTestId("clip-timeline")).toBeInTheDocument();
    });

    it("renders the track slider", () => {
        render(<Timeline />);
        expect(getTrack()).toBeInTheDocument();
    });

    it("shows idle instruction text with clip count", () => {
        render(<Timeline />);
        expect(
            getByTextContent("0 clips — Click to set start time"),
        ).toBeInTheDocument();
    });

    it("renders time tick marks", () => {
        render(<Timeline duration={120} />);
        expect(screen.getByText("0:00")).toBeInTheDocument();
        expect(screen.getByText("2:00")).toBeInTheDocument();
    });

    it("does not render any needles or regions initially", () => {
        render(<Timeline />);
        expect(screen.queryByTestId("start-needle")).toBeNull();
        expect(screen.queryByTestId("hover-needle")).toBeNull();
        expect(screen.queryByTestId("selection-region")).toBeNull();
        expect(screen.queryByTestId("clip-region")).toBeNull();
    });
});

describe("ClipTimeline — hover needle", () => {
    it("shows the hover needle when the mouse moves over the track", () => {
        render(<Timeline />);
        moveAt(100);
        expect(screen.getByTestId("hover-needle")).toBeInTheDocument();
    });

    it("hides the hover needle when the mouse leaves the track", () => {
        render(<Timeline />);
        moveAt(100);
        fireEvent.mouseLeave(getTrack());
        expect(screen.queryByTestId("hover-needle")).toBeNull();
    });

    it("shows the hover needle after a clip is completed (back in idle)", () => {
        render(<Timeline />);
        clickAt(50);
        clickAt(150);
        moveAt(100);
        expect(screen.getByTestId("hover-needle")).toBeInTheDocument();
    });
});

describe("ClipTimeline — setting start time", () => {
    it("pins the start needle on first click", () => {
        render(<Timeline />);
        clickAt(50);
        expect(screen.getByTestId("start-needle")).toBeInTheDocument();
    });

    it("shows the correct status text after start is set", () => {
        render(<Timeline />);
        clickAt(50); // 30s
        expect(
            getByTextContent("Start: 0:30 — Click to set end time"),
        ).toBeInTheDocument();
    });

    it("shows a selection preview region while hovering after start is set", () => {
        render(<Timeline />);
        clickAt(50);
        moveAt(150);
        expect(screen.getByTestId("selection-region")).toBeInTheDocument();
    });

    it("does not show a selection region when not hovering after start is set", () => {
        render(<Timeline />);
        clickAt(50);
        expect(screen.queryByTestId("selection-region")).toBeNull();
    });
});

describe("ClipTimeline — completing a clip", () => {
    it("renders a completed clip region after second click", () => {
        render(<Timeline />);
        clickAt(50);
        clickAt(150);
        expect(screen.getByTestId("clip-region")).toBeInTheDocument();
    });

    it("removes the start needle after clip is completed (back to idle)", () => {
        render(<Timeline />);
        clickAt(50);
        clickAt(150);
        expect(screen.queryByTestId("start-needle")).toBeNull();
    });

    it("removes the selection preview after clip is completed", () => {
        render(<Timeline />);
        clickAt(50);
        clickAt(150);
        expect(screen.queryByTestId("selection-region")).toBeNull();
    });

    it("calls onClipCreated with correct start and end times", () => {
        const onClipCreated = vi.fn();
        render(<Timeline onClipCreated={onClipCreated} />);
        clickAt(50);  // 30s
        clickAt(150); // 90s
        expect(onClipCreated).toHaveBeenCalledOnce();
        expect(onClipCreated).toHaveBeenCalledWith({
            startTime: 30,
            endTime: 90,
        });
    });

    it("normalises a reversed selection so startTime < endTime", () => {
        const onClipCreated = vi.fn();
        render(<Timeline onClipCreated={onClipCreated} />);
        clickAt(150); // click at 90s first
        clickAt(50);  // then 30s
        expect(onClipCreated).toHaveBeenCalledWith({
            startTime: 30,
            endTime: 90,
        });
    });

    it("updates the clip count in status text", () => {
        render(<Timeline />);
        clickAt(50);
        clickAt(150);
        expect(
            getByTextContent("1 clip — Click to set start time"),
        ).toBeInTheDocument();
    });
});

describe("ClipTimeline — multiple clips", () => {
    it("renders multiple completed clip regions", () => {
        render(<Timeline />);
        clickAt(0);
        clickAt(50);
        clickAt(100);
        clickAt(150);
        expect(screen.getAllByTestId("clip-region")).toHaveLength(2);
    });

    it("calls onClipCreated for each clip", () => {
        const onClipCreated = vi.fn();
        render(<Timeline onClipCreated={onClipCreated} />);
        clickAt(0);
        clickAt(50);
        clickAt(100);
        clickAt(150);
        expect(onClipCreated).toHaveBeenCalledTimes(2);
    });

    it("updates the clip count correctly for multiple clips", () => {
        render(<Timeline />);
        clickAt(0);
        clickAt(50);
        clickAt(100);
        clickAt(150);
        expect(
            getByTextContent("2 clips — Click to set start time"),
        ).toBeInTheDocument();
    });

    it("returns to idle after each clip allowing a new one immediately", () => {
        render(<Timeline />);
        clickAt(0);
        clickAt(50);
        clickAt(100);
        expect(screen.getByTestId("start-needle")).toBeInTheDocument();
        expect(screen.getByText(/Start:/)).toBeInTheDocument();
    });
});

describe("ClipTimeline — accessibility", () => {
    it("has an aria-label on the outer container", () => {
        render(<Timeline />);
        expect(screen.getByLabelText("Clip timeline")).toBeInTheDocument();
    });

    it("track has correct aria-valuemin and aria-valuemax", () => {
        render(<Timeline duration={120} />);
        const track = getTrack();
        expect(track).toHaveAttribute("aria-valuemin", "0");
        expect(track).toHaveAttribute("aria-valuemax", "120");
    });

    it("start needle has an aria-label describing the time", () => {
        render(<Timeline />);
        clickAt(50); // 30s
        expect(
            screen.getByLabelText("Start time: 0:30"),
        ).toBeInTheDocument();
    });
});
