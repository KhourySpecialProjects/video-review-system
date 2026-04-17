import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSequencePlayback } from "./useSequencePlayback";
import type { Clip } from "@shared/clip";

const makeClip = (startTimeS: number, endTimeS: number): Clip => ({
  id: `clip-${startTimeS}-${endTimeS}`,
  sourceVideoId: "video-1",
  studyId: "study-1",
  siteId: "site-1",
  title: `Clip ${startTimeS}-${endTimeS}`,
  startTimeS,
  endTimeS,
  createdByUserId: "user-1",
  createdByName: "Test User",
  createdAt: "2026-04-01T00:00:00Z",
  themeColor: "#3b82f6",
});

function createMockVideoRef() {
  const video = {
    currentTime: 0,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as HTMLVideoElement;

  return { current: video };
}

describe("useSequencePlayback", () => {
  let videoRef: ReturnType<typeof createMockVideoRef>;
  let clips: Clip[];

  beforeEach(() => {
    videoRef = createMockVideoRef();
    clips = [makeClip(5, 10), makeClip(20, 30), makeClip(45, 55)];
  });

  it("starts not playing with clip index 0", () => {
    const { result } = renderHook(() =>
      useSequencePlayback(clips, videoRef),
    );

    expect(result.current.isPlayingSequence).toBe(false);
    expect(result.current.currentClipIndex).toBe(0);
  });

  it("playSequence seeks to first clip and starts playing", () => {
    const { result } = renderHook(() =>
      useSequencePlayback(clips, videoRef),
    );

    act(() => result.current.playSequence());

    expect(videoRef.current.currentTime).toBe(5);
    expect(videoRef.current.play).toHaveBeenCalled();
    expect(result.current.isPlayingSequence).toBe(true);
    expect(result.current.currentClipIndex).toBe(0);
  });

  it("checkTimeUpdate skips to next clip when current clip ends", () => {
    const { result } = renderHook(() =>
      useSequencePlayback(clips, videoRef),
    );

    act(() => result.current.playSequence());
    act(() => result.current.checkTimeUpdate(10));

    expect(videoRef.current.currentTime).toBe(20);
    expect(result.current.currentClipIndex).toBe(1);
    expect(result.current.isPlayingSequence).toBe(true);
  });

  it("pauses when last clip ends", () => {
    const { result } = renderHook(() =>
      useSequencePlayback(clips, videoRef),
    );

    act(() => result.current.playSequence());
    // Skip through all clips
    act(() => result.current.checkTimeUpdate(10));
    act(() => result.current.checkTimeUpdate(30));
    act(() => result.current.checkTimeUpdate(55));

    expect(videoRef.current.pause).toHaveBeenCalled();
    expect(result.current.isPlayingSequence).toBe(false);
    expect(result.current.currentClipIndex).toBe(2);
  });

  it("stopSequence pauses and sets isPlaying to false", () => {
    const { result } = renderHook(() =>
      useSequencePlayback(clips, videoRef),
    );

    act(() => result.current.playSequence());
    act(() => result.current.stopSequence());

    expect(videoRef.current.pause).toHaveBeenCalled();
    expect(result.current.isPlayingSequence).toBe(false);
  });

  it("handles empty sequence gracefully", () => {
    const { result } = renderHook(() =>
      useSequencePlayback([], videoRef),
    );

    act(() => result.current.playSequence());

    expect(videoRef.current.play).not.toHaveBeenCalled();
    expect(result.current.isPlayingSequence).toBe(false);
  });

  it("checkTimeUpdate is a no-op when not playing", () => {
    const { result } = renderHook(() =>
      useSequencePlayback(clips, videoRef),
    );

    act(() => result.current.checkTimeUpdate(100));

    expect(result.current.currentClipIndex).toBe(0);
    expect(videoRef.current.pause).not.toHaveBeenCalled();
  });

  it("seekToClip jumps to a specific clip", () => {
    const { result } = renderHook(() =>
      useSequencePlayback(clips, videoRef),
    );

    act(() => result.current.seekToClip(2));

    expect(videoRef.current.currentTime).toBe(45);
    expect(result.current.currentClipIndex).toBe(2);
  });
});
