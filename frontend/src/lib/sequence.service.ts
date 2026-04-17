import type { Sequence } from "@shared/sequence";
import { apiFetch } from "./api";

/**
 * @description Payload for creating a new sequence.
 */
export type CreateSequencePayload = {
  studyId: string;
  siteId: string;
  videoId: string;
  title: string;
};

/**
 * @description Payload for reordering clips within a sequence.
 */
export type ReorderItem = {
  clipId: string;
  playOrder: number;
};

/**
 * @description Response shape from the sequences list endpoint.
 */
export type SequenceListResponse = {
  sequences: Sequence[];
};

/**
 * @description Fetches all sequences for a video within a study.
 * @param videoId - The source video UUID
 * @param studyId - The study UUID to scope sequences to
 * @returns List of sequences with their ordered items
 */
export async function fetchSequences(
  videoId: string,
  studyId: string,
): Promise<SequenceListResponse> {
  const params = new URLSearchParams({ videoId, studyId });
  const res = await apiFetch(`/sequences?${params}`);
  if (!res.ok) throw new Error("Failed to fetch sequences");
  return res.json();
}

/**
 * @description Creates a new sequence for a video.
 * @param data - The sequence creation payload
 * @returns The created sequence
 */
export async function createSequence(
  data: CreateSequencePayload,
): Promise<Sequence> {
  const res = await apiFetch("/sequences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create sequence");
  return res.json();
}

/**
 * @description Adds a clip to a sequence at a given play order.
 * @param sequenceId - The sequence UUID
 * @param clipId - The clip UUID to add
 * @param playOrder - Position in the sequence (1-based)
 * @returns The updated sequence
 */
export async function addClipToSequence(
  sequenceId: string,
  clipId: string,
  playOrder: number,
): Promise<Sequence> {
  const res = await apiFetch(`/sequences/${sequenceId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clipId, playOrder }),
  });
  if (!res.ok) throw new Error("Failed to add clip to sequence");
  return res.json();
}

/**
 * @description Updates a sequence's title.
 * @param id - The sequence UUID
 * @param title - The new title
 * @returns The updated sequence
 */
export async function updateSequence(
  id: string,
  title: string,
): Promise<Sequence> {
  const res = await apiFetch(`/sequences/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to update sequence");
  return res.json();
}

/**
 * @description Reorders clips within a sequence.
 * @param sequenceId - The sequence UUID
 * @param items - Array of { clipId, playOrder } defining new ordering
 * @returns The updated sequence
 */
export async function reorderSequence(
  sequenceId: string,
  items: ReorderItem[],
): Promise<Sequence> {
  const res = await apiFetch(`/sequences/${sequenceId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error("Failed to reorder sequence");
  return res.json();
}

/**
 * @description Removes a clip from a sequence.
 * @param sequenceId - The sequence UUID
 * @param clipId - The clip UUID to remove
 */
export async function removeClipFromSequence(
  sequenceId: string,
  clipId: string,
): Promise<void> {
  const res = await apiFetch(`/sequences/${sequenceId}/clip/${clipId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to remove clip from sequence");
}

/**
 * @description Deletes a sequence and all its items.
 * @param id - The sequence UUID
 */
export async function deleteSequence(id: string): Promise<void> {
  const res = await apiFetch(`/sequences/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete sequence");
}
