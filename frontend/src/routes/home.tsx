import { Suspense } from "react";
import { Await, Outlet, useMatches, useLoaderData, useNavigate, useLocation } from "react-router";
import { TabBar, type TabValue } from "@/features/dashboard/TabBar";
import { VideoCard, VideoCardSkeleton } from "@/features/video/videoCard/VideoCard";
import { VideoUpload } from "@/features/video/videoUpload/VideoUpload";
import { Skeleton } from "@/components/ui/skeleton";
import type { HomeLoaderData } from "@/lib/video.service";
import type { VideoListResponse } from "@/lib/video.service";

// ── Component ─────────────────────────────────────────────────────────────

/**
 * @description Dashboard home page showing a greeting, tabbed video views
 * (recent grid + all videos DataTable), and an upload button.
 */
export default function Home() {
    const { videosPromise } = useLoaderData() as HomeLoaderData;
    const navigate = useNavigate();
    const location = useLocation();
    const activeTab: TabValue = location.pathname === "/search" ? "all" : "recent";

    const matches = useMatches();
    const rootMatch = matches.find(m => (m.data as any)?.user);
    const userName = (rootMatch?.data as any)?.user?.name || "User";

    /**
     * @description Navigates to `/search` for the all-videos tab (triggers
     * the search loader) or back to `/` for the recent tab.
     */
    function handleTabChange(tab: TabValue) {
        navigate(tab === "all" ? "/search" : "/");
    }

    return (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6 lg:max-w-5xl">
            <Suspense fallback={<HomeSkeleton />}>
                <Await resolve={videosPromise}>
                    {({ videos, total }: VideoListResponse) => (
                        <>
                            <div className="pt-2">
                                <p className="text-sm font-medium uppercase tracking-wide text-text-muted">
                                    Welcome back
                                </p>
                                <h1 className="text-2xl font-bold text-text">
                                    {userName}
                                </h1>
                            </div>

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

/**
 * @description Loading skeleton for the home page while video data streams in.
 */
export function HomeSkeleton() {
    return (
        <>
            <div className="pt-2 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-40" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <VideoCardSkeleton key={i} />
                ))}
            </div>
        </>
    );
}
