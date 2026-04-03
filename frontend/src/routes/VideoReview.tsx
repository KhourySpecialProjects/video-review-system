import { useRef } from "react";
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable";
import { ClipTimeline } from "@/features/video/clips/ClipTimeline";
import { useClipTimeline } from "@/features/video/clips/useClipTimeline";

export default function VideoReview() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const timeline = useClipTimeline(120, videoRef, (clip) => {
        console.log("Clip created:", clip);
    });

    return (
        <>
            {/* Resizable editor — takes the full viewport area */}
            <ResizablePanelGroup orientation="horizontal" className="h-full shrink-0">
                {/* Main content: video on top, timeline on bottom */}
                <ResizablePanel defaultSize="80%" minSize="60%">
                    <ResizablePanelGroup orientation="vertical">
                        {/* Video player (stub) */}
                        <ResizablePanel defaultSize="70%" minSize="30%">
                            <div className="flex h-full items-center justify-center rounded-md bg-muted text-muted-foreground">
                                Video Player
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
