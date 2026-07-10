import type { AnnotationListItem } from "./annotation";
import type { Clip } from "./clip";
import type { PermissionLevel } from "./permissions";
import type { Sequence } from "./sequence";

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

/**
 * @description Response shape from the GET /videos/:id/stream endpoint.
 * Contains presigned URLs for both video playback and thumbnail.
 */
export type VideoStreamResponse = {
  video: VideoListItem;
  /** Presigned S3 URL for streaming the video */
  videoUrl: string;
  /** Presigned S3 URL for the video thumbnail */
  imgUrl: string;
  /** URL lifetime in seconds */
  expiresIn: number;
};

/**
 * @description Response shape for the video review page loader.
 * Extends the stream response with review-specific data.
 */
export type VideoReviewResponse = VideoStreamResponse & {
  annotations: AnnotationListItem[];
  clips: Clip[];
  sequences: Sequence[];
  permissionLevel: PermissionLevel;
};
