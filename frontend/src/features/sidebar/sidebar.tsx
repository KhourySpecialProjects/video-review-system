import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

import { ClipCard } from "./ClipCard"
import { TimestampAnnotation } from "./TimestampAnnotation"
import { DrawingCard, type DrawingToolType } from "./DrawingCard"

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

  /** Optional reference to the current video playback time in seconds */
  currentVideoTime?: number
}

/** 
 * Fallback mock data array for clip annotations.
 * Used internally to render placeholders if no external clips prop is actively streamed backwards.
 */
const DUMMY_CLIPS: ClipAnnotation[] = [
  {
    id: "clip-1",
    title: "Patient Response",
    startMs: 38000,
    endMs: 79000,
    themeColor: "#EF4444", // Red-like
  },
  {
    id: "clip-2",
    title: "Hand Movement",
    startMs: 92000,
    endMs: 115000,
    themeColor: "#A855F7", // Purple-like
  },
]

/** 
 * Fallback mock data array for timestamp note observations.
 * Provides default structure to demonstrate note layout capability standalone.
 */
const DUMMY_NOTES: NoteAnnotation[] = [
  {
    id: "note-1",
    author: "Reviewer A",
    content: "Make sure the transition here matches the audio cue.",
    timestamp: "0:45",
  },
]

/** 
 * Fallback mock data array for canvas vector drawings.
 * Mocks the duration footprint emitted from the freehand annotation overlay.
 */
const DUMMY_DRAWINGS: DrawAnnotation[] = [
  {
    id: "draw-1",
    type: "circle",
    color: "#EF4444",
    timestamp: 72,
    duration: 5,
  },
]

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
  onUpdateClip,
  onUpdateDrawingDuration,
  currentVideoTime,
}: AnnotationSidebarProps) {
  // Gracefully fallback to localized state if top-level props aren't provided yet
  const [clips, setClips] = React.useState<ClipAnnotation[]>(propClips ?? DUMMY_CLIPS)
  const [notes, setNotes] = React.useState<NoteAnnotation[]>(propNotes ?? DUMMY_NOTES)
  const [drawings, setDrawings] = React.useState<DrawAnnotation[]>(propDrawings ?? DUMMY_DRAWINGS)

  // Sync internal state if standard props trickle down later
  React.useEffect(() => { if (propClips) setClips(propClips) }, [propClips])
  React.useEffect(() => { if (propNotes) setNotes(propNotes) }, [propNotes])
  React.useEffect(() => { if (propDrawings) setDrawings(propDrawings) }, [propDrawings])

  /**
   * Orchestrates the deletion of a clip card.
   * Routes the id upwards if the component is bound as a pure UI renderer, or wipes it locally if running standalone.
   * @param id - The unique string identifier of the clip
   */
  const handleDeleteClip = (id: string) => {
    if (onDeleteClip) onDeleteClip(id);
    else setClips(prev => prev.filter(c => c.id !== id));
  }

  /**
   * Orchestrates the deletion of a timestamp note.
   * Routes the id upwards if the component is bound as a pure UI renderer, or wipes it locally if running standalone.
   * @param id - The unique string identifier of the note
   */
  const handleDeleteNote = (id: string) => {
    if (onDeleteNote) onDeleteNote(id);
    else setNotes(prev => prev.filter(n => n.id !== id));
  }

  /**
   * Orchestrates the deletion of a drawing segment.
   * Routes the id upwards if the component is bound as a pure UI renderer, or wipes it locally if running standalone.
   * @param id - The unique string identifier of the drawing
   */
  const handleDeleteDrawing = (id: string) => {
    if (onDeleteDrawing) onDeleteDrawing(id);
    else setDrawings(prev => prev.filter(d => d.id !== id));
  }

  /**
   * Dispatches the event to generate a new Note block targeting the current frame.
   * Formats the raw tracked execution seconds into a clean "MM:SS" UI format string.
   */
  const handleAddNote = () => {
    const timeSecs = currentVideoTime || 0;
    const formattedTime = `${Math.floor(timeSecs / 60)}:${String(Math.floor(timeSecs % 60)).padStart(2, '0')}`;

    setNotes(prev => [{
      id: `note-${Date.now()}`,
      author: "Current User",
      content: "New timestamp observation...",
      timestamp: formattedTime,
    }, ...prev]);
  }

  return (
    <SidebarProvider
      defaultOpen={true}
      className="min-h-0 h-full"
      style={{
        "--sidebar-width": "100%",
        "width": "100%",
        "height": "100%",
      } as React.CSSProperties}
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
                  {clips.length > 0 ? (
                    clips.map((clip) => (
                      <ClipCard
                        key={clip.id}
                        title={clip.title}
                        startMs={clip.startMs}
                        endMs={clip.endMs}
                        color={clip.themeColor}
                        onJumpStart={() => {
                          if (onJumpToTime) onJumpToTime(clip.startMs / 1000);
                          else console.log("Jump to start:", clip.startMs);
                        }}
                        onUpdateClip={(updates) => {
                          if (onUpdateClip) onUpdateClip(clip.id, updates);
                          else {
                            setClips(prev => prev.map(c => c.id === clip.id ? {
                              ...c,
                              title: updates.title ?? c.title,
                              startMs: updates.startMs ?? c.startMs,
                              endMs: updates.endMs ?? c.endMs
                            } : c));
                          }
                        }}
                        onDelete={() => handleDeleteClip(clip.id)}
                        onAddToSequence={() => console.log("Add to sequence:", clip.id)}
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
                  <Button variant="outline" size="sm" className="cursor-pointer w-full flex items-center justify-center border-dashed" onClick={handleAddNote}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Note
                  </Button>
                  
                  {notes.length > 0 ? (
                    notes.map((note) => (
                      <TimestampAnnotation
                        key={note.id}
                        timestamp={note.timestamp}
                        comment={note.content}
                        onNavigate={(ts) => {
                          if (onJumpToTime) {
                            const [mins, secs] = ts.split(':').map(Number);
                            onJumpToTime((mins || 0) * 60 + (secs || 0));
                          } else {
                            console.log("Navigate to:", ts);
                          }
                        }}
                        onEdit={(newComment) => console.log("Edit note:", note.id, newComment)}
                        onDelete={() => handleDeleteNote(note.id)}
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
                  {drawings.length > 0 ? (
                    drawings.map((draw) => (
                      <DrawingCard
                        key={draw.id}
                        id={draw.id}
                        type={draw.type}
                        color={draw.color}
                        timestamp={draw.timestamp}
                        duration={draw.duration}
                        onJumpStart={(ts) => {
                          if (onJumpToTime) onJumpToTime(draw.timestamp);
                          else console.log("Jump to drawing:", ts);
                        }}
                        onEditDuration={(id, dur) => {
                          if (onUpdateDrawingDuration) onUpdateDrawingDuration(id, dur);
                          else {
                            setDrawings(prev => prev.map(d => d.id === id ? { ...d, duration: dur } : d));
                          }
                        }}
                        onDelete={(id) => handleDeleteDrawing(id)}
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
