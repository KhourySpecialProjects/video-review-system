import type { IncompleteUpload } from "@shared-types/video";
import { CloudUpload, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { formatFileSize, calcUploadPercent } from "@/lib/format";

type UploadCardProps = {
    upload: IncompleteUpload;
    busy: boolean;
    onResume: () => void;
    onCancel: () => void;
};

/**
 * @description Presentational card for a single incomplete upload.
 * Shows file name, progress bar, and resume/cancel actions.
 * Used by both UploadCardStack (mobile) and DesktopUploadIndicator.
 *
 * @param upload - The incomplete upload data
 * @param busy - Whether a fetcher action is in flight
 * @param onResume - Called when user taps Resume
 * @param onCancel - Called when user confirms cancel
 */
export function UploadCard({ upload, busy, onResume, onCancel }: UploadCardProps) {
    const percent = calcUploadPercent(upload.bytesUploaded, upload.fileSize);

    return (
        <div className="rounded-xl border border-warning/20 bg-bg-light p-4 shadow-m">
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0 text-warning" />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">
                            {upload.fileName}
                        </p>
                        <p className="text-xs text-text-muted">
                            {formatFileSize(upload.bytesUploaded)} of{" "}
                            {formatFileSize(upload.fileSize)}
                        </p>
                    </div>
                </div>

                <Progress value={percent}>
                    <ProgressLabel className="text-xs text-text-muted">Progress</ProgressLabel>
                    <ProgressValue className="text-xs" />
                </Progress>

                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5"
                        disabled={busy}
                        onClick={onResume}
                    >
                        {busy ? <Spinner /> : <CloudUpload className="size-3.5" />}
                        {busy ? "Resuming..." : "Resume"}
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger
                            render={
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-text-muted"
                                    disabled={busy}
                                >
                                    <X className="size-3.5" />
                                </Button>
                            }
                        />
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Cancel upload?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently discard the uploaded data for
                                    &quot;{upload.fileName}&quot;. You&apos;ll need to
                                    start a new upload from scratch.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Keep</AlertDialogCancel>
                                <AlertDialogAction
                                    variant="destructive"
                                    onClick={onCancel}
                                >
                                    Cancel upload
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </div>
    );
}
