import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus } from "lucide-react"
import { useAuth } from "@/context/auth-context"

import { ClipCard } from "./ClipCard"
import { TimestampAnnotation } from "./TimestampAnnotation"
import { DrawingCard, type DrawingToolType } from "./DrawingCard"

const SIDEBAR_PROVIDER_STYLE = {
  "--sidebar-width": "100%",
  width: "100%",
  height: "100%",
} as React.CSSProperties

/**
 * Interface defining the properties of a Clip Annotation.
 */
export interface ClipAnnotation {
  id: string
  title: string
  startMs: number
  endMs: number
  /** The theme color applied to the clip's visual indicators (hex or rgba) */
  themeColor: string
}

/**
 * Interface defining the properties of a Note Annotation.
 */
export interface NoteAnnotation {
  id: string
  author: string
  content: string
  timestamp: string
}

/**
 * Interface defining the properties of a Draw Annotation.
 */
export interface DrawAnnotation {
  id: string
  type: DrawingToolType
  color: string
  timestamp: number
  duration: number
}

/**
 * Props for the AnnotationSidebar component.
 */
export interface AnnotationSidebarProps {
  /** Optional array of clip annotations */
  clips?: ClipAnnotation[]
  /** Optional array of note annotations */
  notes?: NoteAnnotation[]
  /** Optional array of draw annotations */
  drawings?: DrawAnnotation[]

  /** Optional callback fired when a user creates a new string note dynamically via sidebar */
  onAddNoteRequest?: (author: string, content: string, timestampStr: string) => void

  /** Optional callback fired when a user successfully edits a note text string */
  onUpdateNote?: (id: string, content: string) => void

  /** Optional callbacks triggered when the user hits delete on a respective card */
  onDeleteClip?: (id: string) => void
  onDeleteNote?: (id: string) => void
  onDeleteDrawing?: (id: string) => void

  /** Optional callback fired when the user clicks the play/jump button on any card */
  onJumpToTime?: (timeSeconds: number) => void

  /** Optional callback fired when a user successfully edits and saves a clip card */
  onUpdateClip?: (id: string, updates: { title?: string; startMs?: number; endMs?: number }) => void

  /** Optional callback fired when a user modifies a drawing's visibility playback duration */
  onUpdateDrawingDuration?: (id: string, duration: number) => void

  /** Optional state indicating data is fetching, renders skeleton card loaders when true */
  isLoading?: boolean

  /** Optional reference to the current video playback time in seconds */
  currentVideoTime?: number
}

/** Parses a "MM:SS" timestamp string into total seconds. Returns 0 for malformed input. */
function parseTimestamp(ts: string): number {
  const parts = ts.split(':')
  if (parts.length !== 2) return 0
  const mins = parseInt(parts[0], 10)
  const secs = parseInt(parts[1], 10)
  if (isNaN(mins) || isNaN(secs)) return 0
  return mins * 60 + secs
}

/**
 * Standardized skeleton loader mirroring the dimensions of a SidebarCard.
 */
function SidebarCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 w-full">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="mt-1 flex flex-col gap-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}

function SkeletonList() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => <SidebarCardSkeleton key={i} />)}
    </>
  )
}

/**
 * Annotation Sidebar Component
 * Displays a reviewer's annotations including Clips, Notes, and Drawings in a tabbed interface.
 * Designed to encapsulate its own layout inside a SidebarProvider.
 *
 * @param props - See AnnotationSidebarProps for details.
 */
