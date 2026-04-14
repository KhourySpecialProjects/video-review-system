import { Suspense } from "react";
import { Await, Outlet, useMatches, useLoaderData, useNavigate, useLocation } from "react-router";
import { WelcomeCard, WelcomeCardSkeleton } from "@/features/dashboard/WelcomeCard";
import { TabBar, type TabValue } from "@/features/dashboard/TabBar";
import { VideoCard, VideoCardSkeleton } from "@/features/video/videoCard/VideoCard";
import { VideoUpload } from "@/features/video/videoUpload/VideoUpload";
import type { HomeLoaderData } from "@/lib/video.service";
import type { VideoListResponse } from "@/lib/video.service";

// ── Component ─────────────────────────────────────────────────────────────

export default function Home() {
    const { videosPromise } = useLoaderData() as HomeLoaderData;
    const navigate = useNavigate();
    const location = useLocation();
    const activeTab: TabValue = location.pathname === "/search" ? "all" : "recent";

    /**
     * @description Navigates to `/search` for the all-videos tab (triggers
     * the search loader) or back to `/` for the recent tab.
     */
    function handleTabChange(tab: TabValue) {
        navigate(tab === "all" ? "/search" : "/");
    }

    const matches = useMatches();
    const rootMatch = matches.find(m => (m.data as any)?.user);
    const userName = (rootMatch?.data as any)?.user?.name || "User";

    return (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6 lg:max-w-5xl">
            <Suspense fallback={<HomeSkeleton />}>
                <Await resolve={videosPromise}>
                    {({ videos, total }: VideoListResponse) => (
                        <>
                            <WelcomeCard videos={videos} userName={userName} />

                            <TabBar
                                activeTab={activeTab}
                                onTabChange={handleTabChange}
                                totalVideos={total}
                            />

                            {activeTab === "recent" ? (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {videos.map((video) => (
                                        <VideoCard key={video.id} video={video} />
                                    ))}
                                </div>
                            ) : (
                                <Outlet />
                            )}

                            <div className="flex justify-center pb-4">
                                <VideoUpload />
                            </div>
                        </>
                    )}
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
