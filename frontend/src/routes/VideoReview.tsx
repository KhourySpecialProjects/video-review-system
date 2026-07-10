import { Suspense, useState } from "react";
import { useLoaderData } from "react-router";
import { LayoutGroup, motion } from "motion/react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionProvider, usePermission } from "@/contexts/PermissionContext";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";
import type { useVideoPlayer as useVideoPlayerType } from "@/hooks/useVideoPlayer";
import { useReviewShortcutActions } from "@/features/video/review/useReviewShortcutActions";
import { useReviewViewModel } from "@/features/video/review/useReviewViewModel";
import { ReviewVideoArea } from "@/features/video/review/ReviewVideoArea";
import { ReviewTimelineArea } from "@/features/video/review/ReviewTimelineArea";
import { ReviewDetailsSection } from "@/features/video/review/ReviewDetailsSection";
import { VideoMetadataSidebar } from "@/features/video/metadata/VideoMetadataSidebar";
import { AnnotationSidebar } from "@/features/sidebar/sidebar";
import { useSidebarMutations } from "@/features/sidebar/useSidebarMutations";
import { ClipMorphProvider } from "@/features/video/sequences/clipMorphContext";
import type { VideoReviewLoaderData } from "@/lib/video.service";

type PlayerState = ReturnType<typeof useVideoPlayerType>;

/**
 * @description Video review page orchestrator. The loader awaits only the
 * stream URL so the video paints immediately; annotation/clip/sequence
 * lists stream into the cache in the background and render behind a
 * Suspense skeleton.
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
 * @description Shell that renders the video player immediately using loader
 * data, and defers the data-dependent regions (timeline, annotation sidebar,
 * details strip) to `DataDependentRegions` behind a Suspense boundary.
 *
 * @param props - Component props
 */
