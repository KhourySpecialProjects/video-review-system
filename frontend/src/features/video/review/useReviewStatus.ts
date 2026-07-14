import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { reviewStatusQuery } from "@/lib/video.service";
import { apiFetch } from "@/lib/api";
import type { ReviewStatus, ReviewStatusResponse } from "@shared/review";

/**
 * @description Reads the current review status from the (loader-seeded) cache
 * and exposes a mutation that PATCHes a new status, updating the cache in place
 * on success. No React Router revalidation, so the video never remounts.
 *
 * @param videoId - Video id
 * @param studyId - Study id
 * @param siteId - Site id
 * @returns Current status, a setter, and the mutation's pending flag
 */
export function useReviewStatus(videoId: string, studyId: string, siteId: string) {
  const queryClient = useQueryClient();
  const options = reviewStatusQuery(videoId, studyId, siteId);
  const query = useQuery(options);

  const mutation = useMutation({
    mutationFn: async (next: ReviewStatus): Promise<ReviewStatus> => {
      const res = await apiFetch(`/reviews/${videoId}/${studyId}/${siteId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: next }),
      });
      if (!res.ok) throw new Error("Failed to update review status");
      const body = (await res.json()) as { reviewStatus: ReviewStatus };
      return body.reviewStatus;
    },
    onSuccess: (reviewStatus) => {
      queryClient.setQueryData<ReviewStatusResponse>(options.queryKey, (prev) =>
        prev ? { ...prev, reviewStatus } : prev,
      );
    },
    onError: () => {
      // The server may have rejected because our cached status is stale (e.g.
      // another reviewer advanced it). Refetch so the badge/actions reconcile
      // instead of retrying against the same stale state.
      void queryClient.invalidateQueries({
        queryKey: options.queryKey,
        exact: true,
      });
      toast.error("Failed to update review status");
    },
  });

  return {
    status: query.data?.reviewStatus,
    setStatus: mutation.mutate,
    isPending: mutation.isPending,
  };
}
