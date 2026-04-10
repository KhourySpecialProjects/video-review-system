import { Button } from "@/components/ui/button";
import { ArrowRight, Plus } from "lucide-react";
import { formatDuration } from "@/lib/format";
import { SidebarCard } from "./SidebarCard";

/** Props for the ClipCard component. */
export interface ClipCardProps {
    /** Display name of the clip. */
    title: string;
    /** Clip start time in milliseconds. */
    startMs: number;
    /** Clip end time in milliseconds. */
    endMs: number;
    /** Accent color for the left border and time labels. Defaults to the primary theme color. */
    color?: string;
    /** Called when the user clicks the Jump button to seek to the clip's start time. */
    onJumpStart: () => void;
    /** Called when the user confirms editing the clip. */
    onEdit: () => void;
    /** Called when the user confirms deleting the clip. */
    onDelete: () => void;
    /** Called when the user clicks "Add to sequence". */
    onAddToSequence?: () => void;
}

/**
 * Displays a single clip's title, duration, and start/end times.
 * Includes actions to jump to the clip's start, edit, delete, and add to a sequence.
 * Delete requires a confirmation step before the callback is invoked.
 */
export function ClipCard({
    title,
    startMs,
    endMs,
    color = "hsl(var(--primary))",
    onJumpStart,
    onEdit,
    onDelete,
    onAddToSequence,
}: ClipCardProps) {
    const startTime = formatDuration(Math.max(0, startMs) / 1000);
    const endTime = formatDuration(Math.max(0, endMs) / 1000);
    const duration = formatDuration(Math.max(0, endMs - startMs) / 1000);

    return (
        <SidebarCard
            className="overflow-hidden bg-card text-card-foreground border-l-4"
            style={{ borderLeftColor: color }}
            titleClassName="leading-tight tracking-tight line-clamp-2 wrap-break-word mr-2"
            title={<span title={title}>{title}</span>}
            onPlay={onJumpStart}
            onEdit={onEdit}
            onDelete={onDelete}
            headerClassName="pb-2"
            contentClassName="flex flex-col gap-4"
        >
            <div className="flex items-center justify-center py-2 transition-all duration-300">
                <span className="text-sm font-medium" style={{ color }}>{duration}</span>
            </div>
            
            <div className="flex flex-col gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <span>{startTime}</span>
                    <ArrowRight className="h-4 w-4" />
                    <span>{endTime}</span>
                </div>

                {onAddToSequence && (
                    <div className="flex items-center pt-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={onAddToSequence}
                            className="w-full flex items-center justify-center gap-2 border-dashed text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            <Plus className="h-3 w-3" />
                            Add to sequence
                        </Button>
                    </div>
                )}
            </div>
        </SidebarCard>
    );
}
