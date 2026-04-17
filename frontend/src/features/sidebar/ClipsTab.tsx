import { useRef } from "react"
import { ClipCard } from "./ClipCard"
import { Skeleton } from "@/components/ui/skeleton"
import type { ClipAnnotation } from "./sidebar"
import { useClipMorph } from "@/features/video/sequences/clipMorphContext"

type ClipsTabProps = {
  clips: ClipAnnotation[]
  isLoading: boolean
  onJumpToTime: (timeSeconds: number) => void
  onUpdateClip: (id: string, updates: { title?: string; startMs?: number; endMs?: number }) => void
  onDeleteClip: (id: string) => void
  /**
   * @description Called when the user clicks "Add to sequence" on a clip card.
   * Omitted when no sequence is active — the button is hidden in that case so
   * the user must first pick a sequence from the sequence bar.
   */
  onAddToSequence?: (clipId: string) => void
}

/**
 * @description Clips tab content for the annotation sidebar. Each clip is
 * rendered in a ref-tracked wrapper so that on "Add to sequence" we can
 * capture the clicked card's bounding rect and trigger a shared-layout
 * morph to the SequenceBar.
 *
 * @param props - Component props
 * @returns The clips tab content
 */
export function ClipsTab({
  clips,
  isLoading,
  onJumpToTime,
  onUpdateClip,
  onDeleteClip,
  onAddToSequence,
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
        <ClipRow
          key={clip.id}
          clip={clip}
          onJumpToTime={onJumpToTime}
          onUpdateClip={onUpdateClip}
          onDeleteClip={onDeleteClip}
          onAddToSequence={onAddToSequence}
        />
      ))}
    </>
  )
}

type ClipRowProps = {
  clip: ClipAnnotation
  onJumpToTime: (timeSeconds: number) => void
  onUpdateClip: (id: string, updates: { title?: string; startMs?: number; endMs?: number }) => void
  onDeleteClip: (id: string) => void
  onAddToSequence?: (clipId: string) => void
}

/**
 * @description A single sidebar clip row. Keeps a ref to the wrapper so the
 * "Add to sequence" click can capture the card's bounding rect and hand it
 * to the morph provider as the animation source.
 *
 * @param props - Component props
 * @returns The clip row element
 */
function ClipRow({
  clip,
  onJumpToTime,
  onUpdateClip,
  onDeleteClip,
  onAddToSequence,
}: ClipRowProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { triggerMorph } = useClipMorph()

  /**
   * @description Captures the card's current position, fires the morph, then
   * invokes the parent's add handler to persist via the /sequences route.
   */
  function handleAdd() {
    if (!onAddToSequence) return
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (rect) triggerMorph(clip.id, rect, clip.themeColor)
    onAddToSequence(clip.id)
  }

  return (
    <div ref={wrapperRef}>
      <ClipCard
        title={clip.title}
        startMs={clip.startMs}
        endMs={clip.endMs}
        color={clip.themeColor}
        onJumpStart={() => onJumpToTime(clip.startMs / 1000)}
        onUpdateClip={(updates) => onUpdateClip(clip.id, updates)}
        onDelete={() => onDeleteClip(clip.id)}
        onAddToSequence={onAddToSequence ? handleAdd : undefined}
      />
    </div>
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
