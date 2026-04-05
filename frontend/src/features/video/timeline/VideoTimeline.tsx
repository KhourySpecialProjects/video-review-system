import { useRef } from "react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Annotation } from "@/features/video/annotations/types";

/**
 * Marker categories displayed on the timeline.
 * Maps annotation types to display labels and colors.
 */
export type TimelineMarkerType = "drawing" | "timestamp-comment";

/**
 * A single marker displayed on the video timeline.
 */
export type TimelineMarker = {
    /** Unique identifier for the marker. */
    id: string;
    /** Time in seconds where the marker appears. */
    timestamp: number;
    /** The category of the marker — drawing or timestamp comment. */
    markerType: TimelineMarkerType;
    /** Optional label shown in the tooltip. */
    label?: string;
};

/**
 * Color configuration for each marker type.
 */
const MARKER_COLORS: Record<TimelineMarkerType, string> = {
    "drawing": "#ef4444",
    "timestamp-comment": "#f59e0b",
};

/**
 * Human-readable labels for each marker type shown in the legend.
 */
const MARKER_LABELS: Record<TimelineMarkerType, string> = {
    "drawing": "Drawing",
    "timestamp-comment": "Timestamp Comment",
};

/**
 * Formats a time in seconds to MM:SS format.
 *
 * @param seconds - The time in seconds to format.
 * @returns A string in MM:SS format.
 */
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Converts an array of Annotation objects into TimelineMarkers.
 *
 * @param annotations - The annotations to convert.
 * @returns An array of TimelineMarker objects.
 */
export function annotationsToMarkers(annotations: Annotation[]): TimelineMarker[] {
    return annotations.map((a) => ({
        id: a.id,
        timestamp: a.timestamp,
        markerType: "drawing" as TimelineMarkerType,
        label: `${a.type} at ${formatTime(a.timestamp)}`,
    }));
}

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
 */
export function VideoTimeline({
    duration,
    currentTime,
    markers,
    onSeek,
}: VideoTimelineProps) {
    const barRef = useRef<HTMLDivElement>(null);

    /** Number of time labels to show based on duration. */
    const labelCount = Math.min(Math.floor(duration / 60) + 1, 8);
    const labelInterval = duration / labelCount;
    const timeLabels = Array.from({ length: labelCount + 1 }, (_, i) =>
        Math.round(i * labelInterval)
    );

    const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    /**
     * Handles click on the timeline bar to seek to a position.
     */
    function handleBarClick(e: React.MouseEvent<HTMLDivElement>) {
        const bar = barRef.current;
        if (!bar) return;
        const rect = bar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, x / rect.width));
        onSeek(ratio * duration);
    }

    return (
        <div className="w-full select-none">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Video Timeline &amp; Markers
            </p>

            {/* Time labels */}
            <div className="relative mb-1 flex justify-between text-xs text-muted-foreground">
                {timeLabels.map((t) => (
                    <span key={t}>{formatTime(t)}</span>
                ))}
            </div>

            {/* Timeline bar */}
            <div
                ref={barRef}
                onClick={handleBarClick}
                className="relative h-12 w-full cursor-pointer rounded-md bg-muted"
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
                    const color = MARKER_COLORS[marker.markerType];

                    return (
                        <Tooltip key={marker.id}>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSeek(marker.timestamp);
                                    }}
                                    className="absolute top-0 h-full w-0.5 -translate-x-1/2 cursor-pointer transition-opacity hover:opacity-80"
                                    style={{
                                        left: `${percent}%`,
                                        backgroundColor: color,
                                    }}
                                    aria-label={`Marker at ${formatTime(marker.timestamp)}`}
                                >
                                    {/* Marker pill at top */}
                                    <span
                                        className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5 text-xs font-semibold text-white"
                                        style={{ backgroundColor: color }}
                                    >
                                        {formatTime(marker.timestamp)}
                                    </span>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="font-medium">{formatTime(marker.timestamp)}</p>
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
                        <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: MARKER_COLORS[type] }}
                        />
                        <span className="text-xs text-muted-foreground">
                            {MARKER_LABELS[type]}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}