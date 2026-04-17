import { useCallback, useRef, useState } from "react";
import type { Clip } from "@shared/clip";

type SequencePlaybackState = {
  /** @description Whether sequence playback is currently active. */
  isPlaying: boolean;
  /** @description Index of the currently playing clip in the sequence. */
  currentClipIndex: number;
};

/**
 * @description Manages auto-skip playback through an ordered list of clips.
 * Call `checkTimeUpdate` on each video timeupdate to advance clips.
 * Uses refs for the hot path to avoid re-renders on every timeupdate —
 * only dispatches state updates at clip boundaries.
 *
 * @param clips - Clips in the sequence, ordered by startTimeS
 * @param videoRef - Ref to the HTML video element
 * @returns Playback state, control functions, and a timeupdate checker
 */
export function useSequencePlayback(
  clips: Clip[],
  videoRef: React.RefObject<HTMLVideoElement | null>,
) {
  const [state, setState] = useState<SequencePlaybackState>({
    isPlaying: false,
    currentClipIndex: 0,
  });

  const clipIndexRef = useRef(0);
  const isPlayingRef = useRef(false);

  /**
   * @description Starts sequence playback from the first clip.
   * Seeks to the first clip's start time and begins playing.
   */
  const playSequence = useCallback(() => {
    const video = videoRef.current;
    if (!video || clips.length === 0) return;

    clipIndexRef.current = 0;
    isPlayingRef.current = true;
    setState({ isPlaying: true, currentClipIndex: 0 });

    video.currentTime = clips[0].startTimeS;
    video.play().catch(() => {});
  }, [clips, videoRef]);

  /**
   * @description Stops sequence playback and pauses the video.
   */
  const stopSequence = useCallback(() => {
    isPlayingRef.current = false;
    setState((prev) => ({ ...prev, isPlaying: false }));
    videoRef.current?.pause();
  }, [videoRef]);

  /**
   * @description Seeks to a specific clip in the sequence by index.
   * @param index - The clip index to jump to
   */
  const seekToClip = useCallback(
    (index: number) => {
      const video = videoRef.current;
      if (!video || index < 0 || index >= clips.length) return;

      clipIndexRef.current = index;
      setState((prev) => ({ ...prev, currentClipIndex: index }));
      video.currentTime = clips[index].startTimeS;
    },
    [clips, videoRef],
  );

  /**
   * @description Called on each video timeupdate to check if the current
   * clip has ended. Only triggers a state update at clip boundaries
   * (not on every tick), so the cost is a single number comparison per frame.
   *
   * @param currentTime - The video's current playback time in seconds
   */
  const checkTimeUpdate = useCallback(
    (currentTime: number) => {
      if (!isPlayingRef.current) return;

      const currentClip = clips[clipIndexRef.current];
      if (!currentClip) return;

      if (currentTime >= currentClip.endTimeS) {
        const nextIndex = clipIndexRef.current + 1;
        const video = videoRef.current;

        if (nextIndex < clips.length && video) {
          clipIndexRef.current = nextIndex;
          setState({ isPlaying: true, currentClipIndex: nextIndex });
          video.currentTime = clips[nextIndex].startTimeS;
        } else {
          isPlayingRef.current = false;
          setState({ isPlaying: false, currentClipIndex: clips.length - 1 });
          video?.pause();
        }
      }
    },
    [clips, videoRef],
  );

  return {
    isPlayingSequence: state.isPlaying,
    currentClipIndex: state.currentClipIndex,
    playSequence,
    stopSequence,
    seekToClip,
    checkTimeUpdate,
  };
}
