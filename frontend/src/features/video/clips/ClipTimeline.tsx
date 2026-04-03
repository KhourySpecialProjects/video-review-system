import { useRef } from "react";
import { formatDuration } from "@/lib/format";
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from "@/components/ui/tooltip";
import type { ClipTimelineProps } from "./types";
import {
    TICK_COUNT,
    buildTicks,
    timeToPercent,
    getActiveSelectionRegion,
    clipToRegion,
} from "./useClipTimeline";

/**
 * Interactive clip timeline component.
 *
 * Purely presentational — all state lives in the `useClipTimeline` hook,
 * which should be called in the parent so sibling components can also
 * access and modify clips.
 *
 * Supports creating multiple clips. The native cursor is hidden over the
 * track; a thin vertical needle follows the mouse instead, with a tooltip
 * showing the exact timestamp.
 *
 * Workflow:
 * 1. Hover to see the needle and scrub the video.
 * 2. Click once to pin the start time.
 * 3. Hover to see the selection region between start and the needle.
 * 4. Click a second time to complete the clip.
 * 5. The clip is persisted on the timeline and the cycle resets for the next clip.
 *
 * @example
 * ```tsx
 * const videoRef = useRef<HTMLVideoElement>(null);
 * const timeline = useClipTimeline(120, videoRef);
 * <ClipTimeline duration={120} timeline={timeline} />
 * ```
 */
export function ClipTimeline({ duration, timeline }: ClipTimelineProps) {
    const trackRef = useRef<HTMLDivElement>(null);

    const {
        phase,
        startTime,
        hoverTime,
        clips,
        onTrackMouseMove,
        onTrackMouseLeave,
        onTrackClick,
    } = timeline;

    const activeRegion = getActiveSelectionRegion(
        phase,
        startTime,
        hoverTime,
        duration,
    );

    const ticks = buildTicks(duration, TICK_COUNT);

    return (
        <div
            className="w-full select-none rounded-lg border border-border bg-bg-light p-3"
            data-testid="clip-timeline"
            aria-label="Clip timeline"
        >
            {/* Status label */}
            <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                    {phase === "idle" && (
                        <>
                            <span className="font-medium text-foreground">{clips.length}</span>
                            {` clip${clips.length !== 1 ? "s" : ""} — Click to set start time`}
                        </>
                    )}
                    {phase === "selecting" &&
                        startTime !== null && (
                            <>
                                {"Start: "}
                                <span className="font-medium text-primary">
                                    {formatDuration(Math.floor(startTime))}
                                </span>
                                {" — Click to set end time"}
                            </>
                        )}
                </span>
            </div>

            {/* Timeline track */}
            <div
                ref={trackRef}
                role="slider"
                aria-label="Video timeline"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={hoverTime ?? startTime ?? 0}
                tabIndex={0}
                className="group relative h-9 w-full cursor-none overflow-hidden rounded-md bg-bg-dark shadow-shadow-s"
                onMouseMove={(e) =>
                    onTrackMouseMove(
                        e.clientX,
                        e.currentTarget.getBoundingClientRect(),
                    )
                }
                onMouseLeave={onTrackMouseLeave}
                onClick={(e) =>
                    onTrackClick(
                        e.clientX,
                        e.currentTarget.getBoundingClientRect(),
                    )
                }
            >
                {/* Completed clips */}
                {clips.map((clip, i) => {
                    const region = clipToRegion(clip, duration);
                    return (
                        <div
                            key={i}
                            className="pointer-events-none absolute inset-y-0 border-x border-primary/60 bg-primary/25"
                            style={{ left: region.left, width: region.width }}
                            data-testid="clip-region"
                        />
                    );
                })}

                {/* Active selection preview */}
                {activeRegion && (
                    <div
                        className="absolute inset-y-0 bg-primary/15"
                        style={{
                            left: activeRegion.left,
                            width: activeRegion.width,
                        }}
                        data-testid="selection-region"
                    />
                )}

                {/* Start needle (pinned after first click) */}
                {startTime !== null && phase === "selecting" && (
                    <Tooltip open>
                        <TooltipTrigger
                            render={
                                <div
                                    className="pointer-events-none absolute inset-y-0 w-0.5 bg-primary"
                                    style={{ left: timeToPercent(startTime, duration) }}
                                    data-testid="start-needle"
                                    aria-label={`Start time: ${formatDuration(Math.floor(startTime))}`}
                                />
                            }
                        />
                        <TooltipContent side="top">
                            {formatDuration(Math.floor(startTime))}
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* Hover needle with tooltip — replaces the native cursor */}
                {hoverTime !== null && (
                    <Tooltip open>
                        <TooltipTrigger
                            render={
                                <div
                                    className="pointer-events-none absolute inset-y-0 w-px bg-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
                                    style={{ left: timeToPercent(hoverTime, duration) }}
                                    data-testid="hover-needle"
                                />
                            }
                        />
                        <TooltipContent side="top">
                            {formatDuration(Math.floor(hoverTime))}
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>

            {/* Tick marks */}
            <div className="relative mt-1.5 h-4 w-full">
                {ticks.map((tick, i) => (
                    <span
                        key={tick}
                        className="absolute text-[10px] leading-none text-muted-foreground/50"
                        style={{
                            left: timeToPercent(tick, duration),
                            transform: i === 0
                                ? "none"
                                : i === ticks.length - 1
                                  ? "translateX(-100%)"
                                  : "translateX(-50%)",
                        }}
                    >
                        {formatDuration(tick)}
                    </span>
                ))}
            </div>
        </div>
    );
}
