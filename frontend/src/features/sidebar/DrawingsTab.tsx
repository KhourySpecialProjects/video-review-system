import { Skeleton } from "@/components/ui/skeleton"
import { DrawingCard } from "./DrawingCard"
import type { DrawAnnotation } from "./sidebar"
import { AnimatedList, AnimatedRow } from "./AnimatedList"

type DrawingsTabProps = {
  drawings: DrawAnnotation[]
  isLoading: boolean
  onJumpToTime: (timeSeconds: number) => void
  onUpdateDuration: (id: string, duration: number) => void
  onDeleteDrawing: (id: string) => void
}

/**
 * @description Drawings tab content for the annotation sidebar.
 * Displays drawing cards with optional thumbnail previews.
 */
export function DrawingsTab({
  drawings,
  isLoading,
  onJumpToTime,
  onUpdateDuration,
  onDeleteDrawing,
}: DrawingsTabProps) {
  if (isLoading) return <SkeletonList />

  if (drawings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No drawings available.
      </p>
    )
  }

  return (
    <AnimatedList>
      {drawings.map((draw, i) => (
        <AnimatedRow key={draw.id} layoutId={`drawing-${draw.id}`} index={i}>
          <DrawingCard
            id={draw.id}
            type={draw.type}
            color={draw.color}
            timestamp={draw.timestamp}
            duration={draw.duration}
            thumbnailUrl={draw.thumbnailUrl}
            onJumpStart={(ts) => onJumpToTime(ts)}
            onEditDuration={(id, dur) => onUpdateDuration(id, dur)}
            onDelete={(id) => onDeleteDrawing(id)}
            createdBy={draw.createdBy}
          />
        </AnimatedRow>
      ))}
    </AnimatedList>
  )
}

/** @description Skeleton list for drawings loading state. */
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
