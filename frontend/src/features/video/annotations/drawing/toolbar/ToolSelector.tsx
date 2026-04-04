import {
    Pencil,
    Circle,
    Square,
    Eraser,
    MousePointerClick,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { AnnotationTool } from "../../types";

/**
 * Tool definitions used to render each toggle item.
 */
const TOOLS: { value: AnnotationTool; label: string; icon: React.ReactNode }[] = [
    { value: "freehand", label: "Freehand", icon: <Pencil className="size-4" /> },
    { value: "circle", label: "Circle", icon: <Circle className="size-4" /> },
    { value: "rectangle", label: "Rectangle", icon: <Square className="size-4" /> },
    { value: "eraser", label: "Pixel Eraser", icon: <Eraser className="size-4" /> },
    {
        value: "object-eraser",
        label: "Object Eraser",
        icon: <MousePointerClick className="size-4" />,
    },
];

/**
 * Props for the {@link ToolSelector} component.
 */
export type ToolSelectorProps = {
    /** The currently selected drawing tool. */
    tool: AnnotationTool;
    /** Callback when the user selects a different tool. */
    onToolChange: (tool: AnnotationTool) => void;
};

/**
 * Toggle group for selecting the active annotation drawing tool.
 *
 * Renders a horizontal row of icon buttons for freehand, circle,
 * rectangle, pixel eraser, and object eraser tools.
 *
 * @param props - See {@link ToolSelectorProps}.
 *
 * @example
 * ```tsx
 * <ToolSelector tool={tool} onToolChange={setTool} />
 * ```
 */
export function ToolSelector({ tool, onToolChange }: ToolSelectorProps) {
    return (
        <ToggleGroup
            value={[tool]}
            onValueChange={(value) => {
                if (value.length > 0) {
                    onToolChange(value[0] as AnnotationTool);
                }
            }}
            variant="outline"
            size="sm"
        >
            {TOOLS.map(({ value, label, icon }) => (
                <Tooltip key={value}>
                    <TooltipTrigger
                        render={
                            <ToggleGroupItem
                                value={value}
                                aria-label={label}
                                className="aria-pressed:bg-primary"
                            >
                                {icon}
                            </ToggleGroupItem>
                        }
                    />
                    <TooltipContent>{label}</TooltipContent>
                </Tooltip>
            ))}
        </ToggleGroup>
    );
}
