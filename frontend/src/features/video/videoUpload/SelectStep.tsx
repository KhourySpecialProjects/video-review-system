import { Video, CheckCircle, Pause } from "lucide-react"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatDuration } from "@/lib/format"
import { DropZone } from "./DropZone"
import type { UploadStatus } from "./useVideoUpload"

type SelectStepProps = {
  /** @description Called when the user selects a file via input or drag-and-drop */
  onFileSelected: (file: File) => void
  /** @description Current upload status from the useVideoUpload hook */
  upload: UploadStatus
  /** @description Called when the user wants to pause and resume later */
  onPause?: () => void
}

/**
 * @description Presentational step for selecting a video file and displaying
 * upload progress. Includes a pause button to save progress and resume later.
 * All business logic (downscaling, uploading) is handled by the parent.
 *
 * @param onFileSelected - Called when the user picks a file
 * @param upload - Current upload status from the useVideoUpload hook
 * @param onPause - Called when the user wants to pause and resume later
 */
export function SelectStep({ onFileSelected, upload, onPause }: SelectStepProps) {
  if (upload.status === "idle") {
    return <DropZone onFileSelected={onFileSelected} error={null} />
  }

  if (upload.status === "error") {
    return <DropZone onFileSelected={onFileSelected} error={upload.error} />
  }

  const isComplete = upload.status === "complete"
  const isUploading = upload.status === "uploading"
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

          {isUploading && onPause && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2 text-text-muted"
              onClick={onPause}
            >
              <Pause className="size-3.5" />
              Upload Later
            </Button>
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
