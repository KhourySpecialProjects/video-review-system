import { useReducer, useRef, useState, useEffect } from "react";

interface VideoState {
    isPlaying: boolean;
    currentTime: number;
    isMuted: boolean;
    speed: number;
    volume: number;
}

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

export function useVideoPlayer() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [state, dispatch] = useReducer(videoReducer, initialState);
    const [showControls, setShowControls] = useState(true);

    // Sync event-driven state from the video element.
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onPlay = () => dispatch({ type: "PLAY" });
        const onPause = () => dispatch({ type: "PAUSE" });
        const onEnded = () => dispatch({ type: "ENDED" });
        const onTimeUpdate = () =>
            dispatch({ type: "TIME_UPDATE", currentTime: video.currentTime });
        const onSeeking = () =>
            dispatch({ type: "SEEK", currentTime: video.currentTime });
        const onSeeked = () =>
            dispatch({ type: "SEEK", currentTime: video.currentTime });

        video.addEventListener("play", onPlay);
        video.addEventListener("pause", onPause);
        video.addEventListener("ended", onEnded);
        video.addEventListener("timeupdate", onTimeUpdate);
        video.addEventListener("seeking", onSeeking);
        video.addEventListener("seeked", onSeeked);

        return () => {
            video.removeEventListener("play", onPlay);
            video.removeEventListener("pause", onPause);
            video.removeEventListener("ended", onEnded);
            video.removeEventListener("timeupdate", onTimeUpdate);
            video.removeEventListener("seeking", onSeeking);
            video.removeEventListener("seeked", onSeeked);
        };
    }, []);

    // Sync playbackRate to the video element when speed changes.
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.playbackRate = state.speed;
    }, [state.speed]);

    // Sync volume to the video element when volume or mute changes.
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.volume = state.volume;
        video.muted = state.isMuted;
    }, [state.volume, state.isMuted]);

    function togglePlay() {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused || video.ended) {
            void video.play();
        } else {
            video.pause();
        }
    }

    function toggleMute() {
        dispatch({ type: "TOGGLE_MUTE" });
    }

    function toggleFullscreen() {
        const video = videoRef.current;
        if (!video) return;
        if (!document.fullscreenElement) {
            void video.requestFullscreen();
        } else {
            void document.exitFullscreen();
        }
    }

    function handleSeek(time: number) {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = time;
    }

    function setSpeed(speed: number) {
        dispatch({ type: "SET_SPEED", speed });
    }

    function setVolume(volume: number) {
        dispatch({ type: "SET_VOLUME", volume });
    }

    return {
        videoRef,
        isPlaying: state.isPlaying,
        currentTime: state.currentTime,
        isMuted: state.isMuted,
        showControls,
        setShowControls,
        togglePlay,
        toggleMute,
        toggleFullscreen,
        handleSeek,
        speed: state.speed,
        setSpeed,
        volume: state.volume,
        setVolume,
    };
}
