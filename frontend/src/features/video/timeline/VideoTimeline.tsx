import { useRef } from "react";
import { formatDuration } from "@/lib/format";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    MARKER_COLORS,
    MARKER_LABELS,
    buildTimeLabels,
} from "./useVideoTimeline";
import type { TimelineMarkerType, TimelineMarker } from "./useVideoTimeline";

export type { TimelineMarkerType, TimelineMarker };
export { annotationsToMarkers } from "./useVideoTimeline";

/**
 * Props for the VideoTimeline component.
 */
interface VideoTimelineProps {
    /** Total duration of the video in seconds. */
    duration: number;
    /** Current playback position in seconds. */
    currentTime: number;
    /** Array of markers to display on the timeline. */
    markers: TimelineMarker[];
    /** Callback fired when a marker or position on the timeline is clicked. */
    onSeek: (time: number) => void;
}

/**
 * VideoTimeline displays a horizontal timeline with color-coded annotation
 * markers, time labels, a current position needle, and a legend.
 *
 * Clicking a marker or anywhere on the timeline seeks the video to that time.
 * Hovering a marker shows a tooltip with its timestamp and label.
 * Arrow keys seek by 5 seconds while the bar is focused.
 */
export function VideoTimeline({
    duration,
    currentTime,
    markers,
    onSeek,
}: VideoTimelineProps) {
    const barRef = useRef<HTMLDivElement>(null);

    const timeLabels = buildTimeLabels(duration);
    const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    function handleBarClick(e: React.MouseEvent<HTMLDivElement>) {
        const bar = barRef.current;
        if (!bar) return;
        const rect = bar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, x / rect.width));
        onSeek(ratio * duration);
    }

    function handleBarKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            onSeek(Math.min(duration, currentTime + 5));
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            onSeek(Math.max(0, currentTime - 5));
        }
    }

    return (
        <div className="w-full select-none">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Video Timeline &amp; Markers
            </p>

            {/* Time labels */}
            <div className="relative mb-1 flex justify-between text-xs text-muted-foreground">
                {timeLabels.map((t) => (
                    <span key={t}>{formatDuration(t)}</span>
                ))}
            </div>

            {/* Timeline bar */}
            <div
                ref={barRef}
                role="slider"
                tabIndex={0}
                aria-label="Video timeline"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={currentTime}
                onClick={handleBarClick}
                onKeyDown={handleBarKeyDown}
                className="relative h-12 w-full cursor-pointer rounded-md bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                {/* Current position needle */}
                <div
                    className="absolute top-0 h-full w-0.5 bg-foreground"
                    style={{ left: `${currentPercent}%` }}
                />

                {/* Markers */}
                {markers.map((marker) => {
                    const percent = duration > 0
                        ? (marker.timestamp / duration) * 100
                        : 0;
                    const colorClass = MARKER_COLORS[marker.markerType];

                    return (
                        <Tooltip key={marker.id}>
                            <TooltipTrigger
                                render={
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSeek(marker.timestamp);
                                        }}
                                        className={`absolute top-0 h-full w-0.5 -translate-x-1/2 cursor-pointer transition-opacity hover:opacity-80 ${colorClass}`}
                                        style={{ left: `${percent}%` }}
                                        aria-label={`Marker at ${formatDuration(Math.floor(marker.timestamp))}`}
                                    >
                                        {/* Marker pill at top */}
                                        <span
                                            className={`absolute -top-5 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5 text-xs font-semibold text-white ${colorClass}`}
                                        >
                                            {formatDuration(Math.floor(marker.timestamp))}
                                        </span>
                                    </button>
                                }
                            />
                            <TooltipContent>
                                <p className="font-medium">{formatDuration(Math.floor(marker.timestamp))}</p>
                                {marker.label && (
                                    <p className="text-xs text-muted-foreground">{marker.label}</p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-4">
                {(Object.keys(MARKER_COLORS) as TimelineMarkerType[]).map((type) => (
                    <div key={type} className="flex items-center gap-1.5">
                        <span className={`size-2.5 rounded-full ${MARKER_COLORS[type]}`} />
                        <span className="text-xs text-muted-foreground">
                            {MARKER_LABELS[type]}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
