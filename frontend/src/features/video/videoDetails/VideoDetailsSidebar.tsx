import { useState } from "react";
import { Form, useActionData, useSearchParams } from "react-router";
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
    isSaving?: boolean;
}

export function VideoDetailsSidebar({
    video,
    isSaving = false,
}: VideoDetailsSidebarProps) {
    const [searchParams] = useSearchParams();
    const [isEditing, setIsEditing] = useState(searchParams.get("edit") === "true");
    const actionData = useActionData() as { fieldErrors?: Record<string, string> } | undefined;

    return (
        <div className="flex flex-col gap-5 rounded-xl border border-border bg-bg-light p-5">
            <Form method="post" className="flex flex-col gap-5" onSubmit={() => { }}>
                {/* Title */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-medium uppercase tracking-wide text-text-muted">
                            Title
                        </label>
                        {!isEditing && (
                            <Button
                                type="button"
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
                        <div className="space-y-1">
                            <Input
                                name="title"
                                defaultValue={video.title}
                                className="bg-bg-dark border-border text-text text-lg font-semibold"
                                aria-label="Video title"
                                required
                            />
                            {actionData?.fieldErrors?.title && (
                                <p className="text-xs text-destructive">{actionData.fieldErrors.title}</p>
                            )}
                        </div>
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
                        <div className="space-y-1">
                            <Textarea
                                name="description"
                                defaultValue={video.description}
                                rows={4}
                                className="bg-bg-dark border-border text-text resize-none"
                                aria-label="Video description"
                            />
                            {actionData?.fieldErrors?.description && (
                                <p className="text-xs text-destructive">{actionData.fieldErrors.description}</p>
                            )}
                        </div>
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
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 gap-2"
                            size="sm"
                            onClick={() => {
                                // Wait for next tick to see if we navigate or fail validation
                                setTimeout(() => {
                                    if (!actionData?.fieldErrors) {
                                        setIsEditing(false);
                                    }
                                }, 100);
                            }}
                        >
                            <Check className="size-4" />
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            variant="outline"
                            className="flex-1 gap-2 border-border text-text"
                            size="sm"
                        >
                            <X className="size-4" />
                            Cancel
                        </Button>
                    </div>
                )}
            </Form>

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
                            {formatDate(video.createdAt)}
                        </span>
                    </div>
                    {video.takenAt && (
                        <>
                            <div className="flex items-center gap-2 text-text-muted">
                                <CalendarDays className="size-4 shrink-0" />
                                <span>Filmed: </span>
                                <span className="font-medium text-text">
                                    {formatDate(video.takenAt)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-text-muted">
                                <Clock3 className="size-4 shrink-0" />
                                <span>Time: </span>
                                <span className="font-medium text-text">
                                    {formatTime(video.takenAt)}
                                </span>
                            </div>
                        </>
                    )}
                    <div className="flex items-center gap-2 text-text-muted">
                        <User className="size-4 shrink-0" />
                        <span>Uploaded by: </span>
                        <span className="font-medium text-text">{video.uploadedBy}</span>
                    </div>
                </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 rounded-lg bg-bg-dark px-3 py-2">
                <div
                    className={`size-2 rounded-full ${
                        video.status === "UPLOADED" ? "bg-success" :
                        video.status === "FAILED" ? "bg-destructive" : "bg-warning"
                    }`}
                />
                <span className="text-sm font-medium text-text">
                    Status:{" "}
                    <span
                        className={
                            video.status === "UPLOADED" ? "text-success" :
                            video.status === "FAILED" ? "text-destructive" : "text-warning"
                        }
                    >
                        {video.status === "UPLOADED" ? "Uploaded" :
                         video.status === "FAILED" ? "Failed" : "Uploading"}
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
