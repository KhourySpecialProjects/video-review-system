import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus } from "lucide-react"
import { TimestampAnnotation } from "./TimestampAnnotation"
import type { NoteAnnotation } from "./sidebar"

type NotesTabProps = {
  notes: NoteAnnotation[]
  isLoading: boolean
  onJumpToTime: (timeSeconds: number) => void
  onCreateNote: () => void
  onUpdateNote: (id: string, newContent: string) => void
  onDeleteNote: (id: string) => void
}

/**
 * @description Parses a "MM:SS" timestamp string into total seconds.
 * @param ts - Timestamp string in MM:SS format
 * @returns Total seconds, or 0 for malformed input
 */
function parseTimestamp(ts: string): number {
  const parts = ts.split(':')
  if (parts.length !== 2) return 0
  const mins = parseInt(parts[0], 10)
  const secs = parseInt(parts[1], 10)
  if (isNaN(mins) || isNaN(secs)) return 0
  return mins * 60 + secs
}

/**
 * @description Notes tab content for the annotation sidebar.
 * Includes a "New Note" button and a list of timestamped annotations.
 */
export function NotesTab({
  notes,
  isLoading,
  onJumpToTime,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}: NotesTabProps) {
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer w-full flex items-center justify-center border-dashed"
        onClick={onCreateNote}
        disabled={isLoading}
      >
        <Plus className="w-4 h-4 mr-2" />
        New Note
      </Button>

      {isLoading ? (
        <SkeletonList />
      ) : notes.length > 0 ? (
        notes.map((note) => (
          <TimestampAnnotation
            key={note.id}
            timestamp={note.timestamp}
            comment={note.content}
            onNavigate={(ts) => onJumpToTime(parseTimestamp(ts))}
            onEdit={(newComment) => onUpdateNote(note.id, newComment)}
            onDelete={() => onDeleteNote(note.id)}
          />
        ))
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">
          No notes available.
        </p>
      )}
    </>
  )
}

/** @description Skeleton list for notes loading state. */
function SkeletonList() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 w-full">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="mt-1 flex flex-col gap-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </>
  )
}
