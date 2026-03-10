import type { Video } from "@/lib/types";
import { BadgeCheck } from "lucide-react";
import { formatDate, timeAgo } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface WelcomeCardProps {
    videos: Video[];
    userName: string;
}

export function WelcomeCard({ videos, userName }: WelcomeCardProps) {
    const recentVideos = videos.slice(0, 2);

    return (
        <Card className="border-border bg-bg-light shadow-m!">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                    Welcome Back 
                    <h1 className="text-lg pt-2 font-bold text-text">{userName}</h1>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {recentVideos.map((video) => (
                    <div
                        key={video.id}
                        className="flex items-center gap-3 rounded-xl border border-border bg-bg-dark p-3"
                    >
                        <BadgeCheck className="size-6 shrink-0 text-success" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-text">
                                {video.title}
                            </p>
                            <p className="text-xs text-text-muted">
                                Uploaded {timeAgo(video.uploadedAt)} • {formatDate(video.uploadedAt)}
                            </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-success">
                            {video.status === "received" ? "Received" : "Pending"}
                        </span>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

export function WelcomeCardSkeleton() {
    return (
        <Card className="border-border bg-bg-light shadow-m">
            <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {[1, 2].map((i) => (
                    <div
                        key={i}
                        className="flex items-center gap-3 rounded-xl border border-border bg-bg-dark p-3"
                    >
                        <Skeleton className="size-6 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
