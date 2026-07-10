import { Suspense } from "react";
import { useNavigation, Link, useLoaderData, useLocation } from "react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import type { VideoViewLoaderData } from "@/lib/video.service";
import { videoStreamQuery } from "@/lib/video.service";
import { VideoPlayer, VideoPlayerSkeleton } from "@/features/video/videoPlayer/VideoPlayer";
import {
    VideoDetailsSidebar,
    VideoDetailsSidebarSkeleton,
} from "@/features/video/videoDetails/VideoDetailsSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

// ── Component ─────────────────────────────────────────────────────────────

/**
 * @description Video detail page. The loader prefetches stream data into
 * TanStack Query; the shell renders immediately and the data-dependent
 * region streams in via Suspense. The player's motion wrapper lives at
 * this top level (not inside Suspense) so the shared-layout morph from
 * the home grid's VideoCard has a stable, continuous target from the
 * moment navigation starts — removing the brief "flicker" that happened
 * when the Suspense fallback replaced the layoutId target.
 */
export default function VideoView() {
    const { videoId } = useLoaderData() as VideoViewLoaderData;
    const location = useLocation();
    const isPortrait = Boolean((location.state as { isPortrait?: boolean } | null)?.isPortrait);

    return (
        <div className="flex flex-col gap-6">
            {/* Back button */}
            <Link
                to="/"
                className="inline-flex w-fit items-center gap-2 rounded-md px-2.5 h-8 text-sm font-medium text-text-muted hover:text-text hover:bg-muted transition-all"
            >
                <ArrowLeft className="size-4" />
                Back to videos
            </Link>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
                {/* Motion wrapper lives above Suspense so the shared-layout
                    morph from the home grid has a stable target as soon as
                    the route mounts. The aspect is committed up-front from
                    router state (isPortrait is passed from the VideoCard),
                    so the morph lands at its final size — no late expand
                    when the VideoPlayer swaps in. `layoutDependency` pins
                    the layout animation to `videoId`; subsequent renders
                    that change children (Suspense resolving) don't retrigger
                    the layout animation. */}
                <motion.div
                    layoutId={`video-${videoId}`}
                    layoutDependency={videoId}
                    transition={{ type: "spring", stiffness: 260, damping: 32 }}
                    className={cn(
                        "relative overflow-hidden rounded-xl bg-black",
                        isPortrait ? "aspect-9/16 md:aspect-video" : "aspect-video",
                    )}
                >
                    <Suspense fallback={<Skeleton className="absolute inset-0 rounded-xl" />}>
                        <VideoPlayerLoader videoId={videoId} />
                    </Suspense>
                </motion.div>
                <Suspense fallback={<VideoDetailsSidebarSkeleton />}>
                    <VideoDetailsLoader videoId={videoId} />
                </Suspense>
            </div>
        </div>
    );
}

/**
 * @description Data-dependent player region. Reads the stream URL from the
 * TanStack Query cache populated by the loader's `prefetchQuery` call.
 *
 * Passes `fill` so the player fills the parent motion wrapper and
 * inherits its committed aspect ratio. Without `fill`, the VideoPlayer
 * applies its OWN aspect class (which flips to `aspect-9/16` on mobile
 * once the video metadata reports portrait) — that internal flip races
 * with the outer motion wrapper's aspect and produces a visible layout
 * shift right after the poster/video finish loading.
 *
 * @param videoId - The video UUID from the loader
 */
function VideoPlayerLoader({ videoId }: { videoId: string }) {
    const { data: { video, videoUrl, imgUrl } } = useSuspenseQuery(videoStreamQuery(videoId));
    return (
        <VideoPlayer
            src={videoUrl}
            duration={video.durationSeconds}
            poster={imgUrl}
            fill
        />
    );
}

/**
 * @description Data-dependent sidebar region. Reads the video metadata
 * from the TanStack Query cache.
 *
 * @param videoId - The video UUID from the loader
 */
function VideoDetailsLoader({ videoId }: { videoId: string }) {
    const { data: { video } } = useSuspenseQuery(videoStreamQuery(videoId));
    const navigation = useNavigation();
    const isSaving = navigation.state === "submitting" || navigation.state === "loading";
    return <VideoDetailsSidebar video={video} isSaving={isSaving} />;
}

/**
 * @description Full-page skeleton for the video view page. Kept available
 * as a HydrateFallback / deferred-loader placeholder for the route config.
 */
export function VideoViewSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <Skeleton className="h-8 w-32" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
                <VideoPlayerSkeleton />
                <VideoDetailsSidebarSkeleton />
            </div>
        </div>
    );
}
