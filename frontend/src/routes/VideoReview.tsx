import { useRef, useState } from "react";
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

export default function VideoReview() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const timeline = useClipTimeline(120, videoRef, (clip) => {
        console.log("Clip created:", clip);
    });

    const [detailsDisabled] = useState(false);
    const { notes, setNotes } = useGeneralNotes();
    const { tags, addTag, removeTag, editTag } = useTags();
    const tagManager = useTagManager({ onAddTag: addTag, onEditTag: editTag });

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
