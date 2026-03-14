import type { TutorialCategory, Video } from "./types";

/**
 * Mock videos for development.
 * In production these will come from an API backed by S3.
 */
export const MOCK_VIDEOS: Video[] = [
    {
        id: "vid-001",
        title: "Eating Breakfast",
        description:
            "He ate breakfast for about 30 minutes and then decides to watch tv",
        duration: 72, // 1:12
        thumbnailUrl: "https://picsum.photos/seed/breakfast/640/360",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        uploadedAt: "2026-02-10T08:00:00Z",
        filmedAt: "2026-02-10T03:15:00Z",
        filmedBy: "Caregiver A",
        status: "received",
    },
    {
        id: "vid-002",
        title: "Morning Walk",
        description:
            "Went for a 20-minute walk around the neighborhood. Seemed cheerful and engaged with neighbors.",
        duration: 145, // 2:25
        thumbnailUrl: "https://picsum.photos/seed/walk/640/360",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        uploadedAt: "2026-02-09T10:30:00Z",
        filmedAt: "2026-02-09T07:45:00Z",
        filmedBy: "Caregiver B",
        status: "received",
    },
    {
        id: "vid-003",
        title: "Afternoon Nap",
        description:
            "Rested in the living room for about 45 minutes. Woke up and asked for water.",
        duration: 210, // 3:30
        thumbnailUrl: "https://picsum.photos/seed/nap/640/360",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        uploadedAt: "2026-02-08T15:00:00Z",
        filmedAt: "2026-02-08T13:00:00Z",
        filmedBy: "Caregiver A",
        status: "received",
    },
    {
        id: "vid-004",
        title: "Physical Therapy Session",
        description:
            "Completed a full physical therapy session with the therapist. Showed improvement in range of motion.",
        duration: 356, // 5:56
        thumbnailUrl: "https://picsum.photos/seed/therapy/640/360",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        uploadedAt: "2026-02-07T11:00:00Z",
        filmedAt: "2026-02-07T09:30:00Z",
        filmedBy: "Caregiver C",
        status: "pending",
    },
    {
        id: "vid-005",
        title: "Watching TV",
        description:
            "Spent an hour watching a favorite cooking show. Was very engaged and commented on the recipes.",
        duration: 180, // 3:00
        thumbnailUrl: "https://picsum.photos/seed/tv/640/360",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        uploadedAt: "2026-02-06T19:00:00Z",
        filmedAt: "2026-02-06T18:00:00Z",
        filmedBy: "Caregiver A",
        status: "received",
    },
    {
        id: "vid-006",
        title: "Garden Visit",
        description:
            "Visited the garden and helped water the plants. Enjoyed being outdoors for about 25 minutes.",
        duration: 95, // 1:35
        thumbnailUrl: "https://picsum.photos/seed/garden/640/360",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        uploadedAt: "2026-02-05T16:00:00Z",
        filmedAt: "2026-02-05T14:30:00Z",
        filmedBy: "Caregiver B",
        status: "received",
    },
];

/** Simulate async fetch with a delay (mimics network + S3 presigned URL generation) */
export function fetchVideos(): Promise<Video[]> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(MOCK_VIDEOS), 1500);
    });
}

/** Simulate fetching a single video by ID */
export function fetchVideoById(id: string): Promise<Video | undefined> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(MOCK_VIDEOS.find((v) => v.id === id)), 500);
    });
}

/** Simulate updating a video's title and description */
export function updateVideo(
    id: string,
    data: { title?: string; description?: string }
): Promise<Video | undefined> {
    return new Promise((resolve) => {
        const video = MOCK_VIDEOS.find((v) => v.id === id);
        if (video) {
            if (data.title !== undefined) video.title = data.title;
            if (data.description !== undefined) video.description = data.description;
        }
        setTimeout(() => resolve(video), 300);
    });
}

export function fetchTutorial(): Promise<TutorialCategory[]> {
    return new Promise((resolve) => {
        setTimeout(() => resolve([
            {
                title: "Getting Started",
                tutorials: [
                    { title: "How to Upload Videos", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
                    { title: "Best Practices for Filming", type: "article", content: "When filming videos, make sure to..." },
                ],
            },
            {
                title: "Advanced Features",
                tutorials: [
                    { title: "Using AI Insights", type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
                    { title: "Customizing Your Dashboard", type: "article", content: "To customize your dashboard, go to settings..." },
                ],
            },
        ]), 1000);
    });

}
