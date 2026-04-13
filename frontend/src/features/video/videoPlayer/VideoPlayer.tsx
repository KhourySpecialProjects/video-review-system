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
import { useVideoPlayer } from "@/hooks/useVideoPlayer";

const SPEEDS = [0.5, 1.0, 1.5, 2.0];

interface VideoPlayerProps {
    src?: string;
    duration: number;
    poster?: string;
    title?: string;
}

export function VideoPlayer({ src, duration, poster, title }: VideoPlayerProps) {
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
        volume,
        setVolume,
    } = useVideoPlayer();

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
                    className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/30 transition-opacity"
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
                <div className="group/scrubber relative mb-2">
                    <div
                        className="pointer-events-none absolute bottom-full z-10 -translate-x-1/2 -translate-y-1 opacity-0 transition-opacity group-hover/scrubber:opacity-100"
                        style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    >
                        <div className="rounded bg-foreground px-1.5 py-0.5 text-xs text-background whitespace-nowrap">
                            {formatDuration(Math.floor(currentTime))}
                        </div>
                    </div>
                    <Slider
                        min={0}
                        max={duration}
                        step={0.1}
                        value={currentTime}
                        onValueChange={(value) => {
                            if (videoRef.current) {
                                videoRef.current.currentTime = Array.isArray(value) ? value[0] : value;
                            }
                        }}
                        aria-label="Seek video"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Play/Pause */}
                        <button
                            onClick={togglePlay}
                            className="cursor-pointer text-white transition-colors hover:text-primary"
                            aria-label={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? (
                                <Pause className="size-5" />
                            ) : (
                                <CirclePlay className="size-5" />
                            )}
                        </button>

                        {/* Volume */}
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={toggleMute}
                                className="cursor-pointer text-white transition-colors hover:text-primary"
                                aria-label={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted ? (
                                    <VolumeX className="size-5" />
                                ) : (
                                    <Volume2 className="size-5" />
                                )}
                            </button>
                            <Slider
                                min={0}
                                max={1}
                                step={0.01}
                                value={volume}
                                onValueChange={(value) => {
                                    const v = Array.isArray(value) ? value[0] : value;
                                    setVolume(v);
                                }}
                                aria-label="Volume"
                                className="w-20"
                            />
                        </div>

                        {/* Time */}
                        <span className="text-xs font-medium text-white">
                            {formatDuration(Math.floor(currentTime))} / {formatDuration(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Speed selector */}
                        <Select value={String(speed)} onValueChange={(v) => setSpeed(Number(v))}>
                            <SelectTrigger className="h-7 w-20 cursor-pointer border-white/20 bg-white/10 text-xs text-white hover:bg-white/20">
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
                            className="cursor-pointer text-white transition-colors hover:text-primary"
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
