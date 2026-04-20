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
  /** @description Display name of the user who authored this annotation. */
  authorName: string;
  studyId: string;
  siteId: string;
  type: AnnotationType;
  /** @description Position in the video in seconds. Matches the Prisma column name. */
  timestampS: number;
  /** @description How long the annotation spans in seconds. Matches the Prisma column name. */
  durationS: number;
  /** @description Type-specific JSON data (e.g. text, points, coordinates). */
  payload: Record<string, unknown>;
  createdAt: string;
};
