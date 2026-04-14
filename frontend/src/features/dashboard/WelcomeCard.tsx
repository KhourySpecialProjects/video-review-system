import { useEffect, useState, useCallback } from "react";
import type { Video } from "@/lib/types";
import type { IncompleteUpload } from "@shared-types/video";
import { BadgeCheck } from "lucide-react";
import { formatDate, timeAgo, formatFileSize, calcUploadPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchIncompleteUploads } from "./incomplete-uploads.service";
import { cancelUpload } from "@/features/video/videoUpload/upload.service";
import { IncompleteUploadRow } from "./IncompleteUploadRow";
import { IncompleteUploadSkeleton } from "./IncompleteUploadSkeleton";

type WelcomeCardProps = {
    videos: Video[];
    userName: string;
};

/**
 * Dashboard welcome card showing the user's name, any incomplete uploads
 * with progress and resume/cancel actions, and recent completed videos.
 *
 * @param props.videos - All videos for the current user
 * @param props.userName - Display name of the logged-in user
 */
export function WelcomeCard({ videos, userName }: WelcomeCardProps) {
    const recentVideos = videos.slice(0, 2);
    const [incompleteUploads, setIncompleteUploads] = useState<IncompleteUpload[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchIncompleteUploads()
            .then(setIncompleteUploads)
            .finally(() => setLoading(false));
    }, []);

    const handleCancel = useCallback(async (videoId: string) => {
        await cancelUpload(videoId);
        setIncompleteUploads((prev) => prev.filter((u) => u.videoId !== videoId));
    }, []);

    const handleResume = useCallback((_videoId: string) => {
        // TODO: open file picker, validate file size, then call resumeUpload
    }, []);

    return (
        <Card className="border-border bg-bg-light shadow-m!">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                    Welcome Back
                    <h1 className="text-lg pt-2 font-bold text-text">{userName}</h1>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {loading ? (
                    <IncompleteUploadSkeleton />
                ) : (
                    incompleteUploads.map((upload) => (
                        <IncompleteUploadRow
                            key={upload.videoId}
                            fileName={upload.fileName}
                            uploadedLabel={formatFileSize(upload.bytesUploaded)}
                            totalLabel={formatFileSize(upload.fileSize)}
                            percent={calcUploadPercent(upload.bytesUploaded, upload.fileSize)}
                            onResume={() => handleResume(upload.videoId)}
                            onCancel={() => handleCancel(upload.videoId)}
                        />
                    ))
                )}

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
                                Uploaded {timeAgo(video.createdAt)} • {formatDate(video.createdAt)}
                            </p>
                        </div>
                        <span className={`shrink-0 text-xs font-semibold ${
                            video.status === "UPLOADED" ? "text-success" :
                            video.status === "FAILED" ? "text-destructive" : "text-warning"
                        }`}>
                            {video.status === "UPLOADED" ? "Uploaded" :
                             video.status === "FAILED" ? "Failed" : "Uploading"}
                        </span>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

/**
 * Skeleton placeholder for the entire WelcomeCard while data is loading.
 */
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
