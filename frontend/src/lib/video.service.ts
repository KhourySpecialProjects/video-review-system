import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import type { Video } from "./types";
import { apiFetch } from "./api";
import { homeKeys, searchKeys, videoViewKeys } from "./queryClient";
import { annotationsQuery, clipsQuery, sequencesQuery } from "@/features/video/review/useReviewData";

const editVideoSchema = z.object({
    title: z.string().min(1, "Title is required."),
    description: z.string().optional().default(""),
});

/**
 * Response shape from the backend list and search endpoints.
 */
export type VideoListResponse = {
    videos: Video[];
    total: number;
    limit: number;
    offset: number;
};

import type { VideoStreamResponse, VideoReviewResponse } from "@shared/video";

/**
 * Fetches a paginated list of uploaded videos from the backend.
 * Reads `limit` and `offset` from the request's search params.
 *
 * @param request - The Request object from the React Router loader
 * @returns Paginated video list with total count
 */
export async function fetchVideos(request: Request): Promise<VideoListResponse> {
    const url = new URL(request.url);
    const limit = url.searchParams.get("limit") ?? "20";
    const offset = url.searchParams.get("offset") ?? "0";

    const res = await apiFetch(`/videos?limit=${limit}&offset=${offset}`, {
        signal: request.signal,
    });
    if (!res.ok) throw new Error("Failed to fetch videos");
    return res.json();
}

/**
 * Searches and filters uploaded videos using search params from the request.
 * Forwards recognized params (q, uploadedAfter, uploadedBefore, filmedAfter,
 * filmedBefore, limit, offset) to the backend search endpoint.
 *
 * @param request - The Request object from the React Router loader
 * @returns Paginated search results with total count
 */
export async function searchVideos(request: Request): Promise<VideoListResponse> {
    const url = new URL(request.url);
    const q = url.searchParams.get("q");
    const uploadedAfter = url.searchParams.get("uploadedAfter");
    const uploadedBefore = url.searchParams.get("uploadedBefore");
    const filmedAfter = url.searchParams.get("filmedAfter");
    const filmedBefore = url.searchParams.get("filmedBefore");
    const limit = url.searchParams.get("limit") ?? "50";
    const offset = url.searchParams.get("offset") ?? "0";

    const res = await apiFetch(
        `/videos/search?${new URLSearchParams({
            ...(q && { q }),
            ...(uploadedAfter && { uploadedAfter }),
            ...(uploadedBefore && { uploadedBefore }),
            ...(filmedAfter && { filmedAfter }),
            ...(filmedBefore && { filmedBefore }),
            limit,
            offset,
        })}`,
        { signal: request.signal },
    );
    if (!res.ok) throw new Error("Failed to search videos");
    
    return res.json();
}

/**
 * Fetches a single video's detail (metadata + caregiver info) by ID.
 *
 * @param videoId - The video UUID
 * @param request - The Request object from the React Router loader
 * @returns The video detail or null if not found
 */
