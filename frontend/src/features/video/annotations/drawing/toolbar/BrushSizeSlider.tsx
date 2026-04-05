import { useState } from "react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";

/**
 * Brush size slider range boundaries.
 *
 * The slider operates on integer values 1–20. The value is
 * multiplied by `0.001` to convert to the normalized brush
 * size stored in {@link DrawingSettings} (e.g. slider `5` → `0.005`).
 */
const BRUSH_SIZE_MIN = 1;
const BRUSH_SIZE_MAX = 20;

/**
 * Props for the {@link BrushSizeSlider} component.
 */
export type BrushSizeSliderProps = {
    /**
     * Current brush size in normalized units (e.g. `0.005`).
     * Converted to slider scale internally.
     */
    brushSize: number;
    /** Callback with the new normalized brush size. */
    onBrushSizeChange: (brushSize: number) => void;
};

/**
 * Slider control for adjusting annotation brush/stroke width.
 *
 * Displays the current brush size in a tooltip that stays visible
 * while the slider thumb is being dragged. Uses the Tooltip's
 * controlled `open` prop combined with `onOpenChange` to allow
 * normal hover behavior while forcing the tooltip open during drag.
 *
 * Drag detection uses the Slider's `onValueChange` (fires on each
 * drag tick) and `onValueCommit` (fires on pointer up) callbacks.
 *
 * The slider operates on an integer 1–20 scale that maps linearly to
 * normalized brush sizes `0.001`–`0.02`.
 *
 * @param props - See {@link BrushSizeSliderProps}.
 *
 * @example
 * ```tsx
 * <BrushSizeSlider brushSize={0.005} onBrushSizeChange={setBrushSize} />
 * ```
 */
export function BrushSizeSlider({
    brushSize,
    onBrushSizeChange,
}: BrushSizeSliderProps) {
    const sliderValue = Math.round(brushSize / 0.001);
    const [isDragging, setIsDragging] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className="flex w-28 items-center gap-2">
            <Tooltip
                open={isDragging || isHovered}
                onOpenChange={setIsHovered}
            >
                <TooltipTrigger
                    render={
                        <div className="w-full">
                            <Slider
                                value={[sliderValue]}
                                min={BRUSH_SIZE_MIN}
                                max={BRUSH_SIZE_MAX}
                                onValueChange={(value) => {
                                    setIsDragging(true);
                                    const v = Array.isArray(value) ? value[0] : value;
                                    onBrushSizeChange(v * 0.001);
                                }}
                                onValueCommitted={() => setIsDragging(false)}
                                aria-label="Brush size"
                            />
                        </div>
                    }
                />
                <TooltipContent>Brush size: {sliderValue}</TooltipContent>
            </Tooltip>
        </div>
    );
}
