import { Suspense, useState } from "react";
import { Await, useLoaderData } from "react-router";
import { LayoutGroup } from "motion/react";
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
import { toast } from "sonner";
import { PermissionProvider, usePermission } from "@/contexts/PermissionContext";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";
import { useReviewKeyboardShortcuts } from "@/features/video/review/useReviewKeyboardShortcuts";
import { ReviewVideoArea, toCanvasAnnotation, toNoteAnnotation } from "@/features/video/review/ReviewVideoArea";
import { ReviewTimelineArea } from "@/features/video/review/ReviewTimelineArea";
import { ReviewDetailsSection } from "@/features/video/review/ReviewDetailsSection";
import { VideoMetadataSidebar } from "@/features/video/metadata/VideoMetadataSidebar";
import { AnnotationSidebar } from "@/features/sidebar/sidebar";
import type { DrawingToolType } from "@/features/sidebar/DrawingCard";
import type { VideoReviewLoaderData } from "@/lib/video.service";
import { useSidebarMutations } from "@/features/sidebar/useSidebarMutations";
import { useSequenceFetcher } from "@/features/video/sequences/useSequences";
import { ClipMorphProvider } from "@/features/video/sequences/clipMorphContext";
import type { AnnotationListItem } from "@shared/annotation";
import type { Clip } from "@shared/clip";
import type { Sequence } from "@shared/sequence";
import type { useVideoPlayer as useVideoPlayerType } from "@/hooks/useVideoPlayer";

type SidebarData = {
  annotations: AnnotationListItem[];
  clips: Clip[];
  sequences: Sequence[];
};

