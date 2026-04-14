import { CloudUpload, AlertCircle, X } from "lucide-react";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
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

type IncompleteUploadRowProps = {
    fileName: string;
    uploadedLabel: string;
    totalLabel: string;
    percent: number;
    onResume: () => void;
    onCancel: () => void;
};

/**
 * Displays a single incomplete upload with a progress bar, resume button,
 * and cancel button with a confirmation dialog.
 *
 * @param props - Pre-computed display values for the upload
 */
export function IncompleteUploadRow({
    fileName,
    uploadedLabel,
    totalLabel,
    percent,
    onResume,
    onCancel,
}: IncompleteUploadRowProps) {
    return (
        <div className="flex flex-col gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3">
            <div className="flex items-center gap-3">
                <AlertCircle className="size-5 shrink-0 text-warning" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text">
                        {fileName}
                    </p>
                    <p className="text-xs text-text-muted">
                        {uploadedLabel} of {totalLabel}
                    </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={onResume}>
                        <CloudUpload className="size-3.5" />
                        Resume
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger render={<Button size="icon-sm" variant="ghost" />}>
                            <X className="size-3.5" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Cancel upload?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently discard the uploaded data for &quot;{fileName}&quot;. You&apos;ll need to start a new upload from scratch.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Keep uploading</AlertDialogCancel>
                                <AlertDialogAction variant="destructive" onClick={onCancel}>
                                    Cancel upload
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
            <Progress value={percent}>
                <ProgressLabel>Upload progress</ProgressLabel>
                <ProgressValue />
            </Progress>
        </div>
    );
}
