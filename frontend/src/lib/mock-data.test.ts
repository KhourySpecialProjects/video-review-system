import { describe, it, expect } from "vitest";
import {
    MOCK_VIDEOS,
    fetchVideos,
    fetchVideoById,
    updateVideo,
} from "./mock-data";

describe("MOCK_VIDEOS", () => {
    it("contains 6 videos", () => {
        expect(MOCK_VIDEOS).toHaveLength(6);
    });

    it("each video has required fields", () => {
        for (const video of MOCK_VIDEOS) {
            expect(video.id).toBeTruthy();
            expect(video.title).toBeTruthy();
            expect(video.description).toBeTruthy();
            expect(video.duration).toBeGreaterThan(0);
            expect(video.videoUrl).toBeTruthy();
            expect(video.uploadedAt).toBeTruthy();
            expect(video.filmedAt).toBeTruthy();
            expect(video.filmedBy).toBeTruthy();
            expect(["received", "pending", "processing"]).toContain(video.status);
        }
    });
});

describe("fetchVideos", () => {
    it("returns all videos after simulated delay", async () => {
        const videos = await fetchVideos();
        expect(videos.length).toBe(MOCK_VIDEOS.length);
        expect(videos[0].id).toBe(MOCK_VIDEOS[0].id);
    });
});

describe("fetchVideoById", () => {
    it("returns the correct video by ID", async () => {
        const video = await fetchVideoById("vid-001");
        expect(video).toBeDefined();
        expect(video!.title).toBe("Eating Breakfast");
    });

    it("returns undefined for unknown ID", async () => {
        const video = await fetchVideoById("unknown");
        expect(video).toBeUndefined();
    });
});

describe("updateVideo", () => {
    it("updates the title of a video", async () => {
        const updated = await updateVideo("vid-001", { title: "New Title" });
        expect(updated).toBeDefined();
        expect(updated!.title).toBe("New Title");

        // Restore original for other tests
        await updateVideo("vid-001", { title: "Eating Breakfast" });
    });

    it("returns undefined for unknown ID", async () => {
        const result = await updateVideo("unknown", { title: "No" });
        expect(result).toBeUndefined();
    });
});
