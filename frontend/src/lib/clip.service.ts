import type { Clip } from "@shared/clip";
import { apiFetch } from "./api";

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
  return res.json();
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
  return res.json();
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
  return res.json();
}

/**
 * @description Deletes a clip by ID. Also removes it from any sequences.
 * @param id - The clip UUID
 */
export async function deleteClip(id: string): Promise<void> {
  const res = await apiFetch(`/clips/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete clip");
}
