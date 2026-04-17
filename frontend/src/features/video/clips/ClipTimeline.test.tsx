import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useRef } from "react";
import { ClipTimeline } from "./ClipTimeline";
import { useClipTimeline } from "./useClipTimeline";
import type { Clip } from "@shared/clip";

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

afterEach(() => {
    vi.restoreAllMocks();
});

const mockFetcherSubmit = vi.fn();

vi.mock("react-router", () => ({
    useFetcher: () => ({ submit: mockFetcherSubmit }),
}));

/** Creates a minimal Clip for test use. */
function makeClip(startTimeS: number, endTimeS: number): Clip {
    return {
        id: crypto.randomUUID(),
        sourceVideoId: "video-1",
        studyId: "study-1",
        siteId: "site-1",
        title: `Clip ${startTimeS}s–${endTimeS}s`,
        startTimeS,
        endTimeS,
        createdByUserId: "user-1",
        createdByName: "Test User",
        createdAt: new Date().toISOString(),
        themeColor: "#3b82f6",
    };
}

// Wrapper that mirrors how the parent calls the hook and passes it down
function Timeline({
    duration = 120,
    clips = [] as Clip[],
}: {
    duration?: number;
    clips?: Clip[];
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const timeline = useClipTimeline(duration, videoRef, clips, "video-1", "study-1", "site-1");
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
    it("submits a create request on second click and returns to idle", () => {
        mockFetcherSubmit.mockClear();
        render(<Timeline />);
        clickAt(50);
        clickAt(150);
        expect(mockFetcherSubmit).toHaveBeenCalledOnce();
        const [formData] = mockFetcherSubmit.mock.calls[0] as [FormData, unknown];
        expect(formData.get("intent")).toBe("create");
        const payload = JSON.parse(formData.get("payload") as string);
        expect(payload.startTimeS).toBe(30);
        expect(payload.endTimeS).toBe(90);
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
});

describe("ClipTimeline — server-loaded clips", () => {
    it("renders a clip region for each loaded clip", () => {
        const clips = [makeClip(30, 90)];
        render(<Timeline clips={clips} />);
        expect(screen.getByTestId("clip-region")).toBeInTheDocument();
    });

    it("renders multiple clip regions when multiple clips are loaded", () => {
        const clips = [makeClip(0, 30), makeClip(60, 90)];
        render(<Timeline clips={clips} />);
        expect(screen.getAllByTestId("clip-region")).toHaveLength(2);
    });

    it("shows the loaded clip count in status text", () => {
        const clips = [makeClip(0, 30)];
        render(<Timeline clips={clips} />);
        expect(
            getByTextContent("1 clip — Click to set start time"),
        ).toBeInTheDocument();
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
