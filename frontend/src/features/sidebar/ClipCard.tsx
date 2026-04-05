import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, X, ArrowRight, ArrowUpRight, GripVertical } from "lucide-react";
import { formatDuration } from "@/lib/format";

export interface ClipCardProps {
    id: string;
    title: string;
    startMs: number;
    endMs: number;
    color?: string;
    onJumpStart: () => void;
    onJumpEnd?: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export function ClipCard({
    id,
    title,
    startMs,
    endMs,
    color = "hsl(var(--primary))",
    onJumpStart,
    onJumpEnd,
    onEdit,
    onDelete,
}: ClipCardProps) {
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    const startTime = formatDuration(startMs / 1000);
    const endTime = formatDuration(endMs / 1000);
    const duration = formatDuration(Math.max(0, endMs - startMs) / 1000);

    function handleDragStart(e: React.DragEvent) {
        e.dataTransfer.setData("clipId", id);
        e.dataTransfer.effectAllowed = "move";
    }

    return (
        <Card
            draggable
            onDragStart={handleDragStart}
            className="relative w-full overflow-hidden bg-card text-card-foreground"
        >
            {/* Left colored border strip */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: color }}
            />

            <div className="flex flex-col pt-2 pr-2 pb-4 pl-5 gap-3">
                {/* Top row: Title and Actions */}
                <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-semibold leading-none tracking-tight pt-2 line-clamp-2 break-words flex-1">
                        {title}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                        {isConfirmingDelete ? (
                            <>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => { setIsConfirmingDelete(false); onDelete(); }}
                                    aria-label="Confirm delete"
                                    className="cursor-pointer"
                                >
                                    Delete
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsConfirmingDelete(false)}
                                    aria-label="Cancel delete"
                                    className="cursor-pointer"
                                >
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onEdit}
                                    aria-label="Edit clip"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsConfirmingDelete(true)}
                                    aria-label="Delete clip"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Middle row: duration */}
                <div className="flex items-center justify-center py-2 sm:py-4 xl:py-6 transition-all duration-300">
                    <span className="text-sm font-medium" style={{ color }}>{duration}</span>
                </div>

                {/* Bottom row: timestamps, jump, and drag hint */}
                <div className="flex flex-col gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span>{startTime}</span>
                            <ArrowRight className="h-4 w-4" />
                            {onJumpEnd ? (
                                <Button
                                    variant="link"
                                    onClick={onJumpEnd}
                                    aria-label="Jump to end"
                                    className="px-0 h-auto font-normal text-current hover:text-current hover:underline"
                                    style={{ color }}
                                >
                                    {endTime}
                                </Button>
                            ) : (
                                <span>{endTime}</span>
                            )}
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onJumpStart}
                            aria-label="Jump to start"
                            className="flex items-center gap-1 font-medium px-2 hover:opacity-80"
                            style={{ color }}
                        >
                            Jump <ArrowUpRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 text-xs cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-4 w-4 opacity-50" />
                        <span>Drag to stitch timeline</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}