export function AnnotationSidebar({
  clips: propClips,
  notes: propNotes,
  drawings: propDrawings,
  onDeleteClip,
  onDeleteNote,
  onDeleteDrawing,
  onJumpToTime,
  onAddNoteRequest,
  onUpdateNote,
  onUpdateClip,
  onUpdateDrawingDuration,
  isLoading,
  currentVideoTime,
}: AnnotationSidebarProps) {
  const { user } = useAuth()
  const authorName = user?.name ?? "Unknown User"

  const clips = propClips ?? []
  const notes = propNotes ?? []
  const drawings = propDrawings ?? []

  const handleAddNote = () => {
    const timeSecs = currentVideoTime ?? 0
    const formattedTime = `${Math.floor(timeSecs / 60)}:${String(Math.floor(timeSecs % 60)).padStart(2, '0')}`
    onAddNoteRequest?.(authorName, "", formattedTime)
  }

  return (
    <SidebarProvider
      defaultOpen={true}
      className="min-h-0 h-full"
      style={SIDEBAR_PROVIDER_STYLE}
    >
      <Sidebar side="right" collapsible="none" className="border-l border-border bg-background w-full h-full">
        <Tabs defaultValue="clips" className="flex flex-col h-full w-full overflow-hidden">
          {/* Top Navigation Tabs */}
          <SidebarHeader className="p-4 pb-3 border-b border-border bg-background">
            <h2 className="font-semibold text-lg mb-2 text-foreground">Annotations</h2>
            <TabsList className="w-full grid grid-cols-3 bg-muted p-1 rounded-lg h-11">
              <TabsTrigger
                value="clips"
                className="cursor-pointer rounded-md data-active:bg-background data-active:text-foreground data-active:shadow-sm text-muted-foreground h-full font-medium transition-all border border-transparent data-active:border-border"
              >
                Clips
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="cursor-pointer rounded-md data-active:bg-background data-active:text-foreground data-active:shadow-sm text-muted-foreground h-full font-medium transition-all border border-transparent data-active:border-border"
              >
                Notes
              </TabsTrigger>
              <TabsTrigger
                value="draw"
                className="cursor-pointer rounded-md data-active:bg-background data-active:text-foreground data-active:shadow-sm text-muted-foreground h-full font-medium transition-all border border-transparent data-active:border-border"
              >
                Draw
              </TabsTrigger>
            </TabsList>
          </SidebarHeader>

          {/* Scrollable Content Area */}
          <SidebarContent>
              <div className="p-4">
                {/* Clips Tab Content */}
                <TabsContent
                  value="clips"
                  className="m-0 flex flex-col gap-4 focus-visible:outline-none"
                >
                  {isLoading ? (
                    <SkeletonList />
                  ) : clips.length > 0 ? (
                    clips.map((clip) => (
                      <ClipCard
                        key={clip.id}
                        title={clip.title}
                        startMs={clip.startMs}
                        endMs={clip.endMs}
                        color={clip.themeColor}
                        onJumpStart={() => onJumpToTime?.(clip.startMs / 1000)}
                        onUpdateClip={(updates) => onUpdateClip?.(clip.id, updates)}
                        onDelete={() => onDeleteClip?.(clip.id)}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No clips available.
                    </p>
                  )}
                </TabsContent>

                {/* Notes Tab Content */}
                <TabsContent
                  value="notes"
                  className="m-0 flex flex-col gap-4 focus-visible:outline-none"
                >
                  <Button variant="outline" size="sm" className="cursor-pointer w-full flex items-center justify-center border-dashed" onClick={handleAddNote} disabled={isLoading}>
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
                        onNavigate={(ts) => onJumpToTime?.(parseTimestamp(ts))}
                        onEdit={(newComment) => onUpdateNote?.(note.id, newComment)}
                        onDelete={() => onDeleteNote?.(note.id)}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No notes available.
                    </p>
                  )}
                </TabsContent>

                {/* Draw Tab Content */}
                <TabsContent
                  value="draw"
                  className="m-0 flex flex-col gap-4 focus-visible:outline-none"
                >
                  {isLoading ? (
                    <SkeletonList />
                  ) : drawings.length > 0 ? (
                    drawings.map((draw) => (
                      <DrawingCard
                        key={draw.id}
                        id={draw.id}
                        type={draw.type}
                        color={draw.color}
                        timestamp={draw.timestamp}
                        duration={draw.duration}
                        onJumpStart={(ts) => onJumpToTime?.(ts)}
                        onEditDuration={(id, dur) => onUpdateDrawingDuration?.(id, dur)}
                        onDelete={(id) => onDeleteDrawing?.(id)}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No drawings available.
                    </p>
                  )}
                </TabsContent>
              </div>
          </SidebarContent>
        </Tabs>
      </Sidebar>
    </SidebarProvider>
  )
}
