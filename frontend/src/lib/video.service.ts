import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { z } from "zod";
import type { Video } from "./types";
import { apiFetch } from "./api";

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
import { fetchAnnotations } from "./annotation.service";
import { fetchClips } from "./clip.service";
import { fetchSequences } from "./sequence.service";

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

/**
 * @description Data returned by the home route loader.
 * The promise is deferred so the page streams in with a skeleton.
 */
export type HomeLoaderData = {
    videosPromise: Promise<VideoListResponse>;
};

/**
 * @description Data returned by the search child route loader.
 * searchPromise is deferred so the tab switch is instant.
 */
export type SearchLoaderData = {
    searchPromise: Promise<VideoListResponse>;
    q: string;
};

/**
 * @description Data returned by the video-view route loader.
 */
export type VideoViewLoaderData = VideoStreamResponse;

// ── Route loaders ────────────────────────────────────────────────────────

/**
 * @description Home route loader. Fetches the recent videos list for
 * the dashboard welcome card and recent-videos grid.
 *
 * @param request - The loader Request (forwarded for search params + abort signal)
 * @returns Recent videos list response
 */
export function homeLoader({ request }: LoaderFunctionArgs): HomeLoaderData {
    const url = new URL(request.url);
    url.searchParams.set("limit", "10");
    return { videosPromise: fetchVideos(new Request(url, request)) };
}

/**
 * @description Search child-route loader. Called when the AllVideos
 * Form GET submission updates the URL with search/filter params.
 *
 * @param request - The loader Request with search params serialized from the Form
 * @returns Paginated search results
 */
export function searchLoader({ request }: LoaderFunctionArgs): SearchLoaderData {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    return { searchPromise: searchVideos(request), q };
}

/**
 * @description Video-view route loader. Fetches video detail and a presigned
 * stream URL in parallel using the videoId from route params.
 *
 * @param params - Route params containing videoId
 * @param request - The loader Request (forwarded for abort signal)
 * @returns The video detail and stream response
 * @throws {Response} 404 if the video does not exist
 */
export async function videoViewLoader({ params, request }: LoaderFunctionArgs): Promise<VideoViewLoaderData> {
    const { videoId } = params;
    const data = await fetchStreamUrl(videoId!, request);
    if (!data.video) {
        throw new Response("Video not found", { status: 404 });
    }
    return data;
}

/**
 * @description Data returned by the video review route loader. The video
 * stream URL and poster are awaited so the player paints immediately; the
 * annotations/clips/sequences are returned as unresolved promises so the
 * sidebar and timeline stream in via `<Await>` + `<Suspense>`. `studyId`
 * and `siteId` come from the route path params.
 */
export type VideoReviewLoaderData = {
    video: VideoReviewResponse["video"];
    videoUrl: string;
    imgUrl: string;
    expiresIn: number;
    studyId: string;
    siteId: string;
    permissionLevel: VideoReviewResponse["permissionLevel"];
    annotationsPromise: Promise<VideoReviewResponse["annotations"]>;
    clipsPromise: Promise<VideoReviewResponse["clips"]>;
    sequencesPromise: Promise<VideoReviewResponse["sequences"]>;
};

/**
 * @description Video review route loader. Awaits only the stream URL so the
 * video/poster can paint, and returns annotations/clips/sequences as
 * unresolved promises for deferred streaming. All four requests fire in
 * parallel so the secondary data is already in-flight by the time the
 * player mounts.
 *
 * @param params - Route params containing videoId, studyId, siteId
 * @param request - The loader Request (forwarded for abort signal)
 * @returns Video stream data plus deferred promises for annotations, clips, sequences
 * @throws {Response} 404 if the video does not exist, 400 if route params are missing
 */
export async function videoReviewLoader({ params, request }: LoaderFunctionArgs): Promise<VideoReviewLoaderData> {
    const { videoId, studyId, siteId } = params;
    if (!videoId || !studyId || !siteId) {
        throw new Response("Missing review route params", { status: 400 });
    }

    const streamPromise = fetchStreamUrl(videoId, request);
    const annotationsPromise = fetchAnnotations(videoId).then((r) => r.annotations);
    const clipsPromise = fetchClips(videoId, studyId).then((r) => r.clips);
    const sequencesPromise = fetchSequences(videoId, studyId).then((r) => r.sequences);

    const streamData = await streamPromise;

    if (!streamData.video) {
        throw new Response("Video not found", { status: 404 });
    }

    return {
        video: streamData.video,
        videoUrl: streamData.videoUrl,
        imgUrl: streamData.imgUrl,
        expiresIn: streamData.expiresIn,
        studyId,
        siteId,
        permissionLevel: "WRITE",
        annotationsPromise,
        clipsPromise,
        sequencesPromise,
    };
}

/**
 * @description Revalidation gate for the review route. Skips the loader
 * when neither the pathname nor search string has changed AND no form
 * submission triggered the navigation — this prevents redundant stream
 * URL fetches on purely cosmetic navigations. Mutation-driven revalidation
 * (from `useRevalidator` or resource-route submissions) still re-runs
 * the loader; since annotations/clips/sequences are deferred, that
 * revalidation returns instantly and the Suspense boundaries stream the
 * updated lists in.
 *
 * @param args - React Router `shouldRevalidate` args
 * @returns Whether to re-run the review loader
 */
export function videoReviewShouldRevalidate({
    formAction,
    currentUrl,
    nextUrl,
    defaultShouldRevalidate,
}: {
    formAction?: string;
    currentUrl: URL;
    nextUrl: URL;
    defaultShouldRevalidate: boolean;
}): boolean {
    if (
        !formAction &&
        currentUrl.pathname === nextUrl.pathname &&
        currentUrl.search === nextUrl.search
    ) {
        return false;
    }
    return defaultShouldRevalidate;
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
 * @description Video-view route action. Validates the edit form and
 * forwards the update to the backend PUT endpoint.
 *
 * @param params - Route params containing videoId
 * @param request - The action Request with form data
 * @returns Validation errors or a success flag
 */
export async function videoViewAction({ params, request }: ActionFunctionArgs) {
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

    return { success: true };
}
