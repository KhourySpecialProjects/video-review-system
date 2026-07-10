/**
 * @description Valid processing states for a video record.
 */
export type VideoStatus = "UPLOADING" | "UPLOADED" | "FAILED";
/**
 * @description Frontend-friendly projection returned by list/search/detail
 * endpoints. Joins caregiver metadata and uploader info onto the raw
 * Video record.
 */
export type VideoListItem = {
    id: string;
    title: string;
    description: string;
    imgUrl: string;
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
