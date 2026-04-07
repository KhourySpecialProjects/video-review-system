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
import { Textarea } from "@/components/ui/textarea"

/**
 * Props for the TimestampAnnotation component
 */
export interface TimestampAnnotationProps {
    /** The formatted timestamp string, e.g., "01:23" */
    timestamp: string
    /** The text of the comment */
    comment: string
    /** Callback fired when the user selects to navigate to this timestamp */
    onNavigate: (timestamp: string) => void
    /** Callback fired when the user saves an edited comment */
    onEdit: (newComment: string) => void
    /** Callback fired when the user deletes the comment */
    onDelete: () => void
}

/**
 * A card component that represents a timestamped comment in the sidebar.
 */
export function TimestampAnnotation({
    timestamp,
    comment,
    onNavigate,
    onEdit,
    onDelete,
}: TimestampAnnotationProps) {
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [savedComment, setSavedComment] = useState(comment)
    const [editedComment, setEditedComment] = useState(comment)

    function handleSave() {
        setSavedComment(editedComment)
        onEdit(editedComment)
        setIsEditing(false)
    }

    function handleCancelEdit() {
        setEditedComment(savedComment)
        setIsEditing(false)
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Badge variant="secondary" className="font-mono">
                        <Clock className="w-3 h-3 mr-1" />
                        {timestamp}
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
                    ) : isEditing ? (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSave}
                                aria-label="Save comment"
                                className="cursor-pointer"
                            >
                                Save
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEdit}
                                aria-label="Cancel edit"
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
                                onClick={() => setIsEditing(true)}
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
                {isEditing ? (
                    <Textarea
                        value={editedComment}
                        onChange={(e) => setEditedComment(e.target.value)}
                        aria-label="Edit comment text"
                        className="text-sm resize-none"
                        rows={3}
                        autoFocus
                    />
                ) : (
                    <p className="text-sm text-foreground">{savedComment}</p>
                )}
            </CardContent>
        </Card>
    )
}
