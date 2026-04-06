import { useRef, useEffect, useReducer } from "react";

/**
 * State shape for the video player.
 */
type VideoPlayerState = {
    isPlaying: boolean;
    currentTime: number;
    isMuted: boolean;
    showControls: boolean;
    speed: number;
};

/**
 * Actions that can be dispatched to the video player reducer.
 */
type VideoPlayerAction =
    | { type: "SET_PLAYING"; payload: boolean }
    | { type: "SET_CURRENT_TIME"; payload: number }
    | { type: "SET_MUTED"; payload: boolean }
    | { type: "SET_SHOW_CONTROLS"; payload: boolean }
    | { type: "SET_SPEED"; payload: number };

const initialState: VideoPlayerState = {
    isPlaying: false,
    currentTime: 0,
    isMuted: false,
    showControls: true,
    speed: 1.0,
};

/**
 * Reducer for video player state.
 */
function videoPlayerReducer(
    state: VideoPlayerState,
    action: VideoPlayerAction
): VideoPlayerState {
    switch (action.type) {
        case "SET_PLAYING":
            return { ...state, isPlaying: action.payload };
        case "SET_CURRENT_TIME":
            return { ...state, currentTime: action.payload };
        case "SET_MUTED":
            return { ...state, isMuted: action.payload };
        case "SET_SHOW_CONTROLS":
            return { ...state, showControls: action.payload };
        case "SET_SPEED":
            return { ...state, speed: action.payload };
        default:
            return state;
    }
}

/**
 * Custom hook that manages video player state and controls.
 * Uses useReducer to consolidate state management.
 *
 * @returns Video player state and control handlers.
 */
export function useVideoPlayer() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [state, dispatch] = useReducer(videoPlayerReducer, initialState);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onTimeUpdate = () =>
            dispatch({ type: "SET_CURRENT_TIME", payload: video.currentTime });
        const onPlay = () => dispatch({ type: "SET_PLAYING", payload: true });
        const onPause = () => dispatch({ type: "SET_PLAYING", payload: false });
        const onEnded = () => {
            dispatch({ type: "SET_PLAYING", payload: false });
            dispatch({ type: "SET_CURRENT_TIME", payload: 0 });
        };

        video.addEventListener("timeupdate", onTimeUpdate);
        video.addEventListener("play", onPlay);
        video.addEventListener("pause", onPause);
        video.addEventListener("ended", onEnded);

        return () => {
            video.removeEventListener("timeupdate", onTimeUpdate);
            video.removeEventListener("play", onPlay);
            video.removeEventListener("pause", onPause);
            video.removeEventListener("ended", onEnded);
        };
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.playbackRate = state.speed;
    }, [state.speed]);

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        video.paused ? video.play() : video.pause();
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        dispatch({ type: "SET_MUTED", payload: !state.isMuted });
    };

    const toggleFullscreen = () => {
        const video = videoRef.current;
        if (!video) return;
        document.fullscreenElement
            ? document.exitFullscreen()
            : video.requestFullscreen();
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video) return;
        const time = Number(e.target.value);
        video.currentTime = time;
        dispatch({ type: "SET_CURRENT_TIME", payload: time });
    };

    const setShowControls = (value: boolean) =>
        dispatch({ type: "SET_SHOW_CONTROLS", payload: value });

    const setSpeed = (value: number) =>
        dispatch({ type: "SET_SPEED", payload: value });

    return {
        videoRef,
        isPlaying: state.isPlaying,
        currentTime: state.currentTime,
        isMuted: state.isMuted,
        showControls: state.showControls,
        setShowControls,
        togglePlay,
        toggleMute,
        toggleFullscreen,
        handleSeek,
        speed: state.speed,
        setSpeed,
    };
}