import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import type { IncompleteUpload } from "@shared-types/video";
import { cancelUpload, resumeUpload } from "@/features/video/videoUpload/upload.service";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";

const ROUTE = "/incomplete-uploads";

/**
 * @description Hook that loads incomplete uploads from the resource route
 * and provides resume/cancel actions. Actions call the service directly
 * and show toast notifications, then reload the list via fetcher.
 *
 * Incomplete uploads are a caregiver-only concept, and the backing endpoint
 * is caregiver-only (403 for everyone else), so the fetch is skipped entirely
 * for non-caregivers and `isCaregiver` is surfaced so callers can hide the UI.
 *
 * @returns Upload data, loading state, whether the user is a caregiver, the
 *   file input ref, and action handlers
 */
export function useIncompleteUploads() {
    const { user } = useAuth();
    const isCaregiver = user?.role === "CAREGIVER";
    const fetcher = useFetcher<{ uploads: IncompleteUpload[] }>();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pendingResumeId = useRef<string | null>(null);

    useEffect(() => {
        if (isCaregiver && fetcher.state === "idle" && !fetcher.data) {
            fetcher.load(ROUTE);
        }
    }, [fetcher, isCaregiver]);

    const uploads = fetcher.data?.uploads ?? [];
    const isLoading = fetcher.state === "loading" && !fetcher.data;
    const busy = fetcher.state !== "idle";

    /**
     * @description Opens the file picker for a specific upload.
     * @param videoId - The video to resume
     */
    function onResume(videoId: string) {
        pendingResumeId.current = videoId;
        fileInputRef.current?.click();
    }

    /**
     * @description Cancels an upload, shows a toast, and reloads the list.
     * @param videoId - The video to cancel
     */
    async function onCancel(videoId: string) {
        try {
            await cancelUpload(videoId);
            toast.info("Upload cancelled", { description: "The upload has been removed." });
            fetcher.load(ROUTE);
        } catch {
            toast.error("Failed to cancel upload");
        }
    }

    /**
     * @description Handles file input change event for resume uploads.
     * Calls resumeUpload directly, shows success/error toast, reloads list.
     * @param e - The file input change event
     */
    async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        const videoId = pendingResumeId.current;
        if (!file || !videoId) return;
        e.target.value = "";
        pendingResumeId.current = null;

        try {
            await resumeUpload(videoId, file);
            toast.success("Upload resumed", { description: "Your video has been uploaded successfully." });
            fetcher.load(ROUTE);
        } catch (err) {
            toast.error("Resume failed", {
                description: err instanceof Error ? err.message : "Could not resume upload.",
            });
        }
    }

    return { uploads, busy, isLoading, isCaregiver, fileInputRef, onResume, onCancel, onFileChange };
}
