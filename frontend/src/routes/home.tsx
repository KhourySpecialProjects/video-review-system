import { useState, Suspense } from "react";
import { useLoaderData, Await } from "react-router";
import type { Video } from "@/lib/types";
import { WelcomeCard, WelcomeCardSkeleton } from "@/features/dashboard/WelcomeCard";
import { TabBar, type TabValue } from "@/features/dashboard/TabBar";
import { VideoCard, VideoCardSkeleton } from "@/features/video/videoCard/VideoCard";
import { AllVideos } from "@/features/video/allVideos/AllVideos";
import { VideoUpload } from "@/features/video/videoUpload/VideoUpload";

export default function Home() {
    const { videosPromise } = useLoaderData() as { videosPromise: Promise<Video[]> };
    const [activeTab, setActiveTab] = useState<TabValue>("recent");

    return (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6 lg:max-w-5xl">
            <Suspense fallback={<HomeSkeleton />}>
                <Await resolve={videosPromise}>
                    {(videos: Video[]) => {
                        const recentVideos = videos.slice(0, 6);
                        return (
                            <>
                                {/* Welcome Card */}
                                <WelcomeCard videos={videos} userName="John Doe" />

                                {/* Tab Bar */}
                                <TabBar
                                    activeTab={activeTab}
                                    onTabChange={setActiveTab}
                                    totalVideos={videos.length}
                                />

                                {/* Content based on active tab */}
                                {activeTab === "recent" ? (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {recentVideos.map((video) => (
                                            <VideoCard key={video.id} video={video} />
                                        ))}
                                    </div>
                                ) : (
                                    <AllVideos videos={videos} />
                                )}

                                {/* Upload Video button */}
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

/** Skeleton shown while the route loader is pending */
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
