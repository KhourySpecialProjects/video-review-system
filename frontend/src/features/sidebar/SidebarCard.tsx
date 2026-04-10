import { useState } from "react"
import { Play, Pencil, Trash2 } from "lucide-react"
import {
    Card,
    CardHeader,
    CardTitle,
    CardAction,
    CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export interface SidebarCardProps {
    /** The title content (e.g. badge, text) rendered inside CardTitle */
    title: React.ReactNode
    /** General content of the card rendered inside CardContent */
    children: React.ReactNode
    
    /** Optional custom classes for the root card */
    className?: string
    /** Optional custom classes for the CardTitle */
    titleClassName?: string
    /** Optional custom classes for the CardHeader */
    headerClassName?: string
    /** Optional custom classes for the CardContent */
    contentClassName?: string
    /** Optional custom styles for the root card */
    style?: React.CSSProperties

    /** Callback when the play/navigate button is clicked. If omitted, the button is hidden. */
    onPlay?: () => void
    /** Callback when the edit button is clicked. If omitted, the button is hidden. */
    onEdit?: () => void
    /** Callback when the delete button is confirmed. If omitted, the delete flow is hidden. */
    onDelete?: () => void

    /** Whether we are currently in an 'editing' state */
    isEditing?: boolean
    /** Callback to save edits. Renders a 'Save' button in editing state. */
    onSave?: () => void
    /** Callback to cancel edits. Renders a 'Cancel' button in editing state. */
    onCancelEdit?: () => void

    /** Any extra action buttons to place before the default ones */
    extraActions?: React.ReactNode
}

/**
 * A general, reusable card component for sidebar items.
 * It provides standard action buttons (play, edit, delete) with a built-in delete confirmation flow.
 */
export function SidebarCard({
    title,
    children,
    className = "",
    titleClassName = "flex items-center gap-2 text-sm font-medium",
    headerClassName = "",
    contentClassName = "",
    style,
    onPlay,
    onEdit,
    onDelete,
    isEditing = false,
    onSave,
    onCancelEdit,
    extraActions,
}: SidebarCardProps) {
    const [confirmingDelete, setConfirmingDelete] = useState(false)

    return (
        <Card className={`w-full ${className}`} style={style}>
            <CardHeader className={headerClassName}>
                <CardTitle className={titleClassName}>
                    {title}
                </CardTitle>
                <CardAction className="flex relative items-center gap-1 z-10 shrink-0">
                    {confirmingDelete ? (
                        <>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                    setConfirmingDelete(false)
                                    onDelete?.()
                                }}
                                aria-label="Confirm delete"
                                className="cursor-pointer"
                            >
                                Delete
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmingDelete(false)}
                                aria-label="Cancel delete"
                                className="cursor-pointer"
                            >
                                Cancel
                            </Button>
                        </>
                    ) : isEditing ? (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onSave}
                                aria-label="Save"
                                className="cursor-pointer"
                            >
                                Save
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onCancelEdit}
                                aria-label="Cancel edit"
                                className="cursor-pointer"
                            >
                                Cancel
                            </Button>
                        </>
                    ) : (
                        <>
                            {extraActions}
                            {onPlay && (
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={onPlay}
                                    aria-label="Play"
                                    className="cursor-pointer h-8 w-8 text-muted-foreground hover:text-foreground"
                                >
                                    <Play className="w-4 h-4" />
                                </Button>
                            )}
                            {onEdit && (
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={onEdit}
                                    aria-label="Edit"
                                    className="cursor-pointer h-8 w-8 text-muted-foreground hover:text-foreground"
                                >
                                    <Pencil className="w-4 h-4" />
                                </Button>
                            )}
                            {onDelete && (
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => setConfirmingDelete(true)}
                                    aria-label="Delete"
                                    className="cursor-pointer h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </>
                    )}
                </CardAction>
            </CardHeader>
            <CardContent className={contentClassName}>
                {children}
            </CardContent>
        </Card>
    )
}
