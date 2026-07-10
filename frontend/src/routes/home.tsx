import { Suspense } from "react";
import { Outlet, useMatches, useLoaderData, useNavigate, useLocation } from "react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { TabBar, type TabValue } from "@/features/dashboard/TabBar";
import { VideoCard, VideoCardSkeleton } from "@/features/video/videoCard/VideoCard";
import { VideoUpload } from "@/features/video/videoUpload/VideoUpload";
import { Skeleton } from "@/components/ui/skeleton";
import type { HomeLoaderData } from "@/lib/video.service";
import { homeVideosQuery } from "@/lib/video.service";

// ── Component ─────────────────────────────────────────────────────────────

/**
 * @description Dashboard home page showing a greeting, tabbed video views
 * (recent grid + all videos DataTable), and an upload button. The loader
 * prefetches the video list into TanStack Query; the shell renders
 * immediately and the data-dependent region streams in via Suspense.
 */
export default function Home() {
    const { limit, offset } = useLoaderData() as HomeLoaderData;
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
                <HomeContent
                    limit={limit}
                    offset={offset}
                    userName={userName}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                />
            </Suspense>
        </div>
    );
}

/**
 * @description Data-dependent region that suspends until the home videos
 * query resolves. Reads from the TanStack Query cache populated by the
 * loader's `prefetchQuery` call.
 *
 * @param limit - Page size passed through from the loader
 * @param offset - Pagination offset passed through from the loader
 * @param userName - Display name from the auth guard loader
 * @param activeTab - Currently selected tab
 * @param onTabChange - Callback when the user switches tabs
 */
function HomeContent({
    limit,
    offset,
    userName,
    activeTab,
    onTabChange,
}: {
    limit: number;
    offset: number;
    userName: string;
    activeTab: TabValue;
    onTabChange: (tab: TabValue) => void;
}) {
    const { data: { videos, total } } = useSuspenseQuery(homeVideosQuery(limit, offset));

    return (
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
                onTabChange={onTabChange}
                totalVideos={total}
            />

            {activeTab === "recent" ? (
                <motion.div
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
                    }}
                >
                    {videos.map((video) => (
                        <motion.div
                            key={video.id}
                            variants={{
                                hidden: { opacity: 0, y: 16 },
                                visible: {
                                    opacity: 1,
                                    y: 0,
                                    transition: { type: "spring", stiffness: 260, damping: 26 },
                                },
                            }}
                        >
                            <VideoCard video={video} />
                        </motion.div>
                    ))}
                </motion.div>
            ) : (
                <Outlet />
            )}

            <div className="flex justify-center pb-4">
                <VideoUpload />
            </div>
        </>
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
