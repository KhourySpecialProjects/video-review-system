import type { AnnotationListItem } from "@shared/annotation";
import { apiFetch } from "./api";

/**
 * @description Response shape from the annotations list endpoint.
 */
export type AnnotationListResponse = {
  annotations: AnnotationListItem[];
  total: number;
  limit: number;
  offset: number;
};

/**
 * @description Payload for creating a new annotation.
 */
export type CreateAnnotationPayload = {
  videoId: string;
  authorUserId: string;
  studyId: string;
  siteId: string;
  type: AnnotationListItem["type"];
  timestampSeconds: number;
  durationSeconds: number;
  payload: Record<string, unknown>;
};

/**
 * @description Payload for updating an existing annotation.
 */
export type UpdateAnnotationPayload = {
  timestampSeconds?: number;
  durationSeconds?: number;
  payload?: Record<string, unknown>;
};

/**
 * @description Fetches annotations for a video with pagination.
 * @param videoId - The video UUID to fetch annotations for
 * @param limit - Max annotations to return
 * @param offset - Number to skip
 * @returns Paginated annotation list
 */
export async function fetchAnnotations(
  videoId: string,
  limit = 100,
  offset = 0,
): Promise<AnnotationListResponse> {
  const params = new URLSearchParams({
    videoId,
    limit: String(limit),
    offset: String(offset),
  });
  const res = await apiFetch(`/annotations?${params}`);
  if (!res.ok) throw new Error("Failed to fetch annotations");
  return res.json();
}

/**
 * @description Creates a new annotation on a video.
 * @param data - The annotation creation payload
 * @returns The created annotation
 */
export async function createAnnotation(
  data: CreateAnnotationPayload,
): Promise<AnnotationListItem> {
  const res = await apiFetch("/annotations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create annotation");
  return res.json();
}

/**
 * @description Updates an existing annotation.
 * @param id - The annotation UUID
 * @param data - Fields to update
 * @returns The updated annotation
 */
export async function updateAnnotation(
  id: string,
  data: UpdateAnnotationPayload,
): Promise<AnnotationListItem> {
  const res = await apiFetch(`/annotations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update annotation");
  return res.json();
}

/**
 * @description Deletes an annotation by ID.
 * @param id - The annotation UUID
 */
export async function deleteAnnotation(id: string): Promise<void> {
  const res = await apiFetch(`/annotations/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete annotation");
}
