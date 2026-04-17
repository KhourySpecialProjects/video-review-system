import { useNavigation, Link, useLoaderData } from "react-router";
import { motion } from "motion/react";
import type { VideoViewLoaderData } from "@/lib/video.service";
import { VideoPlayer, VideoPlayerSkeleton } from "@/features/video/videoPlayer/VideoPlayer";
import {
    VideoDetailsSidebar,
    VideoDetailsSidebarSkeleton,
} from "@/features/video/videoDetails/VideoDetailsSidebar";
import { ArrowLeft } from "lucide-react";

// ── Component ─────────────────────────────────────────────────────────────

/**
 * @description Video detail page. Displays the video player with a sidebar
 * for editing title/description. The player area uses a shared motion
 * layoutId for a portal-style transition from the video card thumbnail.
 */
export default function VideoView() {
    const { video, videoUrl, imgUrl } = useLoaderData() as VideoViewLoaderData;
    const navigation = useNavigation();

    const isSaving = navigation.state === "submitting" || navigation.state === "loading";

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

            {/* Player + Sidebar layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
                <motion.div
                    layoutId={`video-${video.id}`}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="overflow-hidden rounded-xl"
                >
                    <VideoPlayer
                        src={videoUrl}
                        duration={video.durationSeconds}
                        poster={imgUrl}
                    />
                </motion.div>
                <VideoDetailsSidebar
                    video={video}
                    isSaving={isSaving}
                />
            </div>
        </div>
    );
}

/**
 * @description Skeleton placeholder for the video view page while loading.
 */
export function VideoViewSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="h-8 w-32" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
                <VideoPlayerSkeleton />
                <VideoDetailsSidebarSkeleton />
            </div>
        </div>
    );
}
