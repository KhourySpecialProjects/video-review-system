import { useReducer, useRef, useState, useCallback, useEffect } from "react";

type VideoState = {
    isPlaying: boolean;
    currentTime: number;
    isMuted: boolean;
    speed: number;
    volume: number;
};

type VideoAction =
    | { type: "PLAY" }
    | { type: "PAUSE" }
    | { type: "ENDED" }
    | { type: "TIME_UPDATE"; currentTime: number }
    | { type: "SEEK"; currentTime: number }
    | { type: "TOGGLE_MUTE" }
    | { type: "SET_SPEED"; speed: number }
    | { type: "SET_VOLUME"; volume: number };

const initialState: VideoState = {
    isPlaying: false,
    currentTime: 0,
    isMuted: false,
    speed: 1,
    volume: 1,
};

const INACTIVITY_DELAY = 3000;

/**
 * @description Reducer for video player state transitions.
 * @param state - Current video state
 * @param action - Dispatched action
 * @returns Updated video state
 */
function videoReducer(state: VideoState, action: VideoAction): VideoState {
    switch (action.type) {
        case "PLAY":
            return { ...state, isPlaying: true };
        case "PAUSE":
        case "ENDED":
            return { ...state, isPlaying: false };
        case "TIME_UPDATE":
        case "SEEK":
            return { ...state, currentTime: action.currentTime };
        case "TOGGLE_MUTE":
            return { ...state, isMuted: !state.isMuted };
        case "SET_SPEED":
            return { ...state, speed: action.speed };
        case "SET_VOLUME":
            return { ...state, volume: action.volume };
    }
}

/**
 * @description Custom hook that manages video playback state, controls,
 * and an inactivity timer that auto-hides controls after 3 seconds.
 * @returns Video state, refs, event handlers, and control functions
 */
export function useVideoPlayer() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [state, dispatch] = useReducer(videoReducer, initialState);
    const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showControls, setShowControls] = useReducer(
        (_: boolean, next: boolean) => next,
        true,
    );

    /**
     * @description Resets the inactivity timer. Shows controls and schedules
     * auto-hide after INACTIVITY_DELAY ms when playing.
     */
    const resetInactivityTimer = useCallback(() => {
        setShowControls(true);
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        inactivityTimer.current = setTimeout(() => {
            if (videoRef.current && !videoRef.current.paused) {
                setShowControls(false);
            }
        }, INACTIVITY_DELAY);
    }, []);

    // Cleanup inactivity timer on unmount.
    useEffect(() => {
        return () => {
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        };
    }, []);

    const [aspectRatio, setAspectRatio] = useState<number | null>(null);

    /** @description Video element event handlers — pass directly to `<video>`. */
    const videoEventHandlers = {
        onLoadedMetadata: () => {
            const video = videoRef.current;
            if (video && video.videoWidth && video.videoHeight) {
                setAspectRatio(video.videoWidth / video.videoHeight);
            }
        },
        onPlay: () => {
            dispatch({ type: "PLAY" });
            resetInactivityTimer();
        },
        onPause: () => {
            dispatch({ type: "PAUSE" });
            setShowControls(true);
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        },
        onEnded: () => {
            dispatch({ type: "ENDED" });
            setShowControls(true);
        },
        onTimeUpdate: () => {
            const video = videoRef.current;
            if (video) dispatch({ type: "TIME_UPDATE", currentTime: video.currentTime });
        },
        onSeeking: () => {
            const video = videoRef.current;
            if (video) dispatch({ type: "SEEK", currentTime: video.currentTime });
        },
        onSeeked: () => {
            const video = videoRef.current;
            if (video) dispatch({ type: "SEEK", currentTime: video.currentTime });
        },
    };

    /**
     * @description Toggles between play and pause on the video element.
     */
    function togglePlay() {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused || video.ended) {
            video.play().catch((err) => console.error("Video play failed:", err));
        } else {
            video.pause();
        }
    }

    /**
     * @description Toggles the muted state and syncs to the video element.
     */
    function toggleMute() {
        const video = videoRef.current;
        dispatch({ type: "TOGGLE_MUTE" });
        if (video) video.muted = !video.muted;
    }

    /**
     * @description Toggles fullscreen on the container element so custom
     * controls remain visible in fullscreen mode.
     */
    function toggleFullscreen() {
        const el = containerRef.current;
        if (!el) return;
        if (!document.fullscreenElement) {
            el.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    }

    /**
     * @description Seeks the video to a specific time.
     * @param time - Target time in seconds
     */
    function handleSeek(time: number) {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = time;
    }

    /**
     * @description Sets the playback speed and syncs to the video element.
     * @param speed - Playback rate multiplier
     */
    function setSpeed(speed: number) {
        dispatch({ type: "SET_SPEED", speed });
        const video = videoRef.current;
        if (video) video.playbackRate = speed;
    }

    /**
     * @description Sets the volume level and syncs to the video element.
     * @param volume - Volume between 0 and 1
     */
    function setVolume(volume: number) {
        dispatch({ type: "SET_VOLUME", volume });
        const video = videoRef.current;
        if (video) video.volume = volume;
    }

    return {
        videoRef,
        containerRef,
        isPlaying: state.isPlaying,
        currentTime: state.currentTime,
        isMuted: state.isMuted,
        showControls,
        resetInactivityTimer,
        videoEventHandlers,
        togglePlay,
        toggleMute,
        toggleFullscreen,
        handleSeek,
        speed: state.speed,
        setSpeed,
        volume: state.volume,
        setVolume,
        aspectRatio,
    };
}
