import { useState } from "react"
import { Clock, Edit2, Play, Trash2 } from "lucide-react"
import {
    Card,
    CardHeader,
    CardTitle,
    CardAction,
    CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

/**
 * Props for the TimestampAnnotation component
 */
export interface TimestampAnnotationProps {
    /** The formatted timestamp string, e.g., "01:23" */
    timestamp: string
    /** The tag categorized for this comment */
    tag: string
    /** The text of the comment */
    comment: string
    /** Callback fired when the user selects to navigate to this timestamp */
    onNavigate: (timestamp: string) => void
    /** Callback fired when the user edits the comment */
    onEdit: () => void
    /** Callback fired when the user deletes the comment */
    onDelete: () => void
}

/**
 * A card component that represents a timestamped comment in the sidebar.
 */
export function TimestampAnnotation({
    timestamp,
    tag,
    comment,
    onNavigate,
    onEdit,
    onDelete,
}: TimestampAnnotationProps) {
    const [confirmingDelete, setConfirmingDelete] = useState(false)

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Badge variant="secondary" className="font-mono">
                        <Clock className="w-3 h-3 mr-1" />
                        {timestamp}
                    </Badge>
                    <Badge variant="outline">
                        {tag}
                    </Badge>
                </CardTitle>
                <CardAction className="flex relative items-center gap-1 z-10">
                    {confirmingDelete ? (
                        <>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                    setConfirmingDelete(false)
                                    onDelete()
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
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => onNavigate(timestamp)}
                                aria-label="Navigate to timestamp"
                                className="cursor-pointer"
                            >
                                <Play className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={onEdit}
                                aria-label="Edit comment"
                                className="cursor-pointer"
                            >
                                <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setConfirmingDelete(true)}
                                aria-label="Delete comment"
                                className="cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                </CardAction>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-foreground">{comment}</p>
            </CardContent>
        </Card>
    )
}
