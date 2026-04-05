import { useRef, useState, useEffect } from "react";
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable";
import { ClipTimeline } from "@/features/video/clips/ClipTimeline";
import { useClipTimeline } from "@/features/video/clips/useClipTimeline";
import { useAnnotationState } from "@/features/video/annotations/useAnnotationState";
import { AnnotationCanvas } from "@/features/video/annotations/drawing/canvas/AnnotationCanvas";
import { AnnotationToolbar } from "@/features/video/annotations/drawing/toolbar/AnnotationToolbar";
import type { AnnotationTool, DrawingSettings } from "@/features/video/annotations/types";

export default function VideoReview() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);

    const timeline = useClipTimeline(120, videoRef, (clip) => {
        console.log("Clip created:", clip);
    });

    const annotationState = useAnnotationState();
    const [tool, setTool] = useState<AnnotationTool>("freehand");
    const [settings, setSettings] = useState<DrawingSettings>({
        color: "#ef4444",
        brushSize: 0.005,
    });
    const [drawingEnabled, setDrawingEnabled] = useState(true);
    const [videoCurrentTime, setVideoCurrentTime] = useState(0);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onTimeUpdate = () => setVideoCurrentTime(video.currentTime);
        video.addEventListener("timeupdate", onTimeUpdate);
        return () => video.removeEventListener("timeupdate", onTimeUpdate);
    }, []);

    return (
        <>
            {/* Resizable editor — takes the full viewport area */}
            <ResizablePanelGroup orientation="horizontal" className="h-full shrink-0">
                {/* Main content: video on top, timeline on bottom */}
                <ResizablePanel defaultSize="80%" minSize="60%">
                    <ResizablePanelGroup orientation="vertical">
                        {/* Video player + annotation overlay */}
                        <ResizablePanel defaultSize="70%" minSize="30%">
                            <div className="flex h-full flex-col gap-2 p-2">
                                <AnnotationToolbar
                                    tool={tool}
                                    onToolChange={setTool}
                                    settings={settings}
                                    onSettingsChange={setSettings}
                                    onUndo={annotationState.undo}
                                    onClear={annotationState.clear}
                                    canUndo={annotationState.annotations.length > 0}
                                    canClear={annotationState.annotations.length > 0}
                                />
                                <div
                                    ref={videoContainerRef}
                                    className="relative flex-1 overflow-hidden rounded-md bg-black"
                                >
                                    <video
                                        ref={videoRef}
                                        src="/sample.mp4"
                                        className="h-full w-full object-contain"
                                        controls
                                        playsInline
                                    />
                                    <AnnotationCanvas
                                        containerRef={videoContainerRef}
                                        state={annotationState}
                                        videoCurrentTime={videoCurrentTime}
                                        tool={tool}
                                        settings={settings}
                                        enabled={drawingEnabled}
                                    />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <input
                                        type="checkbox"
                                        checked={drawingEnabled}
                                        onChange={(e) => setDrawingEnabled(e.target.checked)}
                                    />
                                    Drawing mode (uncheck to interact with video controls)
                                </label>
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle />

                        {/* Bottom: timeline + clip timeline */}
                        <ResizablePanel defaultSize="30%" minSize="10%">
                            <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
                                {/* Timeline (stub) */}
                                <div className="flex h-12 shrink-0 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
                                    Timeline
                                </div>

                                <ClipTimeline duration={120} timeline={timeline} />
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right sidebar — full height */}
                <ResizablePanel defaultSize="20%" minSize="15%">
                    <div className="flex h-full items-center justify-center rounded-md bg-muted text-muted-foreground">
                        Sidebar
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>

            {/* Video details — below the fold, visible on scroll */}
            <div className="flex min-h-96 my-4 items-center justify-center rounded-md bg-muted text-muted-foreground">
                Video Details
            </div>
        </>
    );
}
