import { useState, type CSSProperties } from "react"
import { motion } from "motion/react"
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
} as CSSProperties

/**
 * @description Properties of a clip displayed in the sidebar.
 */
export type ClipAnnotation = {
  id: string
  title: string
  startTimeS: number
  endTimeS: number
  themeColor: string
  /** @description Display name of the user who created this clip. */
  createdBy: string
}

/**
 * @description Properties of a timestamped note displayed in the sidebar.
 */
export type NoteAnnotation = {
  id: string
  /** @description Display name of the user who authored this note. */
  createdBy: string
  title: string
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
  /** @description Display name of the user who created this drawing. */
  createdBy: string
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
  videoId: string
  /** @description Study ID for annotation create payloads. */
  studyId: string
  /** @description Site ID for annotation create payloads. */
  siteId: string
  /**
   * @description Called when the user clicks "Add to sequence" on a clip.
   * When omitted, the button is hidden — callers should only pass this when
   * a sequence is actively selected.
   */
  onAddClipToSequence?: (clipId: string) => void
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
  studyId,
  siteId,
  onAddClipToSequence,
}: AnnotationSidebarProps) {
  const mutations = useSidebarMutations(videoId, currentVideoTime ?? 0, studyId, siteId)

  const clips = propClips ?? []
  const notes = propNotes ?? []
  const drawings = propDrawings ?? []
  const loading = isLoading ?? false

  const jumpTo = onJumpToTime ?? (() => {})

  const [activeTab, setActiveTab] = useState("clips")

  return (
    <SidebarProvider
      defaultOpen={true}
      className="min-h-0 h-full"
      style={SIDEBAR_PROVIDER_STYLE}
    >
      <Sidebar side="right" collapsible="none" className="border-l border-border bg-background w-full h-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full w-full overflow-hidden">
          <SidebarHeader className="p-4 pb-3 border-b border-border bg-background">
            <h2 className="font-semibold text-lg mb-2 text-foreground">Annotations</h2>
            <TabsList className="w-full grid grid-cols-3 bg-muted p-1 rounded-lg h-11">
              {(["clips", "notes", "draw"] as const).map((value) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="relative cursor-pointer rounded-md data-active:text-foreground text-muted-foreground h-full font-medium transition-colors bg-transparent shadow-none border-0"
                >
                  {activeTab === value && (
                    <motion.div
                      layoutId="sidebar-tab-indicator"
                      className="absolute inset-0 rounded-md bg-background border border-border shadow-sm"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span className="relative z-10">
                    {value === "clips" ? "Clips" : value === "notes" ? "Notes" : "Draw"}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </SidebarHeader>

          <SidebarContent>
            <div className="p-4">
              <TabsContent value="clips" className="m-0 flex flex-col gap-4 focus-visible:outline-none">
                <ClipsTab
                  key={activeTab === "clips" ? "clips-active" : "clips-idle"}
                  clips={clips}
                  isLoading={loading}
                  onJumpToTime={jumpTo}
                  onUpdateClip={mutations.updateClip}
                  onDeleteClip={mutations.deleteClip}
                  onAddToSequence={onAddClipToSequence}
                />
              </TabsContent>

              <TabsContent value="notes" className="m-0 flex flex-col gap-4 focus-visible:outline-none">
                <NotesTab
                  notes={notes}
                  isLoading={loading}
                  currentVideoTime={currentVideoTime ?? 0}
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
