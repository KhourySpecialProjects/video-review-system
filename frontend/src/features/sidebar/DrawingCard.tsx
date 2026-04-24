import { useState } from "react";
import { PenLine, Circle as CircleIcon, Square, Clock, Eraser } from "lucide-react";
import { SidebarCard } from "./SidebarCard";
import { Input } from "@/components/ui/input";
import { formatDuration } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export type DrawingToolType = "freehand" | "circle" | "rectangle" | "eraser";

export interface DrawingCardProps {
    /** Unique identifier for the drawing */
    id: string;
    /** The type of drawing tool used */
    type: DrawingToolType;
    /** The CSS color string used for the drawing */
    color: string;
    /** Video time (seconds) when this annotation becomes visible */
    timestamp: number;
    /** How long (seconds) the annotation stays visible */
    duration: number;
    /** Callback fired to navigate the video to the drawing's timestamp */
    onJumpStart: (timestamp: number) => void;
    /** Callback fired to update the duration of the drawing */
    onEditDuration: (id: string, newDuration: number) => void;
    /** Callback fired when the user deletes the drawing */
    onDelete: (id: string) => void;
}

const toolIcons: Record<DrawingToolType, React.ElementType> = {
    freehand: PenLine,
    circle: CircleIcon,
    rectangle: Square,
    eraser: Eraser,
};

const toolLabels: Record<DrawingToolType, string> = {
    freehand: "Freehand Stroke",
    circle: "Circle",
    rectangle: "Rectangle",
    eraser: "Eraser",
};

/**
 * A card component representing a drawing on the video.
 */
export function DrawingCard({
    id,
    type,
    color,
    timestamp,
    duration,
    onJumpStart,
    onEditDuration,
    onDelete,
}: DrawingCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedDuration, setEditedDuration] = useState(String(duration));

    /**
     * Validates and saves the edited duration.
     * If the input is valid, it calls the \`onEditDuration\` prop.
     * If invalid, it reverts the state to the original prop value.
     */
    function handleSave() {
        const parsed = Number(editedDuration);
        if (!isNaN(parsed) && parsed > 0) {
            onEditDuration(id, parsed);
        } else {
            // Revert edit state to current working prop if invalid input
            setEditedDuration(String(duration));
        }
        setIsEditing(false);
    }

    /**
     * Enters edit mode and populates the form input with the current prop duration.
     */
    function handleStartEditing() {
        setEditedDuration(String(duration));
        setIsEditing(true);
    }

    /**
     * Exits edit mode and discards any temporary input.
     */
    function handleCancelEdit() {
        setIsEditing(false);
    }

    const Icon = toolIcons[type];
    const label = toolLabels[type];
    const displayTime = formatDuration(timestamp);

    return (
        <SidebarCard
            className="overflow-hidden bg-card text-card-foreground border-l-4"
            style={{ borderLeftColor: color }}
            title={
                <div className="flex items-center gap-2">
                    <span
                        className="flex items-center justify-center w-6 h-6 rounded-md bg-muted"
                        aria-hidden="true"
                    >
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </span>
                    <span className="leading-tight tracking-tight wrap-break-word font-medium text-sm">
                        {label}
                    </span>
                </div>
            }
            onPlay={() => onJumpStart(timestamp)}
            onEdit={handleStartEditing}
            onDelete={() => onDelete(id)}
            isEditing={isEditing}
            onSave={handleSave}
            onCancelEdit={handleCancelEdit}
            content={
                <div className="flex flex-col gap-3 text-sm">
                    <div className="flex items-center text-muted-foreground gap-2">
                        <Badge variant="secondary" className="font-mono">
                            <Clock className="w-3 h-3 mr-1" />
                            {displayTime}
                        </Badge>
                    </div>

                    <div className="flex items-center py-1">
                        {isEditing ? (
                            <div className="flex items-center gap-2 w-full">
                                <span className="text-muted-foreground text-xs font-medium">Duration (s):</span>
                                <Input
                                    type="number"
                                    min={0.1}
                                    step={0.1}
                                    value={editedDuration}
                                    onChange={(e) => setEditedDuration(e.target.value)}
                                    className="h-8 text-xs font-mono"
                                    aria-label="Edit duration in seconds"
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-xs font-medium">Duration:</span>
                                <span className="font-mono">{duration}s</span>
                            </div>
                        )}
                    </div>
                </div>
            }
        />
    );
}
