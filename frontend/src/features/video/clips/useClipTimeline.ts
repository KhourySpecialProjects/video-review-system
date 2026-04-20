import { useState, useCallback } from "react";
import type { ClipSelectionPhase, SelectionRegion, UseClipTimelineReturn } from "./types";
import type { Clip } from "@shared/clip";
import { useFetcher } from "react-router";

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
    if (!Number.isFinite(rect.width) || rect.width <= 0) return 0;
    if (!Number.isFinite(duration) || duration <= 0) return 0;
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
    if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) return "0%";
    const percent = Math.max(0, Math.min((time / duration) * 100, 100));
    return `${percent}%`;
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
    const safeCount = Number.isFinite(count) && count > 0 ? count : 1;
    const raw = Array.from({ length: safeCount + 1 }, (_, i) =>
        Math.round((i / safeCount) * duration),
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
 * Converts a completed `Clip` to CSS `left`/`width` percentages
 * for rendering on the timeline track.
 *
 * Normalises the start/end order so the region is always positioned correctly
 * regardless of which boundary is larger.
 *
 * @param clip - A clip with `startTimeS` and `endTimeS`.
 * @param duration - Total video duration in seconds.
 * @returns A `SelectionRegion` with CSS `left`/`width` percentages.
 *
 * @example
 * ```ts
 * const region = clipToRegion({ startTimeS: 30, endTimeS: 90 }, 120);
 * // { left: "25%", width: "50%" }
 * ```
 */
export function clipToRegion(clip: Pick<Clip, "startTimeS" | "endTimeS">, duration: number): SelectionRegion {
    const start = Math.min(clip.startTimeS, clip.endTimeS);
    const end = Math.max(clip.startTimeS, clip.endTimeS);
    return {
        left: timeToPercent(start, duration),
        width: timeToPercent(end - start, duration),
    };
}

/**
 * Manages the clip selection state machine on a timeline.
 *
 * Clips are loaded from the caller (via a route loader) and passed in as `clips`.
 * When the user completes a two-click selection, the hook submits a create request
 * to the `/clips` resource route via a fetcher — no local clip state is kept.
 *
 * State machine:
 * - `"idle"` → first click pins the start time → `"selecting"`
 * - `"selecting"` → second click submits the clip → back to `"idle"`
 *
 * @param duration - Total video duration in seconds.
 * @param videoRef - Ref to the `<video>` element; its `currentTime` is
 *   updated on hover to scrub playback.
 * @param clips - Clips loaded from the server, passed in by the caller.
 * @param videoId - Source video UUID, included in the create payload.
 * @param studyId - Study UUID, included in the create payload.
 * @param siteId - Site UUID, included in the create payload.
 * @returns The hook state and track event handlers. See `UseClipTimelineReturn`.
 *
 * @example
 * ```ts
 * const videoRef = useRef<HTMLVideoElement>(null);
 * const { phase, onTrackClick, onTrackMouseMove, onTrackMouseLeave } =
 *   useClipTimeline(120, videoRef, clips, videoId, studyId, siteId);
 * ```
 */
export function useClipTimeline(
    duration: number,
    videoRef: React.RefObject<HTMLVideoElement | null>,
    clips: Clip[],
    videoId: string,
    studyId: string,
    siteId: string,
): UseClipTimelineReturn {
    const [phase, setPhase] = useState<ClipSelectionPhase>("idle");
    const [startTime, setStartTime] = useState<number | null>(null);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const fetcher = useFetcher({ key: "clips" });

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

    /** Nudge step for keyboard arrow keys, in seconds. */
    const KEYBOARD_STEP = 1;
    /** Large nudge step for Shift + arrow keys, in seconds. */
    const KEYBOARD_STEP_LARGE = 5;

    /**
     * Commits a time value as a start or end selection point,
     * following the same state-machine logic as `onTrackClick`.
     * On completion, submits a create request to the `/clips` route.
     *
     * @param time - The time in seconds to commit.
     */
    const commitTime = useCallback(
        (time: number) => {
            if (phase === "idle") {
                setStartTime(time);
                setPhase("selecting");
                return;
            }

            if (startTime === time) {
                setStartTime(null);
                setPhase("idle");
                return;
            }

            if (phase === "selecting" && startTime !== null) {
                const start = Math.round(Math.min(startTime, time));
                const end = Math.round(Math.max(startTime, time));
                const payload = {
                    sourceVideoId: videoId,
                    studyId,
                    siteId,
                    title: `Clip ${start.toFixed(1)}s–${end.toFixed(1)}s`,
                    startTimeS: start,
                    endTimeS: end,
                };
                const formData = new FormData();
                formData.set("intent", "create");
                formData.set("payload", JSON.stringify(payload));
                fetcher.submit(formData, { method: "post", action: "/clips" });
                setStartTime(null);
                setPhase("idle");
            }
        },
        [phase, startTime, videoId, studyId, siteId, fetcher],
    );

    const onTrackClick = useCallback(
        (clientX: number, rect: DOMRect) => {
            const time = getTimeFromPosition(clientX, rect, duration);
            commitTime(time);
        },
        [duration, commitTime],
    );

    const onTrackKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!Number.isFinite(duration) || duration <= 0) return;

            const step = e.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
            const raw = hoverTime ?? startTime ?? 0;
            const current = Number.isFinite(raw) ? raw : 0;

            let nextTime: number | undefined;

            switch (e.key) {
                case "ArrowLeft":
                    nextTime = Math.max(0, current - step);
                    break;
                case "ArrowRight":
                    nextTime = Math.min(duration, current + step);
                    break;
                case "Home":
                    nextTime = 0;
                    break;
                case "End":
                    nextTime = duration;
                    break;
                case "Enter":
                case " ":
                    e.preventDefault();
                    commitTime(current);
                    return;
                default:
                    return;
            }

            e.preventDefault();
            if (!Number.isFinite(nextTime)) return;
            setHoverTime(nextTime);
            if (videoRef.current) {
                videoRef.current.currentTime = nextTime;
            }
        },
        [hoverTime, startTime, duration, commitTime, videoRef],
    );

    return {
        phase,
        startTime,
        hoverTime,
        clips,
        onTrackMouseMove,
        onTrackMouseLeave,
        onTrackClick,
        onTrackKeyDown,
    };
}
