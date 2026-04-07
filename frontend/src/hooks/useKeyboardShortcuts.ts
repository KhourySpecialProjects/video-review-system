import { useEffect } from "react";
import type { useVideoPlayer } from "./useVideoPlayer";

/**
 * Configuration for the useKeyboardShortcuts hook.
 */
interface KeyboardShortcutsConfig {
    /** The video player state and controls from useVideoPlayer. */
    player: ReturnType<typeof useVideoPlayer>;
    /** Whether keyboard shortcuts are enabled. Defaults to true. */
    enabled?: boolean;
}

/**
 * Hook that adds keyboard shortcuts for video playback control
 * in the clinical reviewer view.
 *
 * Shortcuts are automatically disabled when the user is typing
 * in an input, textarea, or contenteditable element.
 *
 * | Key                  | Action                  |
 * |----------------------|-------------------------|
 * | Space                | Play / Pause            |
 * | ArrowRight           | Skip forward 5s         |
 * | ArrowLeft            | Skip backward 5s        |
 * | Shift + ArrowRight   | Skip forward 10s        |
 * | Shift + ArrowLeft    | Skip backward 10s       |
 * | M                    | Toggle mute             |
 * | F                    | Toggle fullscreen       |
 *
 * @param config - Configuration object with player and optional enabled flag.
 */
export function useKeyboardShortcuts({
    player,
    enabled = true,
}: KeyboardShortcutsConfig) {
    useEffect(() => {
        if (!enabled) return;

        function isTyping(e: KeyboardEvent): boolean {
            const target = e.target as HTMLElement;
            return (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            );
        }

        function handleKeyDown(e: KeyboardEvent) {
            if (isTyping(e)) return;

            const video = player.videoRef.current;

            switch (e.key) {
                case " ":
                    e.preventDefault();
                    player.togglePlay();
                    break;

                case "ArrowRight":
                    e.preventDefault();
                    if (video) {
                        video.currentTime = Math.min(
                            video.duration,
                            video.currentTime + (e.shiftKey ? 10 : 5)
                        );
                    }
                    break;

                case "ArrowLeft":
                    e.preventDefault();
                    if (video) {
                        video.currentTime = Math.max(
                            0,
                            video.currentTime - (e.shiftKey ? 10 : 5)
                        );
                    }
                    break;

                case "m":
                case "M":
                    e.preventDefault();
                    player.toggleMute();
                    break;

                case "f":
                case "F":
                    e.preventDefault();
                    player.toggleFullscreen();
                    break;
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [enabled, player]);
}