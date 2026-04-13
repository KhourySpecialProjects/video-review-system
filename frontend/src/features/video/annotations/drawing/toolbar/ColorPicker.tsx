import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Preset color swatches available in the picker.
 *
 * Each entry has a CSS color value and a human-readable label
 * used for the tooltip and accessibility.
 */
const COLOR_PRESETS = [
    { value: "#ef4444", label: "Red" },
    { value: "#f97316", label: "Orange" },
    { value: "#eab308", label: "Yellow" },
    { value: "#22c55e", label: "Green" },
    { value: "#3b82f6", label: "Blue" },
    { value: "#a855f7", label: "Purple" },
    { value: "#ffffff", label: "White" },
    { value: "#000000", label: "Black" },
] as const;

/**
 * Props for the {@link ColorPicker} component.
 */
export type ColorPickerProps = {
    /** The currently selected color as a CSS color string. */
    color: string;
    /** Callback when the user selects a new color. */
    onColorChange: (color: string) => void;
};

/**
 * Color picker with preset swatches and a custom color input.
 *
 * Renders a row of circular color buttons for quick selection,
 * plus a native `<input type="color">` disguised as a dashed
 * circle for picking any arbitrary color.
 *
 * @param props - See {@link ColorPickerProps}.
 *
 * @example
 * ```tsx
 * <ColorPicker color="#ff0000" onColorChange={setColor} />
 * ```
 */
export function ColorPicker({ color, onColorChange }: ColorPickerProps) {
    return (
        <div className="flex items-center gap-1.5">
            {COLOR_PRESETS.map((preset) => (
                <Tooltip key={preset.value}>
                    <TooltipTrigger
                        render={
                            <button
                                type="button"
                                className={cn(
                                    "size-6 rounded-full border-2 transition-transform hover:scale-110",
                                    color === preset.value
                                        ? "border-primary scale-110"
                                        : "border-border",
                                )}
                                style={{ backgroundColor: preset.value }}
                                onClick={() => onColorChange(preset.value)}
                                aria-label={`Select ${preset.label} color`}
                            />
                        }
                    />
                    <TooltipContent>{preset.label}</TooltipContent>
                </Tooltip>
            ))}

            {/* Custom color picker */}
            <Tooltip>
                <TooltipTrigger
                    render={
                        <label
                            className="relative flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border transition-transform hover:scale-110"
                        >
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => onColorChange(e.target.value)}
                                className="absolute inset-0 cursor-pointer opacity-0"
                                aria-label="Custom color picker"
                            />
                            <div
                                className="size-3 rounded-full"
                                style={{ backgroundColor: color }}
                            />
                        </label>
                    }
                />
                <TooltipContent>Custom color</TooltipContent>
            </Tooltip>
        </div>
    );
}
