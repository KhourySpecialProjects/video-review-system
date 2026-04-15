import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { ClipCard } from "./ClipCard"
import { TimestampAnnotation } from "./TimestampAnnotation"

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
  title: string
  timestamp: string
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
}

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

const DUMMY_NOTES: NoteAnnotation[] = [
  {
    id: "note-1",
    author: "Reviewer A",
    content: "Make sure the transition here matches the audio cue.",
    timestamp: "0:45",
  },
]

const DUMMY_DRAWINGS: DrawAnnotation[] = [
  {
    id: "draw-1",
    title: "Arrow pointing to logo",
    timestamp: "1:12",
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
  clips = DUMMY_CLIPS,
  notes = DUMMY_NOTES,
  drawings = DUMMY_DRAWINGS,
}: AnnotationSidebarProps) {
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
                className="rounded-md data-active:bg-background data-active:text-foreground data-active:shadow-sm text-muted-foreground h-full font-medium transition-all border border-transparent data-active:border-border"
              >
                Clips
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="rounded-md data-active:bg-background data-active:text-foreground data-active:shadow-sm text-muted-foreground h-full font-medium transition-all border border-transparent data-active:border-border"
              >
                Notes
              </TabsTrigger>
              <TabsTrigger
                value="draw"
                className="rounded-md data-active:bg-background data-active:text-foreground data-active:shadow-sm text-muted-foreground h-full font-medium transition-all border border-transparent data-active:border-border"
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
                        onJumpStart={() => console.log("Jump to start:", clip.startMs)}
                        onEdit={() => console.log("Edit clip:", clip.id)}
                        onDelete={() => console.log("Delete clip:", clip.id)}
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
                  {notes.length > 0 ? (
                    notes.map((note) => (
                      <TimestampAnnotation
                        key={note.id}
                        timestamp={note.timestamp}
                        comment={note.content}
                        onNavigate={(ts) => console.log("Navigate to:", ts)}
                        onEdit={(newComment) => console.log("Edit note:", note.id, newComment)}
                        onDelete={() => console.log("Delete note:", note.id)}
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
                      <div key={draw.id} className="p-4 border rounded-xl bg-muted/50 text-muted-foreground text-sm flex items-center justify-center min-h-[100px]">
                        Draw Card Placeholder - {draw.id}
                      </div>
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
