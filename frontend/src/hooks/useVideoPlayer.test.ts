import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useVideoPlayer } from "./useVideoPlayer";

/**
 * Attaches a fake <video> element (with a fixed duration) to the hook's
 * videoRef so we can drive the media event handlers as the browser would.
 */
function attachVideo(
  ref: { current: HTMLVideoElement | null },
  duration: number,
) {
  const video = document.createElement("video");
  Object.defineProperty(video, "duration", { value: duration, configurable: true });
  ref.current = video;
  return video;
}

describe("useVideoPlayer duration", () => {
  it("starts at 0 before metadata loads", () => {
    const { result } = renderHook(() => useVideoPlayer());
    expect(result.current.duration).toBe(0);
  });

  it("captures the real element duration on loadedmetadata", () => {
    const { result } = renderHook(() => useVideoPlayer());
    attachVideo(result.current.videoRef, 10);

    act(() => {
      result.current.videoEventHandlers.onLoadedMetadata();
    });

    expect(result.current.duration).toBe(10);
  });

  it("ignores a non-finite duration (e.g. live/unknown)", () => {
    const { result } = renderHook(() => useVideoPlayer());
    attachVideo(result.current.videoRef, Infinity);

    act(() => {
      result.current.videoEventHandlers.onLoadedMetadata();
    });

    expect(result.current.duration).toBe(0);
  });
});
