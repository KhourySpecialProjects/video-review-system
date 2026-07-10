import type { LoaderFunctionArgs } from "react-router";
import type { UserStudyOption } from "@shared/study";
import { fetchMyStudies } from "@/lib/study.service";

/**
 * @description Resource-route loader for the upload dialog's study selector.
 * Consumed via `useFetcher` so the dialog can trigger + read the request
 * using React Router's built-in fetcher state rather than ad-hoc useState.
 *
 * @param request - The loader Request (forwarded for the abort signal)
 * @returns The studies the current user can upload to
 */
export async function myStudiesLoader({
    request,
}: LoaderFunctionArgs): Promise<UserStudyOption[]> {
    return fetchMyStudies(request.signal);
}
