import { QueryClient } from "@tanstack/react-query";

/**
 * @description Shared TanStack Query client. `staleTime` of 30s means queries
 * won't refetch on component remount unless explicitly invalidated — this
 * keeps the review page snappy when the user toggles panels without losing
 * freshness guarantees on navigation.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * @description Query key factory for the review page. Using a factory keeps
 * keys consistent between the `useQuery` call sites and the `invalidateQueries`
 * calls in mutation `onSuccess` handlers. Scope everything to `videoId` so
 * navigating between videos cleanly separates caches.
 */
/**
 * @description Query key factory for the home/dashboard page. Scoped by
 * limit/offset so each paginated slice is cached independently.
 */
export const homeKeys = {
  all: ["home"] as const,
  videos: (limit: number, offset: number) =>
    [...homeKeys.all, "videos", limit, offset] as const,
};

/**
 * @description Query key factory for the all-videos search page. The key
 * includes the serialized search params so each filter/query combination
 * has its own cache entry.
 */
export const searchKeys = {
  all: ["search"] as const,
  list: (params: string) => [...searchKeys.all, "list", params] as const,
};

/**
 * @description Query key factory for the video-view (caregiver) page.
 * Scoped by videoId so each video has its own cache entry.
 */
export const videoViewKeys = {
  all: ["videoView"] as const,
  stream: (videoId: string) => [...videoViewKeys.all, "stream", videoId] as const,
};

export const reviewKeys = {
  all: ["review"] as const,
  stream: (videoId: string) => [...reviewKeys.all, "stream", videoId] as const,
  annotationsAll: () => [...reviewKeys.all, "annotations"] as const,
  annotations: (videoId: string) => [...reviewKeys.annotationsAll(), videoId] as const,
  clipsAll: () => [...reviewKeys.all, "clips"] as const,
  clips: (videoId: string, studyId: string) =>
    [...reviewKeys.clipsAll(), videoId, studyId] as const,
  sequencesAll: () => [...reviewKeys.all, "sequences"] as const,
  sequences: (videoId: string, studyId: string) =>
    [...reviewKeys.sequencesAll(), videoId, studyId] as const,
};