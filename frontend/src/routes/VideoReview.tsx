import { Suspense } from "react";
import { useLoaderData, Await } from "react-router";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { PermissionProvider, usePermission } from "@/contexts/PermissionContext";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";
import { useReviewKeyboardShortcuts } from "@/features/video/review/useReviewKeyboardShortcuts";
import { ReviewVideoArea } from "@/features/video/review/ReviewVideoArea";
import { ReviewTimelineArea } from "@/features/video/review/ReviewTimelineArea";
import { ReviewDetailsSection } from "@/features/video/review/ReviewDetailsSection";
import { VideoMetadataSidebar } from "@/features/video/metadata/VideoMetadataSidebar";
import { AnnotationSidebar } from "@/features/sidebar/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import type { VideoReviewLoaderData } from "@/lib/video.service";

/**
 * @description Video review page orchestrator. Uses loader data for video
 * streaming, defers annotations/clips/sequences, and delegates rendering
 * to focused sub-components.
 */
export default function VideoReview() {
  const loaderData = useLoaderData() as VideoReviewLoaderData;

  return (
    <PermissionProvider level={loaderData.permissionLevel}>
      <VideoReviewContent loaderData={loaderData} />
    </PermissionProvider>
  );
}

/**
 * @description Inner content component that has access to permission context.
 * Separated so usePermission can be called after PermissionProvider wraps it.
 */
function VideoReviewContent({
  loaderData,
}: {
  loaderData: VideoReviewLoaderData;
}) {
  const { canWrite, canAdmin } = usePermission();
  const playerState = useVideoPlayer();

  /** @description Toggles drawing mode on the video area. */
  function toggleDrawing() {
    document.dispatchEvent(new CustomEvent("review:toggle-drawing"));
  }

  /** @description Opens the timestamped comment input in the sidebar. */
  function addTimestampedComment() {
    // The sidebar's useSidebarMutations hook handles note creation via fetcher
    // This keyboard shortcut triggers the same flow
    document.dispatchEvent(new CustomEvent("review:add-comment"));
  }

  useReviewKeyboardShortcuts({
    onToggleDrawing: toggleDrawing,
    onAddComment: addTimestampedComment,
  });

  return (
    <SidebarProvider className="h-screen overflow-hidden">
      <VideoMetadataSidebar
        metadata={{
          patientId: loaderData.video.id,
          duration: loaderData.video.durationSeconds,
          recordedAt: loaderData.video.takenAt
            ? new Date(loaderData.video.takenAt)
            : new Date(loaderData.video.createdAt),
        }}
      />

      <SidebarInset className="flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border p-2">
          <SidebarTrigger />
        </div>

        <ResizablePanelGroup
          orientation="horizontal"
          className="flex-1 overflow-hidden"
        >
          {/* Main content: video on top, timeline on bottom */}
          <ResizablePanel defaultSize="75%" minSize="50%">
            <ResizablePanelGroup orientation="vertical">
              {/* Video player + annotation overlay */}
              <ResizablePanel defaultSize="70%" minSize="30%">
                <div className="flex h-full flex-col gap-2 p-2">
                  <ReviewVideoArea
                    src={loaderData.videoUrl}
                    duration={loaderData.video.durationSeconds}
                    poster={loaderData.imgUrl}
                    playerState={playerState}
                    canWrite={canWrite}
                  />
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Bottom: timeline + clip timeline */}
              <ResizablePanel defaultSize="30%" minSize="10%">
                <Suspense fallback={<TimelineSkeleton />}>
                  <Await
                    resolve={Promise.all([
                      loaderData.annotationsPromise,
                      loaderData.clipsPromise,
                      loaderData.sequencesPromise,
                    ])}
                  >
                    {([annotations, clips, sequences]) => (
                      <ReviewTimelineArea
                        duration={loaderData.video.durationSeconds}
                        currentTime={playerState.currentTime}
                        annotations={[]}
                        clips={clips}
                        sequences={sequences}
                        videoRef={playerState.videoRef}
                        onSeek={playerState.handleSeek}
                        videoId={loaderData.video.id}
                        studyId="placeholder"
                        siteId="placeholder"
                        canWrite={canWrite}
                        canAdmin={canAdmin}
                      />
                    )}
                  </Await>
                </Suspense>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right sidebar — owns its own mutation fetchers */}
          <ResizablePanel
            defaultSize="20%"
            minSize="15%"
            className="overflow-hidden bg-background"
          >
            <AnnotationSidebar
              currentVideoTime={playerState.currentTime}
              videoId={loaderData.video.id}
              clips={[]}
              drawings={[]}
              onJumpToTime={playerState.handleSeek}
            />
          </ResizablePanel>
        </ResizablePanelGroup>

        <ReviewDetailsSection disabled={!canWrite} />
      </SidebarInset>
    </SidebarProvider>
  );
}

/**
 * @description Skeleton placeholder for the timeline area while deferred data loads.
 */
function TimelineSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <Skeleton className="h-8 w-full rounded-md" />
      <Skeleton className="h-16 w-full rounded-md" />
      <Skeleton className="h-16 w-full rounded-md" />
    </div>
  );
}
