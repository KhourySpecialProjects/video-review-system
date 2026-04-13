import { useState } from "react"
import { UploadCloud } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field"

type DropZoneProps = {
  /** @description Called when a file is dropped or selected via browse */
  onFileSelected: (file: File) => void
  /** @description Error message to display below the drop zone */
  error: string | null
}

/**
 * File input field with drag-and-drop support, built on shadcn Field components.
 *
 * @param props - See DropZoneProps
 */
export function DropZone({ onFileSelected, error }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  /**
   * Handles a file drop event.
   *
   * @param e - The drag event
   */
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFileSelected(file)
  }

  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel className="w-full">Select video</FieldLabel>
      <FieldDescription>
        Choose a video file to upload. Supported formats: MP4, MOV, AVI.
      </FieldDescription>

      <label
        htmlFor="video-upload"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        data-dragging={isDragging}
        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-10 cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50 data-[dragging=true]:border-primary data-[dragging=true]:bg-primary/5"
      >
        <UploadCloud
          data-dragging={isDragging}
          className="size-10 text-primary transition-transform data-[dragging=true]:scale-110"
          strokeWidth={1.5}
        />
        <p className="text-center">
          <strong className="block font-semibold text-text">Tap To Select A Video</strong>
          <span className="text-sm text-text-muted">or drag &amp; drop here</span>
        </p>
        <Badge variant="outline">MP4 · MOV · AVI · max 1 GB</Badge>
      </label>

      <input
        id="video-upload"
        type="file"
        accept="video/mp4,video/quicktime,video/x-msvideo"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelected(file)
        }}
      />

      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}