function VideoReviewContent({ loaderData }: { loaderData: VideoReviewLoaderData }) {
  const { canWrite } = usePermission();
  const playerState = useVideoPlayer();
  const [activeSequenceId, setActiveSequenceId] = useState<string | null>(null);
  useReviewShortcutActions();

  return (
    <SidebarProvider className="!min-h-0 h-full">
      <VideoMetadataSidebar
        metadata={{
          patientId: loaderData.videoId,
          duration: loaderData.video.durationSeconds,
          recordedAt: loaderData.video.takenAt
            ? new Date(loaderData.video.takenAt)
            : new Date(loaderData.video.createdAt),
        }}
      />

      <SidebarInset className="relative overflow-hidden">
        <ClipMorphProvider>
          <LayoutGroup>
            <ResizablePanelGroup
              orientation="horizontal"
              className="min-h-0 flex-1 overflow-hidden"
            >
              <ResizablePanel defaultSize="75%" minSize="50%">
                <ResizablePanelGroup orientation="vertical">
                  <ResizablePanel defaultSize="70%" minSize="30%">
                    <motion.div
                      className="flex h-full flex-col gap-2 p-2"
                      initial={{ opacity: 0, y: -12, scale: 0.995 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
                    >
                      <Suspense fallback={<VideoAreaSkeleton />}>
                        <VideoAreaWithData
                          loaderData={loaderData}
                          playerState={playerState}
                          canWrite={canWrite}
                          activeSequenceId={activeSequenceId}
                        />
                      </Suspense>
                    </motion.div>
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  <ResizablePanel defaultSize="35%" minSize="25%">
                    <motion.div
                      className="h-full"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
                    >
                      <Suspense fallback={<TimelineSkeleton />}>
                        <TimelineWithData
                          loaderData={loaderData}
                          playerState={playerState}
                          activeSequenceId={activeSequenceId}
                          onActiveSequenceChange={setActiveSequenceId}
                        />
                      </Suspense>
                    </motion.div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                defaultSize="20%"
                minSize="15%"
                className="overflow-hidden bg-background"
              >
                <motion.div
                  className="h-full"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
                >
                  <Suspense fallback={<SidebarSkeleton />}>
                    <SidebarWithData
                      loaderData={loaderData}
                      playerState={playerState}
                      activeSequenceId={activeSequenceId}
                    />
                  </Suspense>
                </motion.div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </LayoutGroup>
        </ClipMorphProvider>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        >
          <ReviewDetailsSection disabled={!canWrite} />
        </motion.div>
      </SidebarInset>
    </SidebarProvider>
  );
}

type RegionProps = {
  loaderData: VideoReviewLoaderData;
  playerState: PlayerState;
  activeSequenceId: string | null;
};

/**
 * @description Video area enriched with seed annotations from the review view
 * model. Suspends until the annotations query resolves.
 *
 * @param props - Component props
 */
function VideoAreaWithData({
  loaderData,
  playerState,
  canWrite,
  activeSequenceId,
}: RegionProps & { canWrite: boolean }) {
  const vm = useReviewViewModel(loaderData, activeSequenceId);
  const mutations = useSidebarMutations(
    loaderData.videoId,
    playerState.currentTime,
    loaderData.studyId,
    loaderData.siteId,
  );
  return (
    <ReviewVideoArea
      src={loaderData.videoUrl}
      duration={loaderData.video.durationSeconds}
      poster={loaderData.imgUrl}
      playerState={playerState}
      canWrite={canWrite}
      savedAnnotations={vm.rawAnnotations}
      onAnnotationSaved={mutations.saveDrawing}
      onAnnotationDeleted={mutations.deleteDrawing}
    />
  );
}

/**
 * @description Timeline region consuming the review view model. Suspends
 * until annotations, clips, and sequences resolve.
 *
 * @param props - Component props
 */
function TimelineWithData({
  loaderData,
  playerState,
  activeSequenceId,
  onActiveSequenceChange,
}: RegionProps & { onActiveSequenceChange: (id: string | null) => void }) {
  const { canWrite, canAdmin } = usePermission();
  const vm = useReviewViewModel(loaderData, activeSequenceId);
  return (
    <ReviewTimelineArea
      duration={loaderData.video.durationSeconds}
      currentTime={playerState.currentTime}
      annotations={vm.canvasAnnotations}
      clips={vm.clips}
      sequences={vm.sequences}
      activeSequenceId={activeSequenceId}
      onActiveSequenceChange={onActiveSequenceChange}
      videoRef={playerState.videoRef}
      onSeek={playerState.handleSeek}
      videoId={loaderData.videoId}
      studyId={loaderData.studyId}
      siteId={loaderData.siteId}
      canWrite={canWrite}
      canAdmin={canAdmin}
    />
  );
}

/**
 * @description Annotation sidebar region consuming the review view model.
 * Suspends until annotations, clips, and sequences resolve.
 *
 * @param props - Component props
 */
function SidebarWithData({ loaderData, playerState, activeSequenceId }: RegionProps) {
  const vm = useReviewViewModel(loaderData, activeSequenceId);
  return (
    <AnnotationSidebar
      currentVideoTime={playerState.currentTime}
      videoId={loaderData.videoId}
      studyId={loaderData.studyId}
      siteId={loaderData.siteId}
      clips={vm.sidebarClips}
      notes={vm.sidebarNotes}
      drawings={vm.drawings}
      onJumpToTime={playerState.handleSeek}
      onAddClipToSequence={
        vm.activeSequence ? vm.handleAddClipToSequence : undefined
      }
    />
  );
}

/**
 * @description Skeleton placeholder for the video area while annotations load.
 */
function VideoAreaSkeleton() {
  return (
    <div className="relative flex h-full min-h-0 items-center justify-center overflow-hidden rounded-md bg-black">
      <Skeleton className="h-full w-full" />
    </div>
  );
}

/**
 * @description Skeleton placeholder for the timeline region.
 */
function TimelineSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

/**
 * @description Skeleton placeholder for the annotation sidebar.
 */
function SidebarSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
