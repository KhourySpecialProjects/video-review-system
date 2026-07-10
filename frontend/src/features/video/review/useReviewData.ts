import { queryOptions } from "@tanstack/react-query";
import { reviewKeys } from "@/lib/queryClient";
import { fetchAnnotations } from "@/lib/annotation.service";
import { fetchClips } from "@/lib/clip.service";
import { fetchSequences } from "@/lib/sequence.service";

/**
 * @description Query options for the annotations list on a video. Used by
 * the review loader (`queryClient.ensureQueryData`) and the review page
 * component (`useSuspenseQuery`). Mutations on `/annotations` invalidate
 * this exact queryKey to refresh only the affected list.
 *
 * @param videoId - Video UUID to scope annotations to
 * @returns Query options describing key, fetcher, and stale window
 */
export function annotationsQuery(videoId: string) {
  return queryOptions({
    queryKey: reviewKeys.annotations(videoId),
    queryFn: () => fetchAnnotations(videoId).then((r) => r.annotations),
  });
}

/**
 * @description Query options for the clip list on a (video, study) pair.
 *
 * @param videoId - Source video UUID
 * @param studyId - Study UUID to scope clips to
 * @returns Query options describing key, fetcher, and stale window
 */
export function clipsQuery(videoId: string, studyId: string) {
  return queryOptions({
    queryKey: reviewKeys.clips(videoId, studyId),
    queryFn: () => fetchClips(videoId, studyId).then((r) => r.clips),
  });
}

/**
 * @description Query options for the sequence list on a (video, study) pair.
 *
 * @param videoId - Source video UUID
 * @param studyId - Study UUID to scope sequences to
 * @returns Query options describing key, fetcher, and stale window
 */
export function sequencesQuery(videoId: string, studyId: string) {
  return queryOptions({
    queryKey: reviewKeys.sequences(videoId, studyId),
    queryFn: () => fetchSequences(videoId, studyId).then((r) => r.sequences),
  });
}
