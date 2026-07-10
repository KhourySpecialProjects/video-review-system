import { fetchIncompleteUploads } from "@/features/dashboard/incomplete-uploads.service";
import { cancelUpload, resumeUpload } from "@/features/video/videoUpload/upload.service";

/**
 * @description Loader for the incomplete uploads resource route.
 * Returns the list of incomplete uploads for the current user.
 *
 * @returns Object with uploads array
 */
export async function incompleteUploadsLoader() {
    const uploads = await fetchIncompleteUploads();
    return { uploads };
}

/**
 * @description Action for the incomplete uploads resource route.
 * Handles "cancel" and "resume" intents via form submission.
 *
 * @param args - Route action args containing the request
 * @returns Object indicating success or error
 */
export async function incompleteUploadsAction({ request }: { request: Request }) {
    const formData = await request.formData();
    const intent = formData.get("intent") as string;
    const videoId = formData.get("videoId") as string;

    if (intent === "cancel") {
        await cancelUpload(videoId);
        return { ok: true };
    }

    if (intent === "resume") {
        const file = formData.get("file") as File;
        if (!file) return { ok: false, error: "No file provided" };

        try {
            await resumeUpload(videoId, file);
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : "Resume failed" };
        }
    }

    return { ok: false, error: "Unknown intent" };
}
