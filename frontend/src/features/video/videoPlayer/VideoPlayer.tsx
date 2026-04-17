import { useState } from "react";
import type { ReactNode } from "react";
import { CirclePlay } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";
import { PlayerControls } from "./PlayerControls";

type VideoPlayerState = ReturnType<typeof useVideoPlayer>;

type VideoPlayerProps = {
    src?: string;
    duration: number;
    poster?: string;
    title?: string;
    /** @description Pre-created player state from useVideoPlayer. When provided, the component uses this instead of creating its own. */
    playerState?: VideoPlayerState;
    /** @description Callback to toggle drawing mode. Passed through to PlayerControls. */
    onDrawToggle?: () => void;
    /** @description Whether drawing mode is active. Passed through to PlayerControls. */
    drawingEnabled?: boolean;
    /** @description Slot for the annotation toolbar, rendered inside the video container. */
    drawToolbarSlot?: ReactNode;
    /** @description Slot for overlay content (e.g. annotation canvas), rendered above the video. */
    overlaySlot?: ReactNode;
    /**
     * @description When true, the container fills its parent in both
     * dimensions (h-full w-full) instead of enforcing a 16:9 aspect ratio.
     * The `<video>` keeps `object-contain` so its true aspect is preserved
     * via letterboxing. Use this when the player lives inside a resizable
     * panel that has its own height constraint — `aspect-video` would
     * otherwise refuse to shrink when the panel gets shorter.
     */
    fill?: boolean;
};

/**
 * @description Custom HTML5 video player with overlay play button and a
 * bottom control bar. Controls auto-hide after 3 seconds of inactivity
 * during playback and reappear on mouse/touch activity. Portrait videos
 * display with a blurred thumbnail background, and on mobile the container
 * uses the video's native aspect ratio instead of forcing 16:9.
 */
export function VideoPlayer({
    src,
    duration,
    poster,
    title,
    playerState: externalState,
    onDrawToggle,
    drawingEnabled,
    drawToolbarSlot,
    overlaySlot,
    fill = false,
}: VideoPlayerProps) {
    const [isPortrait, setIsPortrait] = useState(false);
    const internalState = useVideoPlayer();
    const {
        videoRef,
        containerRef,
        isPlaying,
        currentTime,
        isMuted,
        showControls,
        resetInactivityTimer,
        videoEventHandlers,
        togglePlay,
        toggleMute,
        toggleFullscreen,
        handleSeek,
        speed,
        setSpeed,
        volume,
        setVolume,
        aspectRatio,
    } = externalState ?? internalState;

    const isPortraitVideo = aspectRatio !== null && aspectRatio < 1;
    // Thumbnail only shows before first play — pausing mid-video keeps the
    // frame visible so overlays (drawings, annotations) stay on top of it.
    const showThumbnail = !isPlaying && currentTime === 0;

    const outerClass = fill
        ? "flex h-full w-full min-h-0 min-w-0 flex-col"
        : "w-full";
    const containerClass = fill
        ? "group relative h-full w-full min-h-0 flex-1 overflow-hidden rounded-xl bg-black"
        : `group relative w-full overflow-hidden rounded-xl bg-black ${
              isPortraitVideo ? "aspect-9/16 md:aspect-video" : "aspect-video"
          }`;

    return (
        <div className={outerClass}>
            {title && <h2 className="mb-2 text-lg font-semibold">{title}</h2>}
            <div
                ref={containerRef}
                className={containerClass}
                onMouseMove={resetInactivityTimer}
                onTouchStart={resetInactivityTimer}
            >
                {/* Blurred background for portrait videos — persists during playback */}
                {isPortrait && poster && (
                    <img
                        src={poster}
                        alt=""
                        aria-hidden="true"
                        crossOrigin="anonymous"
                        className="absolute inset-0 size-full object-cover blur-xl scale-110"
                    />
                )}

                {/* Draw toolbar slot — slides in from top when drawing is toggled */}
                {drawToolbarSlot}

                <video
                    ref={videoRef}
                    src={src}
                    className={`relative size-full object-contain ${
                        drawingEnabled ? "" : "cursor-pointer"
                    }`}
                    playsInline
                    preload="metadata"
                    onClick={drawingEnabled ? undefined : togglePlay}
                    onError={(e) => console.error("Video load error:", e.currentTarget.error)}
                    {...videoEventHandlers}
                />

                {/* Overlay slot — annotation canvas, etc. */}
                {overlaySlot}

                {/* Thumbnail overlay — visible before playback, hidden while drawing so it doesn't cover the canvas */}
                {showThumbnail && !drawingEnabled && poster && (
                    <ThumbnailOverlay
                        src={poster}
                        isPortrait={isPortrait}
                        onPortraitDetected={setIsPortrait}
                    />
                )}

                {/* Center play button overlay — hidden while drawing so the canvas isn't obscured */}
                {showThumbnail && !drawingEnabled && (
                    <button
                        onClick={togglePlay}
                        className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/30 transition-opacity"
                        aria-label="Play video"
                    >
                        <CirclePlay className="size-16 text-primary opacity-90 transition-transform hover:scale-110 md:size-20" />
                    </button>
                )}

                <PlayerControls
                    currentTime={currentTime}
                    duration={duration}
                    isPlaying={isPlaying}
                    isMuted={isMuted}
                    volume={volume}
                    speed={speed}
                    visible={showControls}
                    onTogglePlay={togglePlay}
                    onToggleMute={toggleMute}
                    onToggleFullscreen={toggleFullscreen}
                    onSeek={handleSeek}
                    onVolumeChange={setVolume}
                    onSpeedChange={setSpeed}
                    onDrawToggle={onDrawToggle}
                    drawingEnabled={drawingEnabled}
                />
            </div>
        </div>
    );
}

/**
 * @description Thumbnail overlay shown before playback. Detects portrait
 * orientation and reports it to the parent via onPortraitDetected so the
 * blurred background can persist during video playback.
 */
function ThumbnailOverlay({
    src,
    isPortrait,
    onPortraitDetected,
}: {
    src: string;
    isPortrait: boolean;
    onPortraitDetected: (portrait: boolean) => void;
}) {
    return (
        <div className="absolute inset-0 flex items-center justify-center">
            {isPortrait && (
                <img
                    src={src}
                    alt=""
                    aria-hidden="true"
                    crossOrigin="anonymous"
                    className="absolute inset-0 size-full object-cover blur-xl scale-110"
                />
            )}
            <img
                src={src}
                alt=""
                crossOrigin="anonymous"
                className={isPortrait ? "relative h-full object-contain" : "size-full object-cover"}
                onLoad={(e) => {
                    const img = e.currentTarget;
                    onPortraitDetected(img.naturalHeight > img.naturalWidth);
                }}
            />
        </div>
    );
}

/**
 * @description Skeleton placeholder for the video player while loading.
 */
export function VideoPlayerSkeleton() {
    return <Skeleton className="aspect-video w-full rounded-xl" />;
}
