import { useState } from "react";
import type { Video } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
    CalendarDays,
    Clock3,
    Pencil,
    Check,
    X,
    User,
} from "lucide-react";

interface VideoDetailsSidebarProps {
    video: Video;
    onSave: (data: { title: string; description: string }) => void;
    isSaving?: boolean;
}

export function VideoDetailsSidebar({
    video,
    onSave,
    isSaving = false,
}: VideoDetailsSidebarProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(video.title);
    const [description, setDescription] = useState(video.description);

    const handleSave = () => {
        onSave({ title, description });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setTitle(video.title);
        setDescription(video.description);
        setIsEditing(false);
    };

    return (
        <div className="flex flex-col gap-5 rounded-xl border border-border bg-bg-light p-5">
            {/* Title */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium uppercase tracking-wide text-text-muted">
                        Title
                    </label>
                    {!isEditing && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-text-muted hover:text-text"
                            onClick={() => setIsEditing(true)}
                            aria-label="Edit title and description"
                        >
                            <Pencil className="size-3.5" />
                        </Button>
                    )}
                </div>
                {isEditing ? (
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-bg-dark border-border text-text text-lg font-semibold"
                        aria-label="Video title"
                    />
                ) : (
                    <h2 className="text-lg font-semibold text-text">{video.title}</h2>
                )}
            </div>

            <Separator className="bg-border" />

            {/* Description */}
            <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    Description
                </label>
                {isEditing ? (
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="bg-bg-dark border-border text-text resize-none"
                        aria-label="Video description"
                    />
                ) : (
                    <p className="text-sm leading-relaxed text-text-muted">
                        {video.description}
                    </p>
                )}
            </div>

            {/* Action buttons when editing */}
            {isEditing && (
                <div className="flex gap-2">
                    <Button
                        onClick={handleSave}
                        disabled={!title.trim() || isSaving}
                        className="flex-1 gap-2"
                        size="sm"
                    >
                        <Check className="size-4" />
                        {isSaving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                        onClick={handleCancel}
                        variant="outline"
                        className="flex-1 gap-2 border-border text-text"
                        size="sm"
                    >
                        <X className="size-4" />
                        Cancel
                    </Button>
                </div>
            )}

            <Separator className="bg-border" />

            {/* Metadata */}
            <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    Details
                </p>
                <div className="space-y-2.5 text-sm">
                    <div className="flex items-center gap-2 text-text-muted">
                        <CalendarDays className="size-4 shrink-0" />
                        <span>Uploaded: </span>
                        <span className="font-medium text-text">
                            {formatDate(video.uploadedAt)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-text-muted">
                        <CalendarDays className="size-4 shrink-0" />
                        <span>Filmed: </span>
                        <span className="font-medium text-text">
                            {formatDate(video.filmedAt)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-text-muted">
                        <Clock3 className="size-4 shrink-0" />
                        <span>Time: </span>
                        <span className="font-medium text-text">
                            {formatTime(video.filmedAt)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-text-muted">
                        <User className="size-4 shrink-0" />
                        <span>Filmed by: </span>
                        <span className="font-medium text-text">{video.filmedBy}</span>
                    </div>
                </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 rounded-lg bg-bg-dark px-3 py-2">
                <div
                    className={`size-2 rounded-full ${video.status === "received" ? "bg-success" : "bg-warning"
                        }`}
                />
                <span className="text-sm font-medium text-text">
                    Status:{" "}
                    <span
                        className={
                            video.status === "received" ? "text-success" : "text-warning"
                        }
                    >
                        {video.status === "received" ? "Received" : "Pending"}
                    </span>
                </span>
            </div>
        </div>
    );
}

export function VideoDetailsSidebarSkeleton() {
    return (
        <div className="flex flex-col gap-5 rounded-xl border border-border bg-bg-light p-5">
            <div className="space-y-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-6 w-4/5" />
            </div>
            <Separator className="bg-border" />
            <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
            <Separator className="bg-border" />
            <div className="space-y-2.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
        </div>
    );
}
