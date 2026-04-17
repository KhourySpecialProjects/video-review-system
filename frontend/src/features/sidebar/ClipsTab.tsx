import { motion } from "motion/react"
import { ClipCard } from "./ClipCard"
import { Skeleton } from "@/components/ui/skeleton"
import type { ClipAnnotation } from "./sidebar"

type ClipsTabProps = {
  clips: ClipAnnotation[]
  isLoading: boolean
  onJumpToTime: (timeSeconds: number) => void
  onUpdateClip: (id: string, updates: { title?: string; startMs?: number; endMs?: number }) => void
  onDeleteClip: (id: string) => void
}

/**
 * @description Clips tab content for the annotation sidebar.
 * Each clip is wrapped in a motion.div with a layoutId for the
 * clip-to-sequence animation.
 */
export function ClipsTab({
  clips,
  isLoading,
  onJumpToTime,
  onUpdateClip,
  onDeleteClip,
}: ClipsTabProps) {
  if (isLoading) return <SkeletonList />

  if (clips.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No clips available.
      </p>
    )
  }

  return (
    <>
      {clips.map((clip) => (
        <motion.div
          key={clip.id}
          layoutId={`clip-${clip.id}`}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <ClipCard
            title={clip.title}
            startMs={clip.startMs}
            endMs={clip.endMs}
            color={clip.themeColor}
            onJumpStart={() => onJumpToTime(clip.startMs / 1000)}
            onUpdateClip={(updates) => onUpdateClip(clip.id, updates)}
            onDelete={() => onDeleteClip(clip.id)}
          />
        </motion.div>
      ))}
    </>
  )
}

/** @description Skeleton list for clip loading state. */
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
