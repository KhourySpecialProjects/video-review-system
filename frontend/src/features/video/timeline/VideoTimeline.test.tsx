import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
    VideoTimeline,
    annotationsToMarkers,
    type TimelineMarker,
} from "./VideoTimeline";
import type { Annotation } from "@/features/video/annotations/types";

/** Helper to render VideoTimeline wrapped in TooltipProvider */
function renderTimeline(props: {
    duration: number;
    currentTime: number;
    markers: TimelineMarker[];
    onSeek?: (time: number) => void;
}) {
    return render(
        <TooltipProvider>
            <VideoTimeline
                duration={props.duration}
                currentTime={props.currentTime}
                markers={props.markers}
                onSeek={props.onSeek ?? vi.fn()}
            />
        </TooltipProvider>
    );
}

describe("VideoTimeline", () => {
    it("renders the timeline heading", () => {
        renderTimeline({ duration: 120, currentTime: 0, markers: [] });
        expect(screen.getByText(/video timeline/i)).toBeInTheDocument();
    });

    it("renders with no markers without crashing", () => {
        renderTimeline({ duration: 120, currentTime: 0, markers: [] });
        expect(screen.queryAllByRole("button")).toHaveLength(0);
    });

    it("renders a marker for each entry", () => {
        const markers: TimelineMarker[] = [
            { id: "1", timestamp: 30, markerType: "drawing" },
            { id: "2", timestamp: 60, markerType: "timestamp-comment" },
        ];
        renderTimeline({ duration: 120, currentTime: 0, markers });
        const buttons = screen.getAllByRole("button");
        expect(buttons).toHaveLength(2);
    });

    it("calls onSeek with the marker timestamp when a marker is clicked", () => {
        const onSeek = vi.fn();
        const markers: TimelineMarker[] = [
            { id: "1", timestamp: 45, markerType: "drawing" },
        ];
        renderTimeline({ duration: 120, currentTime: 0, markers, onSeek });
        fireEvent.click(screen.getByRole("button", { name: /marker at 0:45/i }));
        expect(onSeek).toHaveBeenCalledWith(45);
    });

    it("renders the legend with both marker types", () => {
        renderTimeline({ duration: 120, currentTime: 0, markers: [] });
        expect(screen.getByText("Drawing")).toBeInTheDocument();
        expect(screen.getByText("Timestamp Comment")).toBeInTheDocument();
    });

    it("renders time labels based on duration", () => {
        renderTimeline({ duration: 120, currentTime: 0, markers: [] });
        expect(screen.getByText("0:00")).toBeInTheDocument();
        expect(screen.getByText("2:00")).toBeInTheDocument();
    });
});

describe("annotationsToMarkers", () => {
    it("converts an empty array to an empty array", () => {
        expect(annotationsToMarkers([])).toHaveLength(0);
    });

    it("converts annotations to markers with correct timestamps", () => {
        const annotations: Annotation[] = [
            {
                id: "a1",
                type: "freehand",
                timestamp: 30,
                duration: 5,
                settings: { color: "#ff0000", brushSize: 0.005 },
                points: [],
            },
        ];
        const markers = annotationsToMarkers(annotations);
        expect(markers).toHaveLength(1);
        expect(markers[0].timestamp).toBe(30);
        expect(markers[0].markerType).toBe("drawing");
        expect(markers[0].id).toBe("a1");
    });

    it("handles multiple annotation types", () => {
        const annotations: Annotation[] = [
            {
                id: "a1",
                type: "freehand",
                timestamp: 10,
                duration: 5,
                settings: { color: "#ff0000", brushSize: 0.005 },
                points: [],
            },
            {
                id: "a2",
                type: "circle",
                timestamp: 20,
                duration: 5,
                settings: { color: "#00ff00", brushSize: 0.005 },
                center: { x: 0.5, y: 0.5 },
                radiusX: 0.1,
                radiusY: 0.1,
            },
        ];
        const markers = annotationsToMarkers(annotations);
        expect(markers).toHaveLength(2);
        expect(markers[0].markerType).toBe("drawing");
        expect(markers[1].markerType).toBe("drawing");
    });
});