export async function fetchVideoById(
    videoId: string,
    request: Request,
): Promise<Video | null> {
    const res = await apiFetch(`/videos/${videoId}/detail`, {
        signal: request.signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Failed to fetch video");
    return res.json();
}

/**
 * Fetches a presigned stream URL for a video.
 *
 * @param videoId - The video UUID
 * @param request - The Request object from the React Router loader
 * @returns Object with the presigned URL and expiration in seconds
 */
export async function fetchStreamUrl(
    videoId: string,
    request: Request,
): Promise<VideoStreamResponse> {
    const res = await apiFetch(`/videos/${videoId}/stream`, {
        signal: request.signal,
    });
    if (!res.ok) throw new Error("Failed to fetch stream URL");
    return res.json();
}

// ── Loader / Action data types ───────────────────────────────────────────

// Seconds of safety buffer we refetch before a presigned URL actually
// expires, so playback/thumbnails never hit a 403 due to clock skew or
// an in-flight request finishing right at the edge.
const PRESIGN_REFRESH_BUFFER_SECONDS = 60;

// The backend generates presigned thumbnail URLs with a 1-hour lifetime
// (see backend `videos.service.ts`). Refresh the list a minute early so
// image requests don't 403 on clock skew or in-flight requests.
const PRESIGN_TTL_SECONDS = 3600;
const LIST_STALE_MS = (PRESIGN_TTL_SECONDS - PRESIGN_REFRESH_BUFFER_SECONDS) * 1000;

/**
 * @description Query options for the home videos list. Used by the home
 * loader (`queryClient.prefetchQuery`) and the Home component
 * (`useSuspenseQuery`). `staleTime` tracks the presigned thumbnail URL
 * lifetime so the cache invalidates right before the URLs expire, not
 * on an unrelated timer.
 *
 * @param limit - Maximum number of videos to fetch
 * @param offset - Pagination offset
 * @returns Query options describing key, fetcher, and stale window
 */
export function homeVideosQuery(limit = 10, offset = 0) {
    return queryOptions({
        queryKey: homeKeys.videos(limit, offset),
        queryFn: async () => {
            const res = await apiFetch(`/videos?limit=${limit}&offset=${offset}`);
            if (!res.ok) {
                toast.error("Failed to fetch videos");
                throw new Error("Failed to fetch videos");
            }
            return res.json() as Promise<VideoListResponse>;
        },
        staleTime: LIST_STALE_MS,
        refetchInterval: LIST_STALE_MS,
    });
}

/**
 * @description Data returned by the home route loader. The loader kicks
 * off a prefetch into TanStack Query and passes down the params so the
 * component can call `useSuspenseQuery` with the same query key.
 */
export type HomeLoaderData = {
    limit: number;
    offset: number;
};

/**
 * @description Query options for the all-videos search list. Used by the
 * search loader (`queryClient.prefetchQuery`) and the AllVideos component
 * (`useSuspenseQuery`). The key includes the full search params string
 * so each filter combination has its own cache entry.
 *
 * @param searchParams - Serialized URL search params
 * @returns Query options describing key, fetcher, and stale window
 */
export function searchVideosQuery(searchParams: string) {
    return queryOptions({
        queryKey: searchKeys.list(searchParams),
        queryFn: async () => {
            const res = await apiFetch(`/videos/search?${searchParams}`);
            if (!res.ok) {
                toast.error("Failed to search videos");
                throw new Error("Failed to search videos");
            }
            return res.json() as Promise<VideoListResponse>;
        },
    });
}

/**
 * @description Data returned by the search child route loader. The loader
 * kicks off a prefetch into TanStack Query and passes the params so the
 * component can call `useSuspenseQuery` with the same query key.
 */
export type SearchLoaderData = {
    searchParams: string;
    q: string;
};

/**
 * @description Query options for the video stream data. Used by the
 * video-view loader (`queryClient.prefetchQuery`) and the VideoView
 * component (`useSuspenseQuery`). Caches presigned URLs and video
 * metadata so navigating back reuses them.
 *
 * The cache freshness is tied to the presigned URL lifetime the backend
 * reports via `expiresIn`: data is considered fresh for the URL's
 * validity window (minus a small buffer), and a background refetch is
 * scheduled to land just before the URL would 403. That way the UI
 * never serves a stale signed URL and we don't refetch more often than
 * we need to.
 *
 * @param videoId - The video UUID
 * @returns Query options describing key, fetcher, and stale window
 */
export function videoStreamQuery(videoId: string) {
    const refreshMs = (data: VideoStreamResponse | undefined) =>
        data
            ? Math.max((data.expiresIn - PRESIGN_REFRESH_BUFFER_SECONDS) * 1000, 30_000)
            : null;
    return queryOptions({
        queryKey: videoViewKeys.stream(videoId),
        queryFn: async () => {
            const res = await apiFetch(`/videos/${videoId}/stream`);
            if (!res.ok) {
                toast.error("Failed to load video");
                throw new Error("Failed to fetch stream URL");
            }
            return res.json() as Promise<VideoStreamResponse>;
        },
        staleTime: (query) =>
            refreshMs(query.state.data as VideoStreamResponse | undefined) ?? 0,
        refetchInterval: (query) =>
            refreshMs(query.state.data as VideoStreamResponse | undefined) ?? false,
    });
}

/**
 * @description Data returned by the video-view route loader.
 */
export type VideoViewLoaderData = {
    videoId: string;
};

// ── Route loaders ────────────────────────────────────────────────────────

/**
 * @description Home route loader factory. Takes the shared `queryClient`
 * so it can prefetch the recent videos list into the TanStack Query cache.
 * The prefetch is not awaited — the page renders immediately with a
 * Suspense skeleton and `useSuspenseQuery` picks up the data when ready.
 *
 * @param queryClient - The shared TanStack QueryClient
 * @returns The loader handler React Router will call
 */
export function homeLoader(queryClient: QueryClient) {
    return ({ request }: LoaderFunctionArgs): HomeLoaderData => {
        const url = new URL(request.url);
        const limit = Number(url.searchParams.get("limit") ?? "10");
        const offset = Number(url.searchParams.get("offset") ?? "0");
        queryClient.prefetchQuery(homeVideosQuery(limit, offset));
        return { limit, offset };
    };
}

/**
 * @description Search child-route loader factory. Takes the shared
 * `queryClient` so it can prefetch search results into the TanStack
 * Query cache. The prefetch is not awaited — the page renders
 * immediately with a skeleton.
 *
 * @param queryClient - The shared TanStack QueryClient
 * @returns The loader handler React Router will call
 */
export function searchLoader(queryClient: QueryClient) {
    return ({ request }: LoaderFunctionArgs): SearchLoaderData => {
        const url = new URL(request.url);
        const q = url.searchParams.get("q") ?? "";
        const searchParams = url.searchParams.toString();
        queryClient.prefetchQuery(searchVideosQuery(searchParams));
        return { searchParams, q };
    };
}

/**
 * @description Video-view route loader factory. Takes the shared
 * `queryClient` so it can prefetch the stream data into the TanStack
 * Query cache. If the video already exists in the home list cache, the
 * stream query is seeded with that data so title/description/imgUrl
 * are available immediately — only the videoUrl needs to be fetched.
 *
 * @param queryClient - The shared TanStack QueryClient
 * @returns The loader handler React Router will call
 */
export function videoViewLoader(queryClient: QueryClient) {
    return ({ params }: LoaderFunctionArgs): VideoViewLoaderData => {
        const { videoId } = params;
        if (!videoId) {
            throw new Response("Missing videoId", { status: 400 });
        }
        queryClient.prefetchQuery(videoStreamQuery(videoId));
        return { videoId };
    };
}

/**
 * @description Data returned by the video review route loader. The loader
 * awaits the stream URL so the video/poster can paint, and kicks off
 * prefetches for annotations/clips/sequences into the TanStack Query cache.
 * The page component reads those via `useSuspenseQuery`, which hits the
 * cache without refetching when it was populated during the loader run.
 */
export type VideoReviewLoaderData = {
    video: VideoReviewResponse["video"];
    videoUrl: string;
    imgUrl: string;
    expiresIn: number;
    videoId: string;
    studyId: string;
    siteId: string;
    permissionLevel: VideoReviewResponse["permissionLevel"];
};

/**
 * @description Video review route loader factory. Takes the shared
 * `queryClient` so it can prefetch annotations/clips/sequences into the
 * cache while the stream URL is awaited. Prefetches are not awaited, so
 * the video paints as soon as the stream URL resolves — the lists stream
 * into the cache in the background and the page component's
 * `useSuspenseQuery` calls pick them up when ready.
 *
 * @param queryClient - The shared TanStack QueryClient
 * @returns The loader handler React Router will call
 */
export function videoReviewLoader(queryClient: QueryClient) {
    return async ({ params, request }: LoaderFunctionArgs): Promise<VideoReviewLoaderData> => {
        const { videoId, studyId, siteId } = params;
        if (!videoId || !studyId || !siteId) {
            throw new Response("Missing review route params", { status: 400 });
        }

        // Only the stream URL blocks navigation — the video paints as soon
        // as it resolves. List prefetches are fired without awaiting so
        // they populate the TanStack Query cache in the background; the
        // page's `useSuspenseQuery` calls resolve when each cache entry
        // lands, with Suspense fallbacks covering the gap.
        queryClient.prefetchQuery(annotationsQuery(videoId));
        queryClient.prefetchQuery(clipsQuery(videoId, studyId));
        queryClient.prefetchQuery(sequencesQuery(videoId, studyId));
        const streamData = await fetchStreamUrl(videoId, request);

        if (!streamData.video) {
            throw new Response("Video not found", { status: 404 });
        }

        return {
            video: streamData.video,
            videoUrl: streamData.videoUrl,
            imgUrl: streamData.imgUrl,
            expiresIn: streamData.expiresIn,
            videoId,
            studyId,
            siteId,
            permissionLevel: "WRITE",
        };
    };
}

/**
 * @description Video review route action. Handles mutations for the review
 * page using intent-based routing via a hidden form field.
 *
 * @param params - Route params containing videoId
 * @param request - The action Request with form data
 * @returns Result based on the intent
 */
export async function videoReviewAction({ params, request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    switch (intent) {
        case "updateVideo": {
            const result = editVideoSchema.safeParse(Object.fromEntries(formData));
            if (!result.success) {
                const errors: Record<string, string> = {};
                result.error.issues.forEach((issue) => {
                    if (issue.path[0]) {
                        errors[issue.path[0].toString()] = issue.message;
                    }
                });
                return { fieldErrors: errors };
            }
            const res = await apiFetch(`/videos/${params.videoId}/metadata`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: result.data.title,
                    description: result.data.description,
                }),
            });
            if (!res.ok) throw new Error("Failed to update video");
            return { success: true };
        }
        default:
            throw new Error(`Unknown intent: ${intent}`);
    }
}

