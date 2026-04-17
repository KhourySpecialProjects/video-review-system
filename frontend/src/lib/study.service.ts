import type { MyStudiesResponse, UserStudyOption } from "@shared/study";
import { apiFetch } from "./api";

/**
 * @description Fetches the list of studies the current user can upload to,
 * scoped to their home site. Always includes the site's auto-seeded
 * "Miscellaneous" study, so the dropdown is never empty for a correctly
 * provisioned site.
 *
 * @param signal - Optional AbortSignal for request cancellation
 * @returns The list of `{ id, name }` study options
 * @throws {Error} If the backend returns a non-2xx response
 */
export async function fetchMyStudies(
    signal?: AbortSignal,
): Promise<UserStudyOption[]> {
    const res = await apiFetch("/studies/mine", { signal });
    if (!res.ok) {
        throw new Error(`Failed to fetch studies (${res.status})`);
    }
    const body = (await res.json()) as MyStudiesResponse;
    return body.studies;
}
