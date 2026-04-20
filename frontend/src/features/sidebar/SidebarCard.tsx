import { useState } from "react"
import { Play, Pencil, Trash2 } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import {
    Card,
    CardHeader,
    CardTitle,
    CardAction,
    CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export type SidebarCardProps = {
    /** The title content (e.g. badge, text) rendered inside CardTitle */
    title: React.ReactNode
    /** General content of the card rendered inside CardContent */
    content: React.ReactNode
    /** Optional custom classes for the root card */
    className?: string
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

    /** Display name of the user who created this card. Rendered at the bottom when provided. */
    createdBy?: string
}

/** @description Shared easing for the edit/view swaps — fast, crisp, not bouncy. */
const swapEase = [0.2, 0.8, 0.2, 1] as [number, number, number, number]

/** @description Cross-fade motion for the action button groups (view/edit/confirm-delete). */
const actionGroupMotion = {
    initial: { opacity: 0, y: -4, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 4, scale: 0.96 },
    transition: { duration: 0.18, ease: swapEase },
}

/** @description Cross-fade motion for swapping the title and body content between edit/view. */
const bodySwapMotion = {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
    transition: { duration: 0.2, ease: swapEase },
}

/**
 * @description A general, reusable card component for sidebar items. It
 * provides standard action buttons (play, edit, delete) with a built-in
 * delete confirmation flow. Transitions between view, edit, and
 * confirm-delete states cross-fade via AnimatePresence; the whole card
 * also smoothly reflows (layout animation) when its height changes from
 * entering or leaving edit mode.
 *
 * @param props - Component props
 * @returns The animated sidebar card
 */
export function SidebarCard({
    title,
    content,
    className = "",
    style,
    onPlay,
    onEdit,
    onDelete,
    isEditing = false,
    onSave,
    onCancelEdit,
    extraActions,
    createdBy,
}: SidebarCardProps) {
    const [confirmingDelete, setConfirmingDelete] = useState(false)

    const actionMode = confirmingDelete ? "confirm-delete" : isEditing ? "editing" : "default"

    return (
        <motion.div layout transition={{ layout: { type: "spring", stiffness: 420, damping: 34 } }}>
            <Card className={`w-full ${className}`} style={style}>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium min-w-0 flex-1">
                        <AnimatePresence mode="popLayout" initial={false}>
                            <motion.div
                                key={isEditing ? "title-edit" : "title-view"}
                                layout
                                className="flex items-center gap-2 min-w-0 flex-1"
                                {...bodySwapMotion}
                            >
                                {title}
                            </motion.div>
                        </AnimatePresence>
                    </CardTitle>
                    <CardAction className="flex relative items-center gap-1 z-10 shrink-0">
                        <AnimatePresence mode="popLayout" initial={false}>
                            {actionMode === "confirm-delete" && (
                                <motion.div
                                    key="confirm-delete"
                                    className="flex items-center gap-1"
                                    {...actionGroupMotion}
                                >
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
                                </motion.div>
                            )}
                            {actionMode === "editing" && (
                                <motion.div
                                    key="editing"
                                    className="flex items-center gap-1"
                                    {...actionGroupMotion}
                                >
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
                                </motion.div>
                            )}
                            {actionMode === "default" && (
                                <motion.div
                                    key="default"
                                    className="flex items-center gap-1"
                                    {...actionGroupMotion}
                                >
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
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div
                            key={isEditing ? "content-edit" : "content-view"}
                            layout
                            {...bodySwapMotion}
                        >
                            {content}
                        </motion.div>
                    </AnimatePresence>
                    {createdBy && (
                        <div className="mt-3 pt-2 border-t border-border text-xs text-muted-foreground">
                            Created by {createdBy}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}
