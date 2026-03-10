import { describe, it, expect } from "vitest";
import { formatDuration, formatDate, formatTime, timeAgo } from "./format";

describe("formatDuration", () => {
    it("formats seconds into MM:SS", () => {
        expect(formatDuration(0)).toBe("0:00");
        expect(formatDuration(72)).toBe("1:12");
        expect(formatDuration(145)).toBe("2:25");
        expect(formatDuration(3600)).toBe("60:00");
        expect(formatDuration(5)).toBe("0:05");
    });
});

describe("formatDate", () => {
    it("formats ISO date to readable date string", () => {
        const result = formatDate("2026-02-10T08:00:00Z");
        expect(result).toContain("Feb");
        expect(result).toContain("10");
        expect(result).toContain("2026");
    });
});

describe("formatTime", () => {
    it("formats ISO date to readable time", () => {
        const result = formatTime("2026-02-10T08:00:00Z");
        expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    });
});

describe("timeAgo", () => {
    it('returns "Today" for today', () => {
        const now = new Date().toISOString();
        expect(timeAgo(now)).toBe("Today");
    });

    it('returns "1 day ago" for yesterday', () => {
        const yesterday = new Date(Date.now() - 86400000).toISOString();
        expect(timeAgo(yesterday)).toBe("1 day ago");
    });

    it("returns N days ago for recent dates", () => {
        const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
        expect(timeAgo(fiveDaysAgo)).toBe("5 days ago");
    });
});
