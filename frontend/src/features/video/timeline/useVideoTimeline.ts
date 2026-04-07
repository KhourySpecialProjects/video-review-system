import { formatDuration } from "@/lib/format";
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
 * Tailwind background color classes for each marker type.
 */
export const MARKER_COLORS: Record<TimelineMarkerType, string> = {
    "drawing": "bg-red-500",
    "timestamp-comment": "bg-amber-400",
};

/**
 * Human-readable labels for each marker type shown in the legend.
 */
export const MARKER_LABELS: Record<TimelineMarkerType, string> = {
    "drawing": "Drawing",
    "timestamp-comment": "Timestamp Comment",
};

/**
 * Builds the array of time label values to display under the timeline.
 *
 * @param duration - Total video duration in seconds.
 * @returns Array of evenly-spaced timestamps (in seconds) to label.
 */
export function buildTimeLabels(duration: number): number[] {
    const labelCount = Math.min(Math.floor(duration / 60) + 1, 8);
    const labelInterval = duration / labelCount;
    return Array.from({ length: labelCount + 1 }, (_, i) =>
        Math.round(i * labelInterval)
    );
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
        label: `${a.type} at ${formatDuration(Math.floor(a.timestamp))}`,
    }));
}
