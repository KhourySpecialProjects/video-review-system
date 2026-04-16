import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    /** Optional fallback callback when the user clicks edit if custom action is needed */
    onEdit?: () => void;
    /** Called when the user confirms deleting the clip. */
    onDelete: () => void;
    /** Called when the user clicks "Add to sequence". */
    onAddToSequence?: () => void;
    /** Called when a user hits 'Save' effectively committing edits to title or time boundaries */
    onUpdateClip?: (updates: { title?: string; startMs?: number; endMs?: number }) => void;
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
    onUpdateClip,
}: ClipCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [draftTitle, setDraftTitle] = useState(title);
    const [draftStart, setDraftStart] = useState(startMs);
    const [draftEnd, setDraftEnd] = useState(endMs);
    const [timeError, setTimeError] = useState<string | null>(null);

    // Sync if parent overrides
    useEffect(() => {
        if (!isEditing) {
            setDraftTitle(title);
            setDraftStart(startMs);
            setDraftEnd(endMs);
        }
    }, [title, startMs, endMs, isEditing]);

    const handleEditToggle = () => {
        setIsEditing(true);
        if (onEdit) onEdit();
    };

    const handleSave = () => {
        if (draftEnd <= draftStart) {
            setTimeError("End time must be after start time.");
            return;
        }
        setTimeError(null);
        setIsEditing(false);
        if (onUpdateClip) {
            onUpdateClip({ title: draftTitle, startMs: draftStart, endMs: draftEnd });
        }
    };

    const activeStartMs = isEditing ? draftStart : startMs;
    const activeEndMs = isEditing ? draftEnd : endMs;

    // By enforcing Flooring onto the boundary seconds BEFORE computing duration, 
    // we guarantee the mathematical difference perfectly aligns with what's visibly printed on the UI.
    const startSecs = Math.floor(Math.max(0, activeStartMs) / 1000);
    const endSecs = Math.floor(Math.max(0, activeEndMs) / 1000);
    const durationSecs = Math.max(0, endSecs - startSecs);

    const startTime = formatDuration(startSecs);
    const endTime = formatDuration(endSecs);
    const duration = formatDuration(durationSecs);

    return (
        <SidebarCard
            className="overflow-hidden bg-card text-card-foreground border-l-4"
            style={{ borderLeftColor: color }}
            isEditing={isEditing}
            onSave={handleSave}
            onCancelEdit={() => setIsEditing(false)}
            title={
                isEditing ? (
                    <Input 
                        value={draftTitle} 
                        onChange={(e) => setDraftTitle(e.target.value)} 
                        className="text-sm font-medium h-7 w-full mr-2" 
                    />
                ) : (
                    <span className="leading-tight tracking-tight line-clamp-2 wrap-break-word mr-2" title={title}>
                        {title}
                    </span>
                )
            }
            onPlay={onJumpStart}
            onEdit={handleEditToggle}
            onDelete={onDelete}
            content={
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-center py-2 transition-all duration-300">
                        <span className="text-sm font-medium" style={{ color }}>{duration}</span>
                    </div>

                    <div className="flex flex-col gap-4 text-sm text-muted-foreground mt-2">
                        {isEditing ? (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 w-full justify-between">
                                    <div className="flex items-center gap-1">
                                        <Input type="number" step={0.1} value={draftStart / 1000} onChange={e => { setDraftStart(Number(e.target.value) * 1000); setTimeError(null); }} className="h-7 w-[70px] px-2 text-xs" />
                                        <span className="text-[10px]">s</span>
                                    </div>
                                    <ArrowRight className="h-4 w-4 shrink-0 mx-1" />
                                    <div className="flex items-center gap-1">
                                        <Input type="number" step={0.1} value={draftEnd / 1000} onChange={e => { setDraftEnd(Number(e.target.value) * 1000); setTimeError(null); }} className="h-7 w-[70px] px-2 text-xs" />
                                        <span className="text-[10px]">s</span>
                                    </div>
                                </div>
                                {timeError && (
                                    <p className="text-xs text-destructive">{timeError}</p>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span>{startTime}</span>
                                <ArrowRight className="h-4 w-4" />
                                <span>{endTime}</span>
                            </div>
                        )}

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
                </div>
            }
        />
    );
}
