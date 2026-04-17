import type { Sequence, SequenceItem } from "@shared/sequence";
import { apiFetch } from "./api";

/**
 * @description Raw sequence shape returned by the backend. Prisma nests the
 * creator's name under `createdBy` and uses `sequenceItems` for the item
 * list, whereas our shared type flattens `createdByName` and renames the
 * relation to `items`. This type captures the on-the-wire shape so we can
 * normalize it in one place.
 */
type RawSequence = Omit<Sequence, "items" | "createdByName"> & {
  createdBy?: { name?: string | null } | null;
  createdByName?: string | null;
  sequenceItems?: Array<{ clipId: string; playOrder: number }> | null;
  items?: SequenceItem[] | null;
};

/**
 * @description Normalizes a sequence record from the backend into the shared
 * Sequence shape: flattens createdBy.name and coerces sequenceItems → items.
 * Tolerates either naming so older or already-normalized responses both work.
 *
 * @param raw - The raw sequence record from the API
 * @returns A Sequence matching the shared type
 */
function normalizeSequence(raw: RawSequence): Sequence {
  const rawItems = raw.items ?? raw.sequenceItems ?? [];
  return {
    id: raw.id,
    videoId: raw.videoId,
    studyId: raw.studyId,
    siteId: raw.siteId,
    title: raw.title,
    createdByUserId: raw.createdByUserId,
    createdByName: raw.createdByName ?? raw.createdBy?.name ?? "",
    createdAt: raw.createdAt,
    items: rawItems.map((i) => ({ clipId: i.clipId, playOrder: i.playOrder })),
  };
}

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
  const data = (await res.json()) as { sequences: RawSequence[] };
  return { sequences: (data.sequences ?? []).map(normalizeSequence) };
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
  return normalizeSequence((await res.json()) as RawSequence);
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
