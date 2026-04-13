import { Video, CheckCircle } from "lucide-react"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { formatDuration } from "@/lib/format"
import { DropZone } from "./DropZone"
import type { UploadStatus } from "./useVideoUpload"

type SelectStepProps = {
  /** @description Called when the user selects a file via input or drag-and-drop */
  onFileSelected: (file: File) => void
  /** @description Current upload status from the useVideoUpload hook */
  upload: UploadStatus
}

/**
 * Presentational step for selecting a video file and displaying upload progress.
 * All business logic (downscaling, uploading) is handled by the parent.
 *
 * @param props - @see SelectStepProps
 */
export function SelectStep({ onFileSelected, upload }: SelectStepProps) {
  if (upload.status === "idle") {
    return <DropZone onFileSelected={onFileSelected} error={null} />
  }

  if (upload.status === "error") {
    return <DropZone onFileSelected={onFileSelected} error={upload.error} />
  }

  const isComplete = upload.status === "complete"
  const label = upload.status === "processing" ? "Processing video" : "Uploading video"

  return (
    <section aria-label="Upload progress" aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
        {isComplete ? "Upload complete" : label}
      </p>

      <Card className="mb-4">
        <CardContent className="flex items-center gap-2 py-2 px-3">
          <Video className="size-4 text-text-muted shrink-0" strokeWidth={1.75} />
          <span className="text-sm truncate">{upload.fileName}</span>
        </CardContent>
      </Card>

      {!isComplete && (
        <>
          <Progress value={upload.progress} className="w-full max-w-sm">
            <ProgressLabel className="text-text">{label}</ProgressLabel>
            <ProgressValue />
          </Progress>

          {upload.eta > 0 && (
            <p className="mt-2 text-xs text-text-muted">
              ~{formatDuration(upload.eta)} remaining
            </p>
          )}
        </>
      )}

      {isComplete && (
        <p className="flex items-center gap-2 mt-4 text-sm font-semibold text-success">
          <CheckCircle className="size-4 shrink-0" strokeWidth={1.75} />
          Video uploaded successfully
        </p>
      )}
    </section>
  )
}
