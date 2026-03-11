import { useNavigation, useSubmit, Link } from "react-router";
import { VideoPlayer, VideoPlayerSkeleton } from "@/features/video/videoPlayer/VideoPlayer";
import {
    VideoDetailsSidebar,
    VideoDetailsSidebarSkeleton,
} from "@/features/video/videoDetails/VideoDetailsSidebar";
import { ArrowLeft } from "lucide-react";
import { fetchVideoById, updateVideo } from "@/lib/mock-data";
import type { Route } from "./+types/video-view";

// ── Route Module Exports ──────────────────────────────────────────────────

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
    const video = await fetchVideoById(params.videoId);
    if (!video) {
        throw new Response("Video not found", { status: 404 });
    }
    return { video };
}

export async function clientAction({ params, request }: Route.ClientActionArgs) {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    await updateVideo(params.videoId, { title, description });
    return { success: true };
}

// ── Component ─────────────────────────────────────────────────────────────

export default function VideoView({ loaderData }: Route.ComponentProps) {
    const { video } = loaderData;
    const navigation = useNavigation();
    const submit = useSubmit();

    const isSaving = navigation.state === "submitting";

    const handleSave = (data: { title: string; description: string }) => {
        submit(
            { title: data.title, description: data.description },
            { method: "post" }
        );
    };

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
                <VideoPlayer
                    src={video.videoUrl}
                    duration={video.duration}
                    poster={video.thumbnailUrl || undefined}
                />
                <VideoDetailsSidebar
                    video={video}
                    onSave={handleSave}
                    isSaving={isSaving}
                />
            </div>
        </div>
    );
}

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
