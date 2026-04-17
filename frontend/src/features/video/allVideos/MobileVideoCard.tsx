import { Link } from "react-router";
import type { Video } from "@/lib/types";
import { formatDuration, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { CirclePlay, Pencil } from "lucide-react";

type MobileVideoCardProps = {
    video: Video;
};

/**
 * @description A compact video card for mobile. Shows title, duration,
 * date, status badge, and explicit Watch/Edit buttons.
 *
 * @param video - The video data to display
 */
export function MobileVideoCard({ video }: MobileVideoCardProps) {
    const statusVariant =
        video.status === "UPLOADED" ? "default" :
        video.status === "FAILED" ? "destructive" : "outline";
    const statusLabel =
        video.status === "UPLOADED" ? "Uploaded" :
        video.status === "FAILED" ? "Failed" : "Uploading";

    return (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-bg-light p-3">
            <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                        {video.title}
                    </p>
                    <p className="text-xs text-text-muted">
                        {formatDuration(video.durationSeconds)} &middot; {formatDate(video.createdAt)}
                    </p>
                </div>
                <Badge variant={statusVariant} className="shrink-0">
                    {statusLabel}
                </Badge>
            </div>
            <div className="flex gap-2">
                <Link
                    to={`/videos/${video.id}`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-2.5 h-8 text-sm font-medium text-text hover:bg-muted transition-all"
                >
                    <CirclePlay className="size-4" />
                    Watch
                </Link>
                <Link
                    to={`/videos/${video.id}?edit=true`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 h-8 text-sm font-medium text-text-muted hover:bg-muted transition-all"
                >
                    <Pencil className="size-3.5" />
                    Edit
                </Link>
            </div>
        </div>
    );
}
