import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const SPEEDS = [0.5, 1, 1.5, 2];

type SpeedToggleProps = {
    speed: number;
    onSpeedChange: (speed: number) => void;
};

/**
 * @description Toggle group for selecting playback speed. Renders a compact
 * row of speed options (0.5x through 2x) styled for the dark player bar.
 */
export function SpeedToggle({ speed, onSpeedChange }: SpeedToggleProps) {
    return (
        <ToggleGroup
            value={[String(speed)]}
            onValueChange={(value) => {
                if (value.length > 0) {
                    onSpeedChange(Number(value[0]));
                }
            }}
            size="sm"
        >
            {SPEEDS.map((s) => (
                <ToggleGroupItem
                    key={s}
                    value={String(s)}
                    aria-label={`${s}x speed`}
                    className="h-7 px-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 aria-pressed:bg-white/20 aria-pressed:text-white"
                >
                    {s}x
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}
