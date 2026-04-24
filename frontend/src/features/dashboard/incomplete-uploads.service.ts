import { z } from "zod";
import { incompleteUploadSchema, type IncompleteUpload } from "@shared-types/video";
import { apiFetch } from "@/lib/api";

const responseSchema = z.array(incompleteUploadSchema);

/**
 * Fetches the current user's incomplete uploads from the backend.
 *
 * @returns Array of incomplete uploads with progress info, or empty array on failure
 */
export async function fetchIncompleteUploads(): Promise<IncompleteUpload[]> {
  const res = await apiFetch("/videos/incomplete");
  if (!res.ok) return [];

  const json = await res.json();
  return responseSchema.parse(json);
}
