import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus } from "lucide-react"
import { TimestampAnnotation, type NoteEditPayload } from "./TimestampAnnotation"
import type { NoteAnnotation } from "./sidebar"
import { AnimatedList, AnimatedRow } from "./AnimatedList"

type NotesTabProps = {
  notes: NoteAnnotation[]
  isLoading: boolean
  currentVideoTime: number
  onJumpToTime: (timeSeconds: number) => void
  onCreateNote: (payload: NoteEditPayload, atTimeSecs: number) => void
  onUpdateNote: (id: string, payload: NoteEditPayload) => void
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
 * @description Formats total seconds into a "M:SS" timestamp string.
 * @param totalSecs - Total seconds
 * @returns Timestamp string like "1:23"
 */
function formatTimestamp(totalSecs: number): string {
  const mins = Math.floor(totalSecs / 60)
  const secs = String(Math.floor(totalSecs % 60)).padStart(2, '0')
  return `${mins}:${secs}`
}

/**
 * @description Notes tab content for the annotation sidebar.
 * Includes a "New Note" button that creates a local draft card in editing
 * mode; the draft is only persisted to the backend once the user confirms
 * (Enter or blur).
 */
export function NotesTab({
  notes,
  isLoading,
  currentVideoTime,
  onJumpToTime,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}: NotesTabProps) {
  // A local draft note pinned to the video time when "New Note" was clicked.
  // Only the user saving it fires a create request.
  const [draft, setDraft] = useState<{ timestampSecs: number } | null>(null)

  /**
   * @description Starts a new draft note anchored at the current video time.
   */
  function handleNewNoteClick() {
    setDraft({ timestampSecs: Math.floor(currentVideoTime) })
  }

  /**
   * @description Confirms the draft by creating it server-side and clearing local state.
   */
  function handleDraftSave(payload: NoteEditPayload) {
    if (!draft) return
    onCreateNote(payload, draft.timestampSecs)
    setDraft(null)
  }

  /**
   * @description Discards the draft without creating a note.
   */
  function handleDraftCancel() {
    setDraft(null)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer w-full flex items-center justify-center border-dashed"
        onClick={handleNewNoteClick}
        disabled={isLoading || draft !== null}
      >
        <Plus className="w-4 h-4 mr-2" />
        New Note
      </Button>

      <AnimatedList>
        {draft && (
          <AnimatedRow key="draft" layoutId="note-draft">
            <TimestampAnnotation
              timestamp={formatTimestamp(draft.timestampSecs)}
              title=""
              comment=""
              startInEditing
              onNavigate={(ts) => onJumpToTime(parseTimestamp(ts))}
              onEdit={handleDraftSave}
              onCancel={handleDraftCancel}
              onDelete={handleDraftCancel}
            />
          </AnimatedRow>
        )}

        {!isLoading &&
          notes.map((note, i) => (
            <AnimatedRow key={note.id} layoutId={`note-${note.id}`} index={i}>
              <TimestampAnnotation
                timestamp={note.timestamp}
                title={note.title}
                comment={note.content}
                onNavigate={(ts) => onJumpToTime(parseTimestamp(ts))}
                onEdit={(payload) => onUpdateNote(note.id, payload)}
                onDelete={() => onDeleteNote(note.id)}
                createdBy={note.createdBy}
              />
            </AnimatedRow>
          ))}
      </AnimatedList>

      {isLoading ? (
        <SkeletonList />
      ) : notes.length === 0 && !draft ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No notes available.
        </p>
      ) : null}
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
