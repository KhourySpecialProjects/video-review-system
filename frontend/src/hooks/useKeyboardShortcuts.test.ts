import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import type { useVideoPlayer } from "./useVideoPlayer";

/** Creates a mock player object */
function createMockPlayer(): ReturnType<typeof useVideoPlayer> {
    const videoEl = {
        currentTime: 30,
        duration: 120,
        volume: 1,
    } as HTMLVideoElement;

    return {
        videoRef: { current: videoEl },
        isPlaying: false,
        currentTime: 30,
        isMuted: false,
        showControls: true,
        setShowControls: vi.fn(),
        togglePlay: vi.fn(),
        toggleMute: vi.fn(),
        toggleFullscreen: vi.fn(),
        handleSeek: vi.fn(),
        speed: 1.0,
        setSpeed: vi.fn(),
        volume: 1,
        setVolume: vi.fn(),
    };
}

function fireKey(key: string, options: KeyboardEventInit = {}) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...options }));
}

describe("useKeyboardShortcuts", () => {
    let player: ReturnType<typeof useVideoPlayer>;

    beforeEach(() => {
        player = createMockPlayer();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("calls togglePlay when Space is pressed", () => {
        renderHook(() => useKeyboardShortcuts({ player }));
        fireKey(" ");
        expect(player.togglePlay).toHaveBeenCalledOnce();
    });

    it("skips forward 5s on ArrowRight", () => {
        renderHook(() => useKeyboardShortcuts({ player }));
        fireKey("ArrowRight");
        expect(player.videoRef.current!.currentTime).toBe(35);
    });

    it("skips backward 5s on ArrowLeft", () => {
        renderHook(() => useKeyboardShortcuts({ player }));
        fireKey("ArrowLeft");
        expect(player.videoRef.current!.currentTime).toBe(25);
    });

    it("skips forward 10s on Shift+ArrowRight", () => {
        renderHook(() => useKeyboardShortcuts({ player }));
        fireKey("ArrowRight", { shiftKey: true });
        expect(player.videoRef.current!.currentTime).toBe(40);
    });

    it("skips backward 10s on Shift+ArrowLeft", () => {
        renderHook(() => useKeyboardShortcuts({ player }));
        fireKey("ArrowLeft", { shiftKey: true });
        expect(player.videoRef.current!.currentTime).toBe(20);
    });

    it("calls toggleMute when M is pressed", () => {
        renderHook(() => useKeyboardShortcuts({ player }));
        fireKey("m");
        expect(player.toggleMute).toHaveBeenCalledOnce();
    });

    it("calls toggleFullscreen when F is pressed", () => {
        renderHook(() => useKeyboardShortcuts({ player }));
        fireKey("f");
        expect(player.toggleFullscreen).toHaveBeenCalledOnce();
    });

    it("does not fire when typing in an input", () => {
        renderHook(() => useKeyboardShortcuts({ player }));
        const input = document.createElement("input");
        document.body.appendChild(input);
        input.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
        expect(player.togglePlay).not.toHaveBeenCalled();
        document.body.removeChild(input);
    });

    it("does not fire when enabled is false", () => {
        renderHook(() => useKeyboardShortcuts({ player, enabled: false }));
        fireKey(" ");
        expect(player.togglePlay).not.toHaveBeenCalled();
    });

    it("clamps ArrowRight at video duration", () => {
        player.videoRef.current!.currentTime = 118;
        renderHook(() => useKeyboardShortcuts({ player }));
        fireKey("ArrowRight");
        expect(player.videoRef.current!.currentTime).toBe(120);
    });

    it("clamps ArrowLeft at 0", () => {
        player.videoRef.current!.currentTime = 2;
        renderHook(() => useKeyboardShortcuts({ player }));
        fireKey("ArrowLeft");
        expect(player.videoRef.current!.currentTime).toBe(0);
    });
});