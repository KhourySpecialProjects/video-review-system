/**
 * @description Valid annotation types supported by the system.
 */
export type AnnotationType = "text_comment" | "drawing_box" | "drawing_circle" | "freehand_drawing" | "tag";

/**
 * @description An annotation record as returned by the API list endpoint.
 */
export type AnnotationListItem = {
  id: string;
  videoId: string;
  authorUserId: string;
  studyId: string;
  siteId: string;
  type: AnnotationType;
  /** @description Position in the video in seconds. */
  timestampSeconds: number;
  /** @description How long the annotation spans in seconds. */
  durationSeconds: number;
  /** @description Type-specific JSON data (e.g. text, points, coordinates). */
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
