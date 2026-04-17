import { CirclePlay, Pause, Maximize, Pencil } from "lucide-react";
import { formatDuration } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Slider } from "@/components/ui/slider";
import { VolumeControl } from "./VolumeControl";
import { SpeedToggle } from "./SpeedToggle";

type PlayerControlsProps = {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    isMuted: boolean;
    volume: number;
    speed: number;
    visible: boolean;
    onTogglePlay: () => void;
    onToggleMute: () => void;
    onToggleFullscreen: () => void;
    onSeek: (time: number) => void;
    onVolumeChange: (volume: number) => void;
    onSpeedChange: (speed: number) => void;
    /** @description Callback to toggle drawing mode. Button only renders when provided. */
    onDrawToggle?: () => void;
    /** @description Whether drawing mode is currently active. */
    drawingEnabled?: boolean;
};

/**
 * @description Bottom control bar for the video player. Contains the progress
 * scrubber, play/pause, volume, duration, speed toggle, and fullscreen button.
 * Uses shadcn ButtonGroup for visually connected controls.
 */
export function PlayerControls({
    currentTime,
    duration,
    isPlaying,
    isMuted,
    volume,
    speed,
    visible,
    onTogglePlay,
    onToggleMute,
    onToggleFullscreen,
    onSeek,
    onVolumeChange,
    onSpeedChange,
    onDrawToggle,
    drawingEnabled,
}: PlayerControlsProps) {
    return (
        <div
            className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 transition-opacity md:px-4 ${
                visible || !isPlaying ? "opacity-100" : "opacity-0"
            }`}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Progress scrubber */}
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
                    value={[currentTime]}
                    onValueChange={(value) => {
                        onSeek(Array.isArray(value) ? value[0] : value);
                    }}
                    aria-label="Seek video"
                />
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between gap-3">
                {/* Left: play, volume, duration */}
                <div className="flex items-center gap-3">
                    <ButtonGroup>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={onTogglePlay}
                            disabled={drawingEnabled}
                            aria-label={isPlaying ? "Pause" : "Play"}
                            className="text-white hover:text-primary hover:bg-white/10"
                        >
                            {isPlaying ? (
                                <Pause className="size-5" />
                            ) : (
                                <CirclePlay className="size-5" />
                            )}
                        </Button>
                    </ButtonGroup>

                    <VolumeControl
                        volume={volume}
                        isMuted={isMuted}
                        onVolumeChange={onVolumeChange}
                        onToggleMute={onToggleMute}
                    />

                    <span className="text-xs font-medium text-white tabular-nums">
                        {formatDuration(Math.floor(currentTime))}
                        <span className="text-white/50"> / </span>
                        {formatDuration(duration)}
                    </span>
                </div>

                {/* Right: speed, fullscreen */}
                <div className="flex items-center gap-2">
                    <div className="hidden md:block">
                        <SpeedToggle speed={speed} onSpeedChange={onSpeedChange} />
                    </div>

                    <ButtonGroup>
                        {onDrawToggle && (
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={onDrawToggle}
                                aria-label="Toggle drawing mode (D)"
                                className={`text-white hover:text-primary hover:bg-white/10 ${
                                    drawingEnabled ? "bg-white/20 text-primary" : ""
                                }`}
                            >
                                <Pencil className="size-5" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={onToggleFullscreen}
                            aria-label="Toggle fullscreen"
                            className="text-white hover:text-primary hover:bg-white/10"
                        >
                            <Maximize className="size-5" />
                        </Button>
                    </ButtonGroup>
                </div>
            </div>
        </div>
    );
}
