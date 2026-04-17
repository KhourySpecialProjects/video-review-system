import { useState } from "react";
import { Link } from "react-router";
import type { Video } from "@/lib/types";
import { formatDuration, formatDate, formatTime } from "@/lib/format";
import { getThumbnail } from "@/lib/thumbnailCache";
import { CalendarDays, Clock3, CirclePlay } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoCardProps {
    video: Video;
}

export function VideoCard({ video }: VideoCardProps) {
    const [isPortrait, setIsPortrait] = useState(false);

    return (
        <Link to={`/videos/${video.id}`} className="block">
            <Card className="group overflow-hidden border-border bg-bg-light transition-shadow hover:shadow-l p-0 gap-2">
                {/* Thumbnail */}
                <div className="relative flex items-center justify-center w-full overflow-hidden bg-black aspect-video">
                    {isPortrait && (
                        <img
                            src={getThumbnail(video.id) ?? video.imgUrl}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 size-full object-cover blur-xl scale-110"
                            crossOrigin="anonymous"
                        />
                    )}
                    <img
                        src={getThumbnail(video.id) ?? video.imgUrl}
                        alt={video.title}
                        className={isPortrait ? "h-full w-3/4 object-cover relative mx-auto" : "size-full object-cover"}
                        loading="lazy"
                        crossOrigin="anonymous"
                        onLoad={(e) => {
                            const img = e.currentTarget;
                            setIsPortrait(img.naturalHeight > img.naturalWidth);
                        }}
                        onError={(e) => {
                            const cached = getThumbnail(video.id);
                            if (cached && e.currentTarget.src !== cached) {
                                e.currentTarget.src = cached;
                            }
                        }}
                    />

                    <div className="absolute">
                        <CirclePlay className="size-12 text-primary opacity-80 transition-transform group-hover:scale-110 md:size-16" />
                    </div>
                    {/* Duration badge */}
                    <div className="absolute bottom-2 right-2 rounded-md bg-bg-dark/80 px-1.5 py-0.5">
                        <span className="text-xs font-medium text-text">
                            {formatDuration(video.durationSeconds)}
                        </span>
                    </div>
                </div>

                {/* Info */}
                <div className="flex flex-col gap-1.5 px-3 py-2.5 md:gap-2 md:px-4 md:py-3">
                    <h3 className="truncate text-sm font-semibold text-text md:text-base">
                        {video.title}
                    </h3>
                    <p className="line-clamp-2 text-xs text-text-muted">
                        {video.description}
                    </p>

                    {/* Date & Time row */}
                    <div className="flex items-center gap-3 text-[11px] text-text-muted md:gap-4 md:text-xs">
                        {video.takenAt ? (
                            <>
                                <span className="flex items-center gap-1">
                                    <CalendarDays className="size-3 md:size-3.5" />
                                    {formatDate(video.takenAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock3 className="size-3 md:size-3.5" />
                                    {formatTime(video.takenAt)}
                                </span>
                            </>
                        ) : (
                            <span className="flex items-center gap-1">
                                <CalendarDays className="size-3 md:size-3.5" />
                                {formatDate(video.createdAt)}
                            </span>
                        )}
                    </div>
                </div>
            </Card>
        </Link>
    );
}

export function VideoCardSkeleton() {
    return (
        <div className="border-border bg-bg-dark">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="flex flex-col gap-1.5 px-3 py-2.5 md:gap-2 md:px-4 md:py-3">
                <Skeleton className="h-4 w-3/5 md:h-5" />
                <Skeleton className="h-3 w-full" />
                <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-14" />
                </div>
            </div>
        </div>
    );
}