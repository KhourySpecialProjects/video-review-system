import type { Clip } from "@shared/clip";
import { apiFetch } from "./api";

/**
 * @description Raw clip shape returned by the backend. Prisma nests the
 * creator's name under `createdBy`, whereas our shared type flattens it to
 * `createdByName`. This type captures the on-the-wire shape so we can
 * normalize it in one place.
 */
type RawClip = Omit<Clip, "createdByName"> & {
  createdBy?: { name?: string | null } | null;
  createdByName?: string | null;
};

/**
 * @description Normalizes a clip record from the backend into the shared
 * Clip shape: flattens createdBy.name to createdByName. Tolerates either
 * naming so older or already-normalized responses both work.
 *
 * @param raw - The raw clip record from the API
 * @returns A Clip matching the shared type
 */
function normalizeClip(raw: RawClip): Clip {
  return {
    id: raw.id,
    sourceVideoId: raw.sourceVideoId,
    studyId: raw.studyId,
    siteId: raw.siteId,
    title: raw.title,
    startTimeS: raw.startTimeS,
    endTimeS: raw.endTimeS,
    createdByUserId: raw.createdByUserId,
    createdByName: raw.createdByName ?? raw.createdBy?.name ?? "",
    createdAt: raw.createdAt,
    themeColor: raw.themeColor,
  };
}

/**
 * @description Payload for creating a new clip.
 */
export type CreateClipPayload = {
  sourceVideoId: string;
  studyId: string;
  siteId: string;
  title: string;
  startTimeS: number;
  endTimeS: number;
};

/**
 * @description Response shape from the clips list endpoint.
 */
export type ClipListResponse = {
  clips: Clip[];
};

/**
 * @description Fetches all clips for a video within a study.
 * @param videoId - The source video UUID
 * @param studyId - The study UUID to scope clips to
 * @returns List of clips ordered by start time
 */
export async function fetchClips(
  videoId: string,
  studyId: string,
): Promise<ClipListResponse> {
  const params = new URLSearchParams({ videoId, studyId });
  const res = await apiFetch(`/clips?${params}`);
  if (!res.ok) throw new Error("Failed to fetch clips");
  const data = (await res.json()) as { clips: RawClip[] };
  return { clips: (data.clips ?? []).map(normalizeClip) };
}

/**
 * @description Creates a new video clip from a source video.
 * @param data - The clip creation payload
 * @returns The created clip
 */
export async function createClip(data: CreateClipPayload): Promise<Clip> {
  const res = await apiFetch("/clips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create clip");
  return normalizeClip((await res.json()) as RawClip);
}

/**
 * @description Payload for updating an existing clip.
 */
export type UpdateClipPayload = {
  title?: string;
  startTimeS?: number;
  endTimeS?: number;
};

/**
 * @description Updates an existing clip's title or time range.
 * @param id - The clip UUID
 * @param data - Fields to update
 * @returns The updated clip
 */
export async function updateClip(
  id: string,
  data: UpdateClipPayload,
): Promise<Clip> {
  const res = await apiFetch(`/clips/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update clip");
  return normalizeClip((await res.json()) as RawClip);
}

/**
 * @description Deletes a clip by ID. Also removes it from any sequences.
 * @param id - The clip UUID
 */
export async function deleteClip(id: string): Promise<void> {
  const res = await apiFetch(`/clips/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete clip");
}
