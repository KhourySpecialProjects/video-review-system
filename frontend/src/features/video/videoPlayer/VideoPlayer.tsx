import { useRef, useState, useEffect } from "react";
import { CirclePlay, Pause, Maximize, Volume2, VolumeX } from "lucide-react";
import { formatDuration } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoPlayerProps {
    /**
     * Video source URL.
     * Currently a direct URL — will be an S3 presigned URL in production.
     */
    src: string;
    /** Duration in seconds (from metadata) */
    duration: number;
    /** Optional poster/thumbnail image */
    poster?: string;
}

export function VideoPlayer({ src, duration, poster }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onTimeUpdate = () => setCurrentTime(video.currentTime);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
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

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setIsMuted(!isMuted);
    };

    const toggleFullscreen = () => {
        const video = videoRef.current;
        if (!video) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            video.requestFullscreen();
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video) return;
        const time = Number(e.target.value);
        video.currentTime = time;
        setCurrentTime(time);
    };

    const progressPercent =
        duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div
            className="group relative w-full overflow-hidden rounded-xl bg-black"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => !isPlaying && setShowControls(true)}
        >
            <video
                ref={videoRef}
                src={src}
                poster={poster || undefined}
                className="aspect-video w-full object-contain"
                playsInline
                preload="metadata"
                crossOrigin="anonymous"
            />

            {/* Center play button overlay (shown when paused) */}
            {!isPlaying && (
                <button
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity"
                    aria-label="Play video"
                >
                    <CirclePlay className="size-20 text-primary opacity-90 transition-transform hover:scale-110" />
                </button>
            )}

            {/* Bottom controls bar */}
            <div
                className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8 transition-opacity ${showControls || !isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
            >
                {/* Progress bar */}
                <div className="relative mb-2 h-1 w-full overflow-hidden rounded-full bg-white/20">
                    <div
                        className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width]"
                        style={{ width: `${progressPercent}%` }}
                    />
                    <input
                        type="range"
                        min="0"
                        max={duration}
                        step="0.1"
                        value={currentTime}
                        onChange={handleSeek}
                        className="absolute inset-0 w-full cursor-pointer opacity-0"
                        aria-label="Seek video"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={togglePlay}
                            className="text-white transition-colors hover:text-primary"
                            aria-label={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? (
                                <Pause className="size-5" />
                            ) : (
                                <CirclePlay className="size-5" />
                            )}
                        </button>
                        <button
                            onClick={toggleMute}
                            className="text-white transition-colors hover:text-primary"
                            aria-label={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? (
                                <VolumeX className="size-5" />
                            ) : (
                                <Volume2 className="size-5" />
                            )}
                        </button>
                        <span className="text-xs font-medium text-white">
                            {formatDuration(Math.floor(currentTime))} / {formatDuration(duration)}
                        </span>
                    </div>
                    <button
                        onClick={toggleFullscreen}
                        className="text-white transition-colors hover:text-primary"
                        aria-label="Toggle fullscreen"
                    >
                        <Maximize className="size-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export function VideoPlayerSkeleton() {
    return <Skeleton className="aspect-video w-full rounded-xl" />;
}
