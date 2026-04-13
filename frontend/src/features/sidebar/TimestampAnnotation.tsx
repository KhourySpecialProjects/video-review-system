import { useState } from "react"
import { Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { SidebarCard } from "./SidebarCard"

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
        <SidebarCard
            title={
                <Badge variant="secondary" className="font-mono">
                    <Clock className="w-3 h-3 mr-1" />
                    {timestamp}
                </Badge>
            }
            onPlay={() => onNavigate(timestamp)}
            onEdit={() => setIsEditing(true)}
            onDelete={onDelete}
            isEditing={isEditing}
            onSave={handleSave}
            onCancelEdit={handleCancelEdit}
            content={
                isEditing ? (
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
                )
            }
        />
    )
}