// ── Route actions ────────────────────────────────────────────────────────

/**
 * @description Propagates a metadata edit for a single video into every
 * cached list/detail entry that already holds that video — without
 * refetching any of them. Home, search, and stream queries all share
 * the same `VideoListItem` projection, so we just swap the edited
 * fields in place wherever the video appears.
 *
 * @param queryClient - The shared TanStack QueryClient
 * @param videoId - The video UUID that was edited
 * @param patch - The title/description fields that changed
 */
function patchVideoInCaches(
    queryClient: QueryClient,
    videoId: string,
    patch: { title: string; description: string },
) {
    const updateListEntry = (old: VideoListResponse | undefined) => {
        if (!old) return old;
        if (!old.videos.some((v) => v.id === videoId)) return old;
        return {
            ...old,
            videos: old.videos.map((v) =>
                v.id === videoId ? { ...v, ...patch } : v,
            ),
        };
    };
    queryClient.setQueriesData<VideoListResponse>({ queryKey: homeKeys.all }, updateListEntry);
    queryClient.setQueriesData<VideoListResponse>({ queryKey: searchKeys.all }, updateListEntry);
    queryClient.setQueryData<VideoStreamResponse>(
        videoViewKeys.stream(videoId),
        (old) => (old ? { ...old, video: { ...old.video, ...patch } } : old),
    );
}

/**
 * @description Video-view route action factory. Validates the edit form,
 * forwards the update to the backend, and patches just the edited
 * video's fields in every relevant TanStack Query cache — so the home
 * grid, search results, and stream detail reflect the new title and
 * description immediately without refetching a whole list.
 *
 * @param queryClient - The shared TanStack QueryClient
 * @returns The action handler React Router will call
 */
export function videoViewAction(queryClient: QueryClient) {
    return async ({ params, request }: ActionFunctionArgs) => {
        const formData = await request.formData();
        const data = Object.fromEntries(formData);

        const result = editVideoSchema.safeParse(data);
        if (!result.success) {
            const errors: Record<string, string> = {};
            result.error.issues.forEach((issue) => {
                if (issue.path[0]) {
                    errors[issue.path[0].toString()] = issue.message;
                }
            });
            return { fieldErrors: errors };
        }

        const res = await apiFetch(`/videos/${params.videoId}/metadata`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: result.data.title,
                description: result.data.description,
            }),
        });
        if (!res.ok) throw new Error("Failed to update video");

        if (params.videoId) {
            patchVideoInCaches(queryClient, params.videoId, {
                title: result.data.title,
                description: result.data.description,
            });
        }

        return { success: true };
    };
}
