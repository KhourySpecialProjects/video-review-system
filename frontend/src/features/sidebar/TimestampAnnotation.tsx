import { useRef, useState } from "react"
import { Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SidebarCard } from "./SidebarCard"

/**
 * @description Payload saved when a note is committed (title + body).
 */
export type NoteEditPayload = {
    title: string
    content: string
}

/**
 * Props for the TimestampAnnotation component
 */
export interface TimestampAnnotationProps {
    /** The formatted timestamp string, e.g., "01:23" */
    timestamp: string
    /** The note's title */
    title: string
    /** The text of the comment body */
    comment: string
    /** Callback fired when the user selects to navigate to this timestamp */
    onNavigate: (timestamp: string) => void
    /** Callback fired when the user saves an edited note (title + body) */
    onEdit: (payload: NoteEditPayload) => void
    /** Callback fired when the user deletes the comment */
    onDelete: () => void
    /** If true, the card renders initially in its editing state (used for newly-created notes). */
    startInEditing?: boolean
    /** Callback fired when the user cancels editing (Escape or blur on a never-saved draft). */
    onCancel?: () => void
    /** Display name of the user who authored this note. Shown at the bottom of the card. */
    createdBy?: string
}

/**
 * A card component that represents a timestamped note in the sidebar.
 * In editing mode it exposes a title input and a body textarea; Enter on
 * either field (or blur outside the card) commits the edit.
 */
export function TimestampAnnotation({
    timestamp,
    title,
    comment,
    onNavigate,
    onEdit,
    onDelete,
    startInEditing = false,
    onCancel,
    createdBy,
}: TimestampAnnotationProps) {
    const [isEditing, setIsEditing] = useState(startInEditing)
    const [savedTitle, setSavedTitle] = useState(title)
    const [savedComment, setSavedComment] = useState(comment)
    const [editedTitle, setEditedTitle] = useState(title)
    const [editedComment, setEditedComment] = useState(comment)
    // Guards against save + blur double-firing onEdit for the same edit session.
    const committedRef = useRef(false)

    /**
     * @description Commits the current edits and exits editing mode.
     */
    function handleSave() {
        if (committedRef.current) return
        committedRef.current = true
        setSavedTitle(editedTitle)
        setSavedComment(editedComment)
        onEdit({ title: editedTitle, content: editedComment })
        setIsEditing(false)
        setTimeout(() => { committedRef.current = false }, 0)
    }

    /**
     * @description Discards in-flight edits and exits editing mode. For a
     * never-saved draft (no prior title or content), notifies the parent via
     * onCancel so it can remove the draft card.
     */
    function handleCancelEdit() {
        if (committedRef.current) return
        committedRef.current = true
        setEditedTitle(savedTitle)
        setEditedComment(savedComment)
        setIsEditing(false)
        if (savedTitle === "" && savedComment === "" && onCancel) onCancel()
        setTimeout(() => { committedRef.current = false }, 0)
    }

    /**
     * @description Returns true if focus moved to an element still inside
     * this card's editing surface (the other input, or the Save/Cancel
     * header buttons). Those targets manage save/cancel themselves.
     */
    function focusStayedInCard(next: HTMLElement | null): boolean {
        if (!next) return false
        const label = next.getAttribute("aria-label")
        if (label === "Save" || label === "Cancel edit") return true
        if (label === "Note title" || label === "Edit comment text") return true
        return false
    }

    /**
     * @description Blur handler used by both the title input and body
     * textarea. Commits once focus leaves the card entirely; drafts with
     * no content are cancelled instead.
     */
    function handleBlur(e: React.FocusEvent<HTMLElement>) {
        const next = e.relatedTarget as HTMLElement | null
        if (focusStayedInCard(next)) return
        const hasContent = editedTitle.trim() !== "" || editedComment.trim() !== ""
        if (!hasContent) {
            handleCancelEdit()
        } else {
            handleSave()
        }
    }

    /**
     * @description Enter saves (unless Shift+Enter in the body for a
     * newline), Escape cancels.
     */
    function handleKeyDown(e: React.KeyboardEvent<HTMLElement>, allowShiftNewline: boolean) {
        if (e.key === "Enter" && !(allowShiftNewline && e.shiftKey)) {
            e.preventDefault()
            const hasContent = editedTitle.trim() !== "" || editedComment.trim() !== ""
            if (!hasContent) return
            handleSave()
        } else if (e.key === "Escape") {
            e.preventDefault()
            handleCancelEdit()
        }
    }

    const titleNode = isEditing ? (
        <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, false)}
            onBlur={handleBlur}
            aria-label="Note title"
            placeholder="Title"
            className="h-7 text-sm font-medium"
            autoFocus
        />
    ) : (
        <div className="flex items-center gap-2 min-w-0">
            <Badge variant="secondary" className="font-mono shrink-0">
                <Clock className="w-3 h-3 mr-1" />
                {timestamp}
            </Badge>
            <span className="truncate font-medium">{savedTitle || "Untitled"}</span>
        </div>
    )

    return (
        <SidebarCard
            title={titleNode}
            onPlay={() => onNavigate(timestamp)}
            onEdit={() => setIsEditing(true)}
            onDelete={onDelete}
            isEditing={isEditing}
            onSave={handleSave}
            onCancelEdit={handleCancelEdit}
            createdBy={createdBy}
            content={
                isEditing ? (
                    <Textarea
                        value={editedComment}
                        onChange={(e) => setEditedComment(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, true)}
                        onBlur={handleBlur}
                        aria-label="Edit comment text"
                        placeholder="Write a note…"
                        className="text-sm resize-none"
                        rows={3}
                    />
                ) : (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{savedComment}</p>
                )
            }
        />
    )
}
