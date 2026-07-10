import type { IncompleteUpload } from "@shared-types/video";
import { CloudUpload } from "lucide-react";
import { UploadCard } from "./UploadCard";

type DesktopUploadIndicatorProps = {
    uploads: IncompleteUpload[];
    busy: boolean;
    onResume: (videoId: string) => void;
    onCancel: (videoId: string) => void;
};

/**
 * @description Desktop navbar element showing incomplete upload count.
 * On hover, reveals a dropdown list of upload cards. Hidden when count is 0.
 *
 * @param uploads - List of incomplete uploads
 * @param busy - Whether a fetcher action is in flight
 * @param onResume - Called with videoId when user clicks Resume
 * @param onCancel - Called with videoId when user confirms cancel
 */
export function DesktopUploadIndicator({ uploads, busy, onResume, onCancel }: DesktopUploadIndicatorProps) {
    if (uploads.length === 0) return null;

    return (
        <div className="group relative">
            {/* Trigger */}
            <button className="relative inline-flex items-center gap-1.5 rounded-md px-2.5 h-8 text-sm font-medium text-warning hover:bg-muted transition-all">
                <CloudUpload className="size-4" />
                <span>{uploads.length}</span>
                <span className="absolute -right-0.5 -top-0.5 flex size-2 rounded-full bg-destructive" />
            </button>

            {/* Hover dropdown */}
            <div className="invisible absolute right-0 top-full z-50 w-80 pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <div className="flex flex-col gap-2 rounded-xl border border-border bg-bg-dark p-3 shadow-m">
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
                </div>
            </div>
        </div>
    );
}
