import { useRef, useState, useEffect } from "react";
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { ClipTimeline } from "@/features/video/clips/ClipTimeline";
import { useClipTimeline } from "@/features/video/clips/useClipTimeline";
import { GeneralNotes } from "@/features/annotate/video-summary/comment/GeneralNotes";
import { useGeneralNotes } from "@/features/annotate/video-summary/comment/useGeneralNotes";
import { TagManager } from "@/features/annotate/video-summary/tags/TagManager";
import { useTagManager } from "@/features/annotate/video-summary/tags/useTagManager";
import { useTags } from "@/features/annotate/video-summary/tags/useTags";
import { useAnnotationState } from "@/features/video/annotations/useAnnotationState";
import { AnnotationCanvas } from "@/features/video/annotations/drawing/canvas/AnnotationCanvas";
import { AnnotationToolbar } from "@/features/video/annotations/drawing/toolbar/AnnotationToolbar";
import { VideoMetadataSidebar } from "@/features/video/metadata/VideoMetadataSidebar";
import type { AnnotationTool, DrawingSettings } from "@/features/video/annotations/types";

export default function VideoReview() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);

    const timeline = useClipTimeline(120, videoRef, (clip) => {
        console.log("Clip created:", clip);
    });

    const [detailsDisabled] = useState(false);
    const { notes, setNotes } = useGeneralNotes();
    const { tags, addTag, removeTag, editTag } = useTags();
    const tagManager = useTagManager({ onAddTag: addTag, onEditTag: editTag });
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

                {/* Left metadata sidebar */}
                <ResizablePanel defaultSize="15%" minSize="10%">
                    <VideoMetadataSidebar
                        metadata={{
                            patientId: "PT-2024-1547",
                            duration: 272,
                            recordedAt: new Date("2026-03-08T10:30:00"),
                        }}
                    />
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Main content: video on top, timeline on bottom */}
                <ResizablePanel defaultSize="65%" minSize="50%">
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
            <div className="my-4">
                <div className="rounded-xl bg-bg-light shadow-l">
                    <div className="px-6 pt-5 pb-2">
                        <h2 className="text-xl font-semibold text-text">Video Details</h2>
                    </div>
                    <div className="flex gap-0 p-6">
                        <div className="flex-1 pr-6">
                            <GeneralNotes
                                value={notes}
                                onChange={setNotes}
                                disabled={detailsDisabled}
                            />
                        </div>
                        <Separator orientation="vertical" className="self-stretch" />
                        <div className="flex-1 pl-6">
                            <TagManager
                                tags={tags}
                                onRemoveTag={removeTag}
                                disabled={detailsDisabled}
                                manager={tagManager}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}