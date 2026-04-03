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
        const region = clipToRegion({ startTime: 30, endTime: 90 }, 120);
        expect(region.left).toBe("25%");
        expect(region.width).toBe("50%");
    });

    it("handles a zero-length clip", () => {
        const region = clipToRegion({ startTime: 60, endTime: 60 }, 120);
        expect(region.left).toBe("50%");
        expect(region.width).toBe("0%");
    });
});

// ---------------------------------------------------------------------------
// useClipTimeline
// ---------------------------------------------------------------------------

describe("useClipTimeline", () => {
    const duration = 120;
    const rect = makeRect(100);

    it("starts in idle phase with no times set and empty clips", () => {
        const { result } = renderHook(() =>
            useClipTimeline(duration, { current: null }),
        );
        expect(result.current.phase).toBe("idle");
        expect(result.current.startTime).toBeNull();
        expect(result.current.hoverTime).toBeNull();
        expect(result.current.clips).toEqual([]);
    });

    it("sets startTime and moves to selecting on first click", () => {
        const { result } = renderHook(() =>
            useClipTimeline(duration, { current: null }),
        );
        act(() => result.current.onTrackClick(25, rect));
        expect(result.current.phase).toBe("selecting");
        expect(result.current.startTime).toBe(30);
    });

    it("completes a clip on second click and returns to idle", () => {
        const onClipCreated = vi.fn();
        const { result } = renderHook(() =>
            useClipTimeline(duration, { current: null }, onClipCreated),
        );
        act(() => result.current.onTrackClick(25, rect));
        act(() => result.current.onTrackClick(75, rect));
        expect(result.current.phase).toBe("idle");
        expect(result.current.startTime).toBeNull();
        expect(result.current.clips).toEqual([{ startTime: 30, endTime: 90 }]);
    });

    it("calls onClipCreated with ordered start/end when clip is completed", () => {
        const onClipCreated = vi.fn();
        const { result } = renderHook(() =>
            useClipTimeline(duration, { current: null }, onClipCreated),
        );
        act(() => result.current.onTrackClick(25, rect));
        act(() => result.current.onTrackClick(75, rect));
        expect(onClipCreated).toHaveBeenCalledOnce();
        expect(onClipCreated).toHaveBeenCalledWith({ startTime: 30, endTime: 90 });
    });

    it("normalises a reversed selection so startTime < endTime", () => {
        const onClipCreated = vi.fn();
        const { result } = renderHook(() =>
            useClipTimeline(duration, { current: null }, onClipCreated),
        );
        act(() => result.current.onTrackClick(75, rect));
        act(() => result.current.onTrackClick(25, rect));
        expect(result.current.clips[0]).toEqual({ startTime: 30, endTime: 90 });
        expect(onClipCreated).toHaveBeenCalledWith({ startTime: 30, endTime: 90 });
    });

    it("accumulates multiple clips", () => {
        const { result } = renderHook(() =>
            useClipTimeline(duration, { current: null }),
        );
        // First clip: 0s–30s
        act(() => result.current.onTrackClick(0, rect));
        act(() => result.current.onTrackClick(25, rect));
        // Second clip: 60s–90s
        act(() => result.current.onTrackClick(50, rect));
        act(() => result.current.onTrackClick(75, rect));
        expect(result.current.clips).toHaveLength(2);
        expect(result.current.clips[0]).toEqual({ startTime: 0, endTime: 30 });
        expect(result.current.clips[1]).toEqual({ startTime: 60, endTime: 90 });
    });

    it("updates hoverTime on mousemove", () => {
        const { result } = renderHook(() =>
            useClipTimeline(duration, { current: null }),
        );
        act(() => result.current.onTrackMouseMove(50, rect));
        expect(result.current.hoverTime).toBe(60);
    });

    it("clears hoverTime on mouseleave", () => {
        const { result } = renderHook(() =>
            useClipTimeline(duration, { current: null }),
        );
        act(() => result.current.onTrackMouseMove(50, rect));
        act(() => result.current.onTrackMouseLeave());
        expect(result.current.hoverTime).toBeNull();
    });

    it("scrubs the video element on mousemove", () => {
        const videoEl = { currentTime: 0 } as HTMLVideoElement;
        const { result } = renderHook(() =>
            useClipTimeline(duration, { current: videoEl }),
        );
        act(() => result.current.onTrackMouseMove(50, rect));
        expect(videoEl.currentTime).toBe(60);
    });

    it("does not throw when videoRef is null on mousemove", () => {
        const { result } = renderHook(() =>
            useClipTimeline(duration, { current: null }),
        );
        expect(() =>
            act(() => result.current.onTrackMouseMove(50, rect)),
        ).not.toThrow();
    });

    it("removes a clip by index", () => {
        const { result } = renderHook(() =>
            useClipTimeline(duration, { current: null }),
        );
        act(() => result.current.onTrackClick(0, rect));
        act(() => result.current.onTrackClick(25, rect));
        act(() => result.current.onTrackClick(50, rect));
        act(() => result.current.onTrackClick(75, rect));
        expect(result.current.clips).toHaveLength(2);

        act(() => result.current.removeClip(0));
        expect(result.current.clips).toHaveLength(1);
        expect(result.current.clips[0]).toEqual({ startTime: 60, endTime: 90 });
    });

    it("does nothing when removeClip index is out of bounds", () => {
        const { result } = renderHook(() =>
            useClipTimeline(duration, { current: null }),
        );
        act(() => result.current.onTrackClick(0, rect));
        act(() => result.current.onTrackClick(25, rect));

        act(() => result.current.removeClip(5));
        expect(result.current.clips).toHaveLength(1);
    });
});
