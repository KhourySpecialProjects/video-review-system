import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
    getTimeFromPosition,
    timeToPercent,
    buildTicks,
    getActiveSelectionRegion,
    clipToRegion,
    useClipTimeline,
} from "./useClipTimeline";
import type { Clip } from "@shared/clip";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a minimal DOMRect-like object for a track starting at x=0. */
function makeRect(width: number, left = 0): DOMRect {
    return {
        left,
        width,
        right: left + width,
        top: 0,
        bottom: 0,
        height: 0,
        x: left,
        y: 0,
        toJSON: () => ({}),
    } as DOMRect;
}

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

// ---------------------------------------------------------------------------
// getTimeFromPosition
// ---------------------------------------------------------------------------

describe("getTimeFromPosition", () => {
    it("returns 0 when clientX is at the left edge", () => {
        expect(getTimeFromPosition(0, makeRect(100), 120)).toBe(0);
    });

    it("returns duration when clientX is at the right edge", () => {
        expect(getTimeFromPosition(100, makeRect(100), 120)).toBe(120);
    });

    it("returns the midpoint time when clientX is centered", () => {
        expect(getTimeFromPosition(50, makeRect(100), 120)).toBe(60);
    });

    it("clamps to 0 when clientX is before the left edge", () => {
        expect(getTimeFromPosition(-20, makeRect(100), 120)).toBe(0);
    });

    it("clamps to duration when clientX is past the right edge", () => {
        expect(getTimeFromPosition(200, makeRect(100), 120)).toBe(120);
    });

    it("accounts for a non-zero rect left offset", () => {
        expect(getTimeFromPosition(100, makeRect(100, 50), 120)).toBe(60);
    });

    it("returns 0 when rect width is zero", () => {
        expect(getTimeFromPosition(50, makeRect(0), 120)).toBe(0);
    });

    it("returns 0 when rect width is negative", () => {
        expect(getTimeFromPosition(50, makeRect(-10), 120)).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// timeToPercent
// ---------------------------------------------------------------------------

describe("timeToPercent", () => {
    it("returns '0%' when duration is 0", () => {
        expect(timeToPercent(30, 0)).toBe("0%");
    });

    it("returns '0%' for time 0", () => {
        expect(timeToPercent(0, 120)).toBe("0%");
    });

    it("returns '100%' for time equal to duration", () => {
        expect(timeToPercent(120, 120)).toBe("100%");
    });

    it("returns '50%' for the midpoint", () => {
        expect(timeToPercent(60, 120)).toBe("50%");
    });

    it("returns '25%' for one-quarter of the duration", () => {
        expect(timeToPercent(30, 120)).toBe("25%");
    });
});

// ---------------------------------------------------------------------------
// buildTicks
// ---------------------------------------------------------------------------

describe("buildTicks", () => {
    it("produces count + 1 ticks", () => {
        expect(buildTicks(120, 8)).toHaveLength(9);
    });

    it("starts at 0 and ends at duration", () => {
        const ticks = buildTicks(120, 4);
        expect(ticks[0]).toBe(0);
        expect(ticks[ticks.length - 1]).toBe(120);
    });

    it("spaces ticks evenly", () => {
        const ticks = buildTicks(100, 4);
        expect(ticks).toEqual([0, 25, 50, 75, 100]);
    });

    it("rounds fractional tick values", () => {
        const ticks = buildTicks(10, 3);
        expect(ticks).toEqual([0, 3, 7, 10]);
    });

    it("produces unique ticks for short durations", () => {
        const ticks = buildTicks(5, 8);
        const unique = [...new Set(ticks)];
        expect(ticks).toEqual(unique);
    });

    it("still starts at 0 and ends at duration for short durations", () => {
        const ticks = buildTicks(3, 8);
        expect(ticks[0]).toBe(0);
        expect(ticks[ticks.length - 1]).toBe(3);
    });
});

// ---------------------------------------------------------------------------
// getActiveSelectionRegion
// ---------------------------------------------------------------------------

describe("getActiveSelectionRegion", () => {
    it("returns null in idle phase", () => {
        expect(getActiveSelectionRegion("idle", null, null, 120)).toBeNull();
    });

    it("returns null in selecting phase when hoverTime is null", () => {
        expect(getActiveSelectionRegion("selecting", 30, null, 120)).toBeNull();
    });

    it("returns a region in selecting phase using startTime and hoverTime", () => {
        const region = getActiveSelectionRegion("selecting", 30, 90, 120);
        expect(region).not.toBeNull();
        expect(region!.left).toBe("25%");
        expect(region!.width).toBe("50%");
    });

    it("handles hover before start (reversed direction)", () => {
        const region = getActiveSelectionRegion("selecting", 90, 30, 120);
        expect(region!.left).toBe("25%");
        expect(region!.width).toBe("50%");
    });
});

// ---------------------------------------------------------------------------
// clipToRegion
// ---------------------------------------------------------------------------

describe("clipToRegion", () => {
    it("converts a clip to left/width percentages", () => {
        const region = clipToRegion({ startTimeS: 30, endTimeS: 90 }, 120);
        expect(region.left).toBe("25%");
        expect(region.width).toBe("50%");
    });

    it("handles a zero-length clip", () => {
        const region = clipToRegion({ startTimeS: 60, endTimeS: 60 }, 120);
        expect(region.left).toBe("50%");
        expect(region.width).toBe("0%");
    });
});

// ---------------------------------------------------------------------------
// useClipTimeline
// ---------------------------------------------------------------------------

const mockFetcherSubmit = vi.fn();

vi.mock("react-router", () => ({
    useFetcher: () => ({ submit: mockFetcherSubmit }),
}));

describe("useClipTimeline", () => {
    const duration = 120;
    const rect = makeRect(100);
    const noClips: Clip[] = [];

    function renderTimeline(clips = noClips) {
        return renderHook(() =>
            useClipTimeline(duration, { current: null }, clips, "video-1", "study-1", "site-1"),
        );
    }

    it("starts in idle phase with no times set", () => {
        const { result } = renderTimeline();
        expect(result.current.phase).toBe("idle");
        expect(result.current.startTime).toBeNull();
        expect(result.current.hoverTime).toBeNull();
    });

    it("passes through clips from the caller", () => {
        const clips = [makeClip(0, 30), makeClip(60, 90)];
        const { result } = renderTimeline(clips);
        expect(result.current.clips).toBe(clips);
    });

    it("sets startTime and moves to selecting on first click", () => {
        const { result } = renderTimeline();
        act(() => result.current.onTrackClick(25, rect));
        expect(result.current.phase).toBe("selecting");
        expect(result.current.startTime).toBe(30);
    });

    it("submits a create request on second click and returns to idle", () => {
        mockFetcherSubmit.mockClear();
        const { result } = renderTimeline();
        act(() => result.current.onTrackClick(25, rect));
        act(() => result.current.onTrackClick(75, rect));
        expect(result.current.phase).toBe("idle");
        expect(result.current.startTime).toBeNull();
        expect(mockFetcherSubmit).toHaveBeenCalledOnce();
        const [formData] = mockFetcherSubmit.mock.calls[0] as [FormData, unknown];
        expect(formData.get("intent")).toBe("create");
        const payload = JSON.parse(formData.get("payload") as string);
        expect(payload.startTimeS).toBe(30);
        expect(payload.endTimeS).toBe(90);
    });

    it("normalises a reversed selection so startTimeS < endTimeS", () => {
        mockFetcherSubmit.mockClear();
        const { result } = renderTimeline();
        act(() => result.current.onTrackClick(75, rect));
        act(() => result.current.onTrackClick(25, rect));
        const [formData] = mockFetcherSubmit.mock.calls[0] as [FormData, unknown];
        const payload = JSON.parse(formData.get("payload") as string);
        expect(payload.startTimeS).toBe(30);
        expect(payload.endTimeS).toBe(90);
    });

    it("cancels selection when second click matches start time", () => {
        mockFetcherSubmit.mockClear();
        const { result } = renderTimeline();
        act(() => result.current.onTrackClick(25, rect));
        expect(result.current.phase).toBe("selecting");

        act(() => result.current.onTrackClick(25, rect));
        expect(result.current.phase).toBe("idle");
        expect(result.current.startTime).toBeNull();
        expect(mockFetcherSubmit).not.toHaveBeenCalled();
    });

    it("updates hoverTime on mousemove", () => {
        const { result } = renderTimeline();
        act(() => result.current.onTrackMouseMove(50, rect));
        expect(result.current.hoverTime).toBe(60);
    });

    it("clears hoverTime on mouseleave", () => {
        const { result } = renderTimeline();
        act(() => result.current.onTrackMouseMove(50, rect));
        act(() => result.current.onTrackMouseLeave());
        expect(result.current.hoverTime).toBeNull();
    });

    it("scrubs the video element on mousemove", () => {
        const videoEl = { currentTime: 0 } as HTMLVideoElement;
        const { result } = renderHook(() =>
            useClipTimeline(duration, { current: videoEl }, noClips, "video-1", "study-1", "site-1"),
        );
        act(() => result.current.onTrackMouseMove(50, rect));
        expect(videoEl.currentTime).toBe(60);
    });

    it("does not throw when videoRef is null on mousemove", () => {
        const { result } = renderTimeline();
        expect(() =>
            act(() => result.current.onTrackMouseMove(50, rect)),
        ).not.toThrow();
    });
});
