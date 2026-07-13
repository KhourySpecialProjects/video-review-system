import type { IncompleteUpload } from "@shared-types/video";
import { CloudUpload } from "lucide-react";
import { UploadCard } from "./UploadCard";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DesktopUploadIndicatorProps = {
    uploads: IncompleteUpload[];
    busy: boolean;
    onResume: (videoId: string) => void;
    onCancel: (videoId: string) => void;
    /** @description Notified when the popover opens/closes. */
    onOpenChange?: (open: boolean) => void;
};

/**
 * @description Navbar element showing the incomplete upload count. Opens a
 * popover of upload cards on click/tap, so it works on both desktop and
 * touch. Hidden when the count is 0.
 *
 * @param uploads - List of incomplete uploads.
 * @param busy - Whether a fetcher action is in flight.
 * @param onResume - Called with videoId when the user clicks Resume.
 * @param onCancel - Called with videoId when the user confirms cancel.
 * @param onOpenChange - Notified when the popover opens/closes.
 */
export function DesktopUploadIndicator({
    uploads,
    busy,
    onResume,
    onCancel,
    onOpenChange,
}: DesktopUploadIndicatorProps) {
    if (uploads.length === 0) return null;

    return (
        <Popover onOpenChange={onOpenChange}>
            <PopoverTrigger
                render={
                    <button
                        className="relative inline-flex items-center gap-1.5 rounded-md px-2.5 h-8 text-sm font-medium text-warning hover:bg-muted transition-all"
                        aria-label={`Incomplete uploads (${uploads.length})`}
                    >
                        <CloudUpload className="size-4" />
                        <span>{uploads.length}</span>
                        <span className="absolute -right-0.5 -top-0.5 flex size-2 rounded-full bg-destructive" />
                    </button>
                }
            />
            <PopoverContent align="end" className="w-80 gap-2 p-3">
                <p className="px-1 text-xs font-semibold uppercase tracking-wide text-warning">
                    Incomplete Uploads ({uploads.length})
                </p>
                <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                    {uploads.map((upload) => (
                        <UploadCard
                            key={upload.videoId}
                            upload={upload}
                            busy={busy}
                            onResume={() => onResume(upload.videoId)}
                            onCancel={() => onCancel(upload.videoId)}
                        />
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
