import { useState, Suspense } from "react";
import { Await, useMatches, useLoaderData, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import type { Video } from "@/lib/types";
import { WelcomeCard, WelcomeCardSkeleton } from "@/features/dashboard/WelcomeCard";
import { TabBar, type TabValue } from "@/features/dashboard/TabBar";
import { VideoCard, VideoCardSkeleton } from "@/features/video/videoCard/VideoCard";
import { AllVideos } from "@/features/video/allVideos/AllVideos";
import { VideoUpload } from "@/features/video/videoUpload/VideoUpload";
import { fetchVideos } from "@/lib/mock-data";

const uploadVideoSchema = z.object({
    title: z.string().min(1, "Title is required."),
    description: z.string().optional().default(""),
    // In a real app we might also expect a file or video URL here
});

// ── Route Module Exports ──────────────────────────────────────────────────

export async function clientLoader() {
    return { videosPromise: fetchVideos() };
}

export async function clientAction({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const data = Object.fromEntries(formData);

    const result = uploadVideoSchema.safeParse(data);
    if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
            if (issue.path[0]) {
                errors[issue.path[0].toString()] = issue.message;
            }
        });
        return { fieldErrors: errors };
    }

    // In a real app, you would upload the video and save it to the DB here.
    // console.log("Uploading video:", result.data);

    // Give it a fake delay to show loading state
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return { success: true };
}

// ── Component ─────────────────────────────────────────────────────────────

export default function Home() {
    const { videosPromise } = useLoaderData() as { videosPromise: Promise<Video[]> };
    const [activeTab, setActiveTab] = useState<TabValue>("recent");

    const matches = useMatches();
    const rootMatch = matches.find(m => (m.data as any)?.user);
    const userName = (rootMatch?.data as any)?.user?.name || "User";

    return (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6 lg:max-w-5xl">
            <Suspense fallback={<HomeSkeleton />}>
                <Await resolve={videosPromise}>
                    {(videos: Video[]) => {
                        const recentVideos = videos.slice(0, 6);
                        return (
                            <>
                                <WelcomeCard videos={videos} userName={userName} />

                                <TabBar
                                    activeTab={activeTab}
                                    onTabChange={setActiveTab}
                                    totalVideos={videos.length}
                                />

                                {activeTab === "recent" ? (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {recentVideos.map((video) => (
                                            <VideoCard key={video.id} video={video} />
                                        ))}
                                    </div>
                                ) : (
                                    <AllVideos videos={videos} />
                                )}

                                <div className="flex justify-center pb-4">
                                    <VideoUpload />
                                </div>
                            </>
                        );
                    }}
                </Await>
            </Suspense>
        </div>
    );
}

export function HomeSkeleton() {
    return (
        <>
            <WelcomeCardSkeleton />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <VideoCardSkeleton key={i} />
                ))}
            </div>
        </>
    );
}
