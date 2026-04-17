import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSidebarMutations } from "./useSidebarMutations"
import { ClipsTab } from "./ClipsTab"
import { NotesTab } from "./NotesTab"
import { DrawingsTab } from "./DrawingsTab"
import type { DrawingToolType } from "./DrawingCard"

const SIDEBAR_PROVIDER_STYLE = {
  "--sidebar-width": "100%",
  width: "100%",
  height: "100%",
} as React.CSSProperties

/**
 * @description Properties of a clip displayed in the sidebar.
 */
export type ClipAnnotation = {
  id: string
  title: string
  startMs: number
  endMs: number
  themeColor: string
}

/**
 * @description Properties of a timestamped note displayed in the sidebar.
 */
export type NoteAnnotation = {
  id: string
  author: string
  content: string
  timestamp: string
}

/**
 * @description Properties of a drawing annotation displayed in the sidebar.
 */
export type DrawAnnotation = {
  id: string
  type: DrawingToolType
  color: string
  timestamp: number
  duration: number
  thumbnailUrl?: string
}

/**
 * @description Props for the AnnotationSidebar component.
 */
export type AnnotationSidebarProps = {
  clips?: ClipAnnotation[]
  notes?: NoteAnnotation[]
  drawings?: DrawAnnotation[]
  /** @description Called when the user clicks jump/play on any card. */
  onJumpToTime?: (timeSeconds: number) => void
  /** @description Current video playback time in seconds. */
  currentVideoTime?: number
  /** @description Whether data is loading (shows skeletons). */
  isLoading?: boolean
  /** @description Video ID for annotation create payloads. */
  videoId?: string
}

/**
 * @description Annotation sidebar that owns its own mutation fetchers.
 * Displays clips, notes, and drawings in a tabbed interface. All CRUD
 * operations are handled internally via the useSidebarMutations hook.
 */
export function AnnotationSidebar({
  clips: propClips,
  notes: propNotes,
  drawings: propDrawings,
  onJumpToTime,
  currentVideoTime,
  isLoading,
  videoId,
}: AnnotationSidebarProps) {
  const mutations = useSidebarMutations(videoId ?? "", currentVideoTime ?? 0)

  const clips = propClips ?? []
  const notes = propNotes ?? []
  const drawings = propDrawings ?? []
  const loading = isLoading ?? false

  const jumpTo = onJumpToTime ?? (() => {})

  return (
    <SidebarProvider
      defaultOpen={true}
      className="min-h-0 h-full"
      style={SIDEBAR_PROVIDER_STYLE}
    >
      <Sidebar side="right" collapsible="none" className="border-l border-border bg-background w-full h-full">
        <Tabs defaultValue="clips" className="flex flex-col h-full w-full overflow-hidden">
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

          <SidebarContent>
            <div className="p-4">
              <TabsContent value="clips" className="m-0 flex flex-col gap-4 focus-visible:outline-none">
                <ClipsTab
                  clips={clips}
                  isLoading={loading}
                  onJumpToTime={jumpTo}
                  onUpdateClip={mutations.updateClip}
                  onDeleteClip={mutations.deleteClip}
                />
              </TabsContent>

              <TabsContent value="notes" className="m-0 flex flex-col gap-4 focus-visible:outline-none">
                <NotesTab
                  notes={notes}
                  isLoading={loading}
                  onJumpToTime={jumpTo}
                  onCreateNote={mutations.createNote}
                  onUpdateNote={mutations.updateNote}
                  onDeleteNote={mutations.deleteNote}
                />
              </TabsContent>

              <TabsContent value="draw" className="m-0 flex flex-col gap-4 focus-visible:outline-none">
                <DrawingsTab
                  drawings={drawings}
                  isLoading={loading}
                  onJumpToTime={jumpTo}
                  onUpdateDuration={mutations.updateDrawingDuration}
                  onDeleteDrawing={mutations.deleteDrawing}
                />
              </TabsContent>
            </div>
          </SidebarContent>
        </Tabs>
      </Sidebar>
    </SidebarProvider>
  )
}
