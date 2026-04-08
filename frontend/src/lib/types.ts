export type VideoStatus = "UPLOADING" | "UPLOADED" | "FAILED";

/**
 * Frontend representation of a video, matching the VideoListItem
 * shape returned by the backend list/search/detail endpoints.
 */
export type Video = {
    id: string;
    title: string;
    description: string;
    /** Duration in seconds */
    durationSeconds: number;
    status: VideoStatus;
    /** File size in bytes */
    fileSize: number;
    /** ISO date string — when the video was uploaded */
    createdAt: string;
    /** ISO date string — when the video was filmed (null if unknown) */
    takenAt: string | null;
    /** Name of the person who uploaded the video */
    uploadedBy: string;
};

export type TutorialCategory = {
    title: string;
    tutorials: Tutorial[];
}

export type Tutorial = {
    title: string;
    type: "video" | "article";
    url?: string;
    content?: string;
}
