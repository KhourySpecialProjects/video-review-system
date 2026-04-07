import { CirclePlay, Pause, Maximize, Volume2, VolumeX } from "lucide-react";
import { formatDuration } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { useVideoPlayer } from "@/hooks/useVideoPlayer";

const SPEEDS = [0.5, 1.0, 1.5, 2.0];

interface VideoPlayerProps {
    src?: string;
    duration: number;
    poster?: string;
    title?: string;
    player: ReturnType<typeof useVideoPlayer>;
}

export function VideoPlayer({ src, duration, poster, title, player }: VideoPlayerProps) {
    const {
        videoRef,
        isPlaying,
        currentTime,
        isMuted,
        showControls,
        setShowControls,
        togglePlay,
        toggleMute,
        toggleFullscreen,
        speed,
        setSpeed,
    } = player;

    return (
        <div className="w-full">
            {title && <h2 className="mb-2 text-lg font-semibold">{title}</h2>}
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

            {/* Center play button overlay */}
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
                className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8 transition-opacity ${
                    showControls || !isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
            >
                {/* Progress slider */}
                <Slider
                    min={0}
                    max={duration}
                    step={0.1}
                    value={currentTime}
                    onValueChange={(value) => {
                        if (player.videoRef.current) {
                            player.videoRef.current.currentTime = Array.isArray(value) ? value[0] : value;
                        }
                    }}
                    thumbAriaLabel="Seek video"
                    className="mb-2"
                />

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Play/Pause */}
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

                        {/* Mute */}
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

                        {/* Time */}
                        <span className="text-xs font-medium text-white">
                            {formatDuration(Math.floor(currentTime))} / {formatDuration(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Speed selector */}
                        <Select value={String(speed)} onValueChange={(v) => setSpeed(Number(v))}>
                            <SelectTrigger className="h-7 w-20 border-white/20 bg-white/10 text-xs text-white hover:bg-white/20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {SPEEDS.map((s) => (
                                    <SelectItem key={s} value={String(s)}>
                                        {s}x
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Fullscreen */}
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
</div>
        </div>
    );
}

export function VideoPlayerSkeleton() {
    return <Skeleton className="aspect-video w-full rounded-xl" />;
}
