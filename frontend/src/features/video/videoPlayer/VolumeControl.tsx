import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type VolumeControlProps = {
    volume: number;
    isMuted: boolean;
    onVolumeChange: (volume: number) => void;
    onToggleMute: () => void;
};

/**
 * @description Mute button paired with a volume slider. The slider is
 * hidden on small screens to save space — only the mute toggle shows.
 * A percentage tooltip appears on hover and stays visible while dragging
 * via the slider's data-dragging attribute. An aria-live region announces
 * volume changes to screen readers.
 */
export function VolumeControl({
    volume,
    isMuted,
    onVolumeChange,
    onToggleMute,
}: VolumeControlProps) {
    const percent = Math.round(volume * 100);
    const label = isMuted ? "Muted" : `${percent}%`;

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
                className="text-white hover:text-primary hover:bg-white/10"
            >
                {isMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </Button>
            <div className="group/volume relative hidden w-24 shrink-0 md:block">
                <div
                    role="status"
                    aria-live="polite"
                    className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-1.5 rounded bg-foreground px-1.5 py-0.5 text-xs text-background whitespace-nowrap opacity-0 transition-opacity group-hover/volume:opacity-100 group-data-dragging/volume:opacity-100"
                >
                    {label}
                </div>
                <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    value={[isMuted ? 0 : volume]}
                    onValueChange={(value) => {
                        onVolumeChange(Array.isArray(value) ? value[0] : value);
                    }}
                    aria-label={`Volume: ${label}`}
                    aria-valuetext={label}
                />
            </div>
        </div>
    );
}
