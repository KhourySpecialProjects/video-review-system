import { useState, useCallback } from "react";
import type { ClipRange, ClipSelectionPhase, SelectionRegion, UseClipTimelineReturn } from "./types";

/** Number of time tick marks to render on the timeline. */
export const TICK_COUNT = 8;

/**
 * Calculates the time in seconds from a pointer's horizontal position
 * relative to the timeline track element.
 *
 * The value is clamped between `0` and `duration` so it never falls
 * outside the track boundaries.
 *
 * @param clientX - The mouse event's `clientX` coordinate.
 * @param rect - The bounding client rect of the timeline track element.
 * @param duration - The total video duration in seconds.
 * @returns Time in seconds corresponding to the pointer position.
 *
 * @example
 * ```ts
 * const rect = trackEl.getBoundingClientRect();
 * const time = getTimeFromPosition(event.clientX, rect, 120);
 * // time is between 0 and 120
 * ```
 */
export function getTimeFromPosition(
    clientX: number,
    rect: DOMRect,
    duration: number,
): number {
    if (rect.width <= 0 || duration <= 0) return 0;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * duration;
}

/**
 * Converts a time value to a CSS percentage string for absolute positioning
 * within the timeline track.
 *
 * Returns `"0%"` when `duration` is zero or negative to avoid division by zero.
 *
 * @param time - Time in seconds to convert.
 * @param duration - Total video duration in seconds.
 * @returns A percentage string such as `"50%"`.
 *
 * @example
 * ```ts
 * timeToPercent(60, 120); // "50%"
 * timeToPercent(0, 120);  // "0%"
 * ```
 */
export function timeToPercent(time: number, duration: number): string {
    if (duration <= 0) return "0%";
    return `${(time / duration) * 100}%`;
}

/**
 * Generates an array of evenly-spaced tick times across a video duration.
 *
 * Produces `count + 1` values starting at `0` and ending at `duration`,
 * with each intermediate value rounded to the nearest integer.
 *
 * @param duration - Total video duration in seconds.
 * @param count - Number of intervals (the returned array has `count + 1` entries).
 * @returns Array of tick times in seconds.
 *
 * @example
 * ```ts
 * buildTicks(100, 4); // [0, 25, 50, 75, 100]
 * ```
 */
export function buildTicks(duration: number, count: number): number[] {
    const raw = Array.from({ length: count + 1 }, (_, i) =>
        Math.round((i / count) * duration),
    );
    return [...new Set(raw)];
}

/**
 * Derives the in-progress selection region from the pinned start time
 * and the current hover position.
 *
 * Returns `null` when there is no active selection in progress
 * (i.e. the phase is `"idle"`, or either `startTime` or `hoverTime` is `null`).
 *
 * @param phase - Current selection phase of the state machine.
 * @param startTime - The pinned start time in seconds, or `null`.
 * @param hoverTime - The current hover time in seconds, or `null`.
 * @param duration - Total video duration in seconds.
 * @returns A `SelectionRegion` with CSS `left`/`width` percentages, or `null`.
 *
 * @example
 * ```ts
 * const region = getActiveSelectionRegion("selecting", 30, 90, 120);
 * // { left: "25%", width: "50%" }
 * ```
 */
export function getActiveSelectionRegion(
    phase: ClipSelectionPhase,
    startTime: number | null,
    hoverTime: number | null,
    duration: number,
): SelectionRegion | null {
    if (phase !== "selecting" || startTime === null || hoverTime === null) {
        return null;
    }

    const regionStart = Math.min(startTime, hoverTime);
    const regionEnd = Math.max(startTime, hoverTime);

    return {
        left: timeToPercent(regionStart, duration),
        width: timeToPercent(regionEnd - regionStart, duration),
    };
}

/**
 * Converts a completed `ClipRange` to CSS `left`/`width` percentages
 * for rendering on the timeline track.
 *
 * Normalises the start/end order so the region is always positioned correctly
 * regardless of which boundary is larger.
 *
 * @param clip - A completed clip with `startTime` and `endTime`.
 * @param duration - Total video duration in seconds.
 * @returns A `SelectionRegion` with CSS `left`/`width` percentages.
 *
 * @example
 * ```ts
 * const region = clipToRegion({ startTime: 30, endTime: 90 }, 120);
 * // { left: "25%", width: "50%" }
 * ```
 */
export function clipToRegion(clip: ClipRange, duration: number): SelectionRegion {
    const start = Math.min(clip.startTime, clip.endTime);
    const end = Math.max(clip.startTime, clip.endTime);
    return {
        left: timeToPercent(start, duration),
        width: timeToPercent(end - start, duration),
    };
}

/**
 * Manages the state machine for clip creation on a timeline.
 *
 * Supports creating multiple clips. Each two-click cycle adds a clip
 * to the accumulated array and returns to `"idle"` for the next one.
 *
 * State machine:
 * - `"idle"` → first click pins the start time → `"selecting"`
 * - `"selecting"` → second click completes the clip → back to `"idle"`
 *
 * @param duration - Total video duration in seconds.
 * @param videoRef - Ref to the `<video>` element; its `currentTime` is
 *   updated on hover to scrub playback.
 * @param onClipCreated - Optional callback fired with each completed clip.
 * @returns The hook state and track event handlers. See `UseClipTimelineReturn`.
 *
 * @example
 * ```ts
 * const videoRef = useRef<HTMLVideoElement>(null);
 * const { phase, clips, onTrackClick, onTrackMouseMove, onTrackMouseLeave } =
 *   useClipTimeline(120, videoRef, (clip) => console.log(clip));
 * ```
 */
export function useClipTimeline(
    duration: number,
    videoRef: React.RefObject<HTMLVideoElement | null>,
    onClipCreated?: (clip: ClipRange) => void,
): UseClipTimelineReturn {
    const [phase, setPhase] = useState<ClipSelectionPhase>("idle");
    const [startTime, setStartTime] = useState<number | null>(null);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [clips, setClips] = useState<ClipRange[]>([]);

    const onTrackMouseMove = useCallback(
        (clientX: number, rect: DOMRect) => {
            const time = getTimeFromPosition(clientX, rect, duration);
            setHoverTime(time);
            if (videoRef.current) {
                videoRef.current.currentTime = time;
            }
        },
        [duration, videoRef],
    );

    const onTrackMouseLeave = useCallback(() => {
        setHoverTime(null);
    }, []);

    const removeClip = useCallback((index: number) => {
        setClips((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const onTrackClick = useCallback(
        (clientX: number, rect: DOMRect) => {
            const time = getTimeFromPosition(clientX, rect, duration);

            if (phase === "idle") {
                setStartTime(time);
                setPhase("selecting");
                return;
            }

            if (startTime === time) {
                // clicking the same point cancels the selection
                setStartTime(null);
                setPhase("idle");
                return;
            }

            if (phase === "selecting" && startTime !== null) {
                const start = Math.min(startTime, time);
                const end = Math.max(startTime, time);
                const clip: ClipRange = { startTime: start, endTime: end };
                setClips((prev) => [...prev, clip]);
                setStartTime(null);
                setPhase("idle");
                onClipCreated?.(clip);
            }
        },
        [duration, phase, startTime, onClipCreated],
    );

    return {
        phase,
        startTime,
        hoverTime,
        clips,
        removeClip,
        onTrackMouseMove,
        onTrackMouseLeave,
        onTrackClick,
    };
}
