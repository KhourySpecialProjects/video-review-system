import { Undo2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from "@/components/ui/tooltip";
import type { AnnotationTool, DrawingSettings } from "../../types";
import { ToolSelector } from "./ToolSelector";
import { ColorPicker } from "./ColorPicker";
import { BrushSizeSlider } from "./BrushSizeSlider";

/**
 * Props for the {@link AnnotationToolbar} component.
 */
export type AnnotationToolbarProps = {
    /** The currently selected drawing tool. */
    tool: AnnotationTool;
    /** Callback when the user selects a different tool. */
    onToolChange: (tool: AnnotationTool) => void;
    /** The current drawing settings (color, brush size). */
    settings: DrawingSettings;
    /** Callback when the user changes drawing settings. */
    onSettingsChange: (settings: DrawingSettings) => void;
    /** Callback to undo the last annotation action. */
    onUndo: () => void;
    /** Callback to clear all annotations. */
    onClear: () => void;
    /** Whether undo is available (history is non-empty). */
    canUndo: boolean;
    /** Whether there are any annotations to clear. */
    canClear: boolean;
};

/**
 * Toolbar for controlling annotation drawing tools and settings.
 *
 * Composes {@link ToolSelector}, {@link ColorPicker}, and
 * {@link BrushSizeSlider} with undo/clear action buttons.
 *
 * @param props - See {@link AnnotationToolbarProps}.
 *
 * @example
 * ```tsx
 * <AnnotationToolbar
 *     tool={tool}
 *     onToolChange={setTool}
 *     settings={settings}
 *     onSettingsChange={setSettings}
 *     onUndo={annotationState.undo}
 *     onClear={annotationState.clear}
 *     canUndo={true}
 *     canClear={true}
 * />
 * ```
 */
export function AnnotationToolbar({
    tool,
    onToolChange,
    settings,
    onSettingsChange,
    onUndo,
    onClear,
    canUndo,
    canClear,
}: AnnotationToolbarProps) {
    return (
        <TooltipProvider >
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-2">
                <ToolSelector tool={tool} onToolChange={onToolChange} />

                <div className="h-6 w-px bg-border" />

                <ColorPicker
                    color={settings.color}
                    onColorChange={(color) =>
                        onSettingsChange({ ...settings, color })
                    }
                />

                <div className="h-6 w-px bg-border" />

                <BrushSizeSlider
                    brushSize={settings.brushSize}
                    onBrushSizeChange={(brushSize) =>
                        onSettingsChange({ ...settings, brushSize })
                    }
                />

                <div className="h-6 w-px bg-border" />

                <div className="flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger render={
                            <span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onUndo}
                                    disabled={!canUndo}
                                    aria-label="Undo last annotation"
                                >
                                    <Undo2 className="size-4" />
                                </Button>
                            </span>
                        }/>
                        <TooltipContent>
                            {canUndo ? "Undo" : "Nothing to undo"}
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger render={
                            <span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClear}
                                    disabled={!canClear}
                                    aria-label="Clear all annotations"
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </span>
                        }/>
                        <TooltipContent>
                            {canClear ? "Clear all" : "Nothing to clear"}
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </TooltipProvider>
    );
}