/**
 * @description Video review page orchestrator. Awaits only the stream URL in
 * the loader so the video and poster paint immediately; annotations, clips,
 * and sequences stream in via `<Await>` + `<Suspense>`.
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
  const [activeSequenceId, setActiveSequenceId] = useState<string | null>(null);

  /** @description Toggles drawing mode on the video area. */
  function toggleDrawing() {
    document.dispatchEvent(new CustomEvent("review:toggle-drawing"));
  }

  /** @description Opens the timestamped comment input in the sidebar. */
  function addTimestampedComment() {
    document.dispatchEvent(new CustomEvent("review:add-comment"));
  }

  useReviewKeyboardShortcuts({
    onToggleDrawing: toggleDrawing,
    onAddComment: addTimestampedComment,
  });

  const sidebarDataPromise: Promise<SidebarData> = Promise.all([
    loaderData.annotationsPromise,
    loaderData.clipsPromise,
    loaderData.sequencesPromise,
  ]).then(([annotations, clips, sequences]) => ({ annotations, clips, sequences }));

  return (
    // SidebarProvider locks to main's height (h-full) so the review UI
    // fills the viewport exactly. `!min-h-0` cancels shadcn's default
    // `min-h-svh` which would otherwise make it 100svh regardless of
    // where it sits. ReviewDetailsSection is a sibling *below* the
    // provider so main's `overflow-auto` scrolls to reveal it.
    <>
      <SidebarProvider className="!min-h-0 h-full">
        <VideoMetadataSidebar
          metadata={{
            patientId: loaderData.video.id,
            duration: loaderData.video.durationSeconds,
            recordedAt: loaderData.video.takenAt
              ? new Date(loaderData.video.takenAt)
              : new Date(loaderData.video.createdAt),
          }}
        />

        <SidebarInset className="relative">
          <SidebarTrigger className="absolute left-2 top-2 z-30 bg-background/80 shadow-sm backdrop-blur" />

          <ClipMorphProvider>
          <LayoutGroup>
          <ResizablePanelGroup
            orientation="horizontal"
            className="h-full overflow-hidden"
          >
            <ResizablePanel defaultSize="75%" minSize="50%">
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel defaultSize="70%" minSize="30%">
                  <div className="flex h-full flex-col gap-2 p-2">
                    <Suspense
                      fallback={
                        <ReviewVideoArea
                          src={loaderData.videoUrl}
                          duration={loaderData.video.durationSeconds}
                          poster={loaderData.imgUrl}
                          playerState={playerState}
                          canWrite={canWrite}
                        />
                      }
                    >
                      <Await resolve={loaderData.annotationsPromise}>
                        {(annotations: AnnotationListItem[]) => (
                          <HydratedVideoArea
                            videoId={loaderData.video.id}
                            studyId={loaderData.studyId}
                            siteId={loaderData.siteId}
                            videoUrl={loaderData.videoUrl}
                            imgUrl={loaderData.imgUrl}
                            duration={loaderData.video.durationSeconds}
                            playerState={playerState}
                            canWrite={canWrite}
                            annotations={annotations}
                          />
                        )}
                      </Await>
                    </Suspense>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize="30%" minSize="10%">
                  <Suspense fallback={<TimelineAreaFallback />}>
                    <Await resolve={sidebarDataPromise}>
                      {({ annotations, clips, sequences }: SidebarData) => (
                        <ReviewTimelineArea
                          duration={loaderData.video.durationSeconds}
                          currentTime={playerState.currentTime}
                          annotations={annotations.flatMap((item) => {
                            const a = toCanvasAnnotation(item);
                            return a ? [a] : [];
                          })}
                          clips={clips}
                          sequences={sequences}
                          activeSequenceId={activeSequenceId}
                          onActiveSequenceChange={setActiveSequenceId}
                          videoRef={playerState.videoRef}
                          onSeek={playerState.handleSeek}
                          videoId={loaderData.video.id}
                          studyId={loaderData.studyId}
                          siteId={loaderData.siteId}
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

            <ResizablePanel
              defaultSize="20%"
              minSize="15%"
              className="overflow-hidden bg-background"
            >
              <Suspense
                fallback={
                  <AnnotationSidebar
                    isLoading
                    currentVideoTime={playerState.currentTime}
                    videoId={loaderData.video.id}
                    studyId={loaderData.studyId}
                    siteId={loaderData.siteId}
                    onJumpToTime={playerState.handleSeek}
                  />
                }
              >
                <Await resolve={sidebarDataPromise}>
                  {({ annotations, clips, sequences }: SidebarData) => (
                    <HydratedSidebar
                      annotations={annotations}
                      clips={clips}
                      sequences={sequences}
                      activeSequenceId={activeSequenceId}
                      currentVideoTime={playerState.currentTime}
                      videoId={loaderData.video.id}
                      studyId={loaderData.studyId}
                      siteId={loaderData.siteId}
                      onJumpToTime={playerState.handleSeek}
                    />
                  )}
                </Await>
              </Suspense>
            </ResizablePanel>
          </ResizablePanelGroup>
          </LayoutGroup>
          </ClipMorphProvider>
        </SidebarInset>
      </SidebarProvider>

      <ReviewDetailsSection disabled={!canWrite} />
    </>
  );
}

/**
 * @description Video area that hydrates once annotations have streamed in.
 * Owns the saveDrawing mutation so the player can persist new strokes.
 */
function HydratedVideoArea({
  videoId,
  studyId,
  siteId,
  videoUrl,
  imgUrl,
  duration,
  playerState,
  canWrite,
  annotations,
}: {
  videoId: string;
  studyId: string;
  siteId: string;
  videoUrl: string;
  imgUrl: string;
  duration: number;
  playerState: ReturnType<typeof useVideoPlayerType>;
  canWrite: boolean;
  annotations: AnnotationListItem[];
}) {
  const mutations = useSidebarMutations(videoId, playerState.currentTime, studyId, siteId);
  return (
    <ReviewVideoArea
      src={videoUrl}
      duration={duration}
      poster={imgUrl}
      playerState={playerState}
      canWrite={canWrite}
      initialAnnotations={annotations}
      onAnnotationSaved={mutations.saveDrawing}
    />
  );
}

/**
 * @description Sidebar variant rendered once annotations/clips/sequences
 * have streamed in. Computes the derived view-models that the sidebar
 * and "add to sequence" action need.
 */
function HydratedSidebar({
  annotations,
  clips,
  sequences,
  activeSequenceId,
  currentVideoTime,
  videoId,
  studyId,
  siteId,
  onJumpToTime,
}: {
  annotations: AnnotationListItem[];
  clips: Clip[];
  sequences: Sequence[];
  activeSequenceId: string | null;
  currentVideoTime: number;
  videoId: string;
  studyId: string;
  siteId: string;
  onJumpToTime: (time: number) => void;
}) {
  const sequenceFetcher = useSequenceFetcher();
  const activeSequence = sequences.find((s) => s.id === activeSequenceId) ?? null;

  const sidebarNotes = annotations.flatMap((item) => {
    const n = toNoteAnnotation(item);
    return n ? [n] : [];
  });
  const drawings = annotations
    .flatMap((item) => {
      const a = toCanvasAnnotation(item);
      return a ? [a] : [];
    })
    .map((a) => ({
      id: a.id,
      type: a.type as DrawingToolType,
      color: a.settings.color,
      timestamp: a.timestamp,
      duration: a.duration,
    }));
  const sidebarClips = clips.map((c) => ({
    id: c.id,
    title: c.title,
    startMs: c.startTimeS,
    endMs: c.endTimeS,
    themeColor: c.themeColor,
  }));

  /**
   * @description Adds a clip to the active sequence via the /sequences
   * resource route. Persists through the sequences action handler.
   *
   * @param clipId - ID of the clip to add
   */
  function handleAddClipToSequence(clipId: string) {
    if (!activeSequence) {
      toast.info("Select a sequence first");
      return;
    }
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;
    const items = activeSequence.items ?? [];
    if (items.some((i) => i.clipId === clipId)) {
      toast.info("Clip is already in this sequence");
      return;
    }
    sequenceFetcher.addClipToSequence(activeSequence.id, clip, {
      ...activeSequence,
      items,
    });
  }

  return (
    <AnnotationSidebar
      currentVideoTime={currentVideoTime}
      videoId={videoId}
      studyId={studyId}
      siteId={siteId}
      clips={sidebarClips}
      notes={sidebarNotes}
      drawings={drawings}
      onJumpToTime={onJumpToTime}
      onAddClipToSequence={activeSequence ? handleAddClipToSequence : undefined}
    />
  );
}

/**
 * @description Placeholder for the timeline area shown while clips and
 * sequences stream in. Kept intentionally minimal — the critical UI is
 * the player above it.
 */
function TimelineAreaFallback() {
  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden p-4">
      <div className="h-10 w-full animate-pulse rounded bg-muted" />
      <div className="h-12 w-full animate-pulse rounded bg-muted" />
      <div className="h-16 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}
