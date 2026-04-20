import type { AnnotationListItem } from "@shared/annotation";
import { apiFetch } from "./api";

/**
 * @description Raw annotation shape returned by the backend. Prisma nests
 * the author's name under `author`, whereas our shared type flattens it to
 * `authorName`. This type captures the on-the-wire shape so we can normalize
 * it in one place.
 */
type RawAnnotation = Omit<AnnotationListItem, "authorName"> & {
  author?: { name?: string | null } | null;
  authorName?: string | null;
};

/**
 * @description Normalizes an annotation record from the backend into the
 * shared AnnotationListItem shape: flattens author.name to authorName.
 * Tolerates either naming so older or already-normalized responses both work.
 *
 * @param raw - The raw annotation record from the API
 * @returns An AnnotationListItem matching the shared type
 */
function normalizeAnnotation(raw: RawAnnotation): AnnotationListItem {
  return {
    id: raw.id,
    videoId: raw.videoId,
    authorUserId: raw.authorUserId,
    authorName: raw.authorName ?? raw.author?.name ?? "",
    studyId: raw.studyId,
    siteId: raw.siteId,
    type: raw.type,
    timestampS: raw.timestampS,
    durationS: raw.durationS,
    payload: raw.payload,
    createdAt: raw.createdAt,
  };
}

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
  const data = (await res.json()) as {
    annotations: RawAnnotation[];
    total: number;
    limit: number;
    offset: number;
  };
  return {
    annotations: (data.annotations ?? []).map(normalizeAnnotation),
    total: data.total,
    limit: data.limit,
    offset: data.offset,
  };
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
  return normalizeAnnotation((await res.json()) as RawAnnotation);
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
  return normalizeAnnotation((await res.json()) as RawAnnotation);
}

/**
 * @description Deletes an annotation by ID.
 * @param id - The annotation UUID
 */
export async function deleteAnnotation(id: string): Promise<void> {
  const res = await apiFetch(`/annotations/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete annotation");
}
