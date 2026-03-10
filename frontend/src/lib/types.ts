export type VideoStatus = "received" | "pending" | "processing";

export interface Video {
    id: string;
    title: string;
    description: string;
    /** Duration in seconds */
    duration: number;
    /**
     * URL to the video thumbnail image.
     * Will be an S3 presigned URL in production.
     */
    thumbnailUrl: string;
    /**
     * URL to the video source file.
     * Will be an S3 presigned URL in production.
     */
    videoUrl: string;
    /** ISO date string — when the video was uploaded */
    uploadedAt: string;
    /** ISO date string — when the video was filmed */
    filmedAt: string;
    /** Name of the person who filmed the video */
    filmedBy: string;
    status: VideoStatus;
}
