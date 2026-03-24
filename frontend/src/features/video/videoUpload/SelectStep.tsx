import { useState } from "react"
import { UploadCloud, Video, CheckCircle } from "lucide-react"
import {
    Progress,
    ProgressLabel,
    ProgressValue,
  } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface SelectStepProps {
  onVideoSelected: (file: Blob) => void
  downscaleVideo: (file: File, onProgress: (pct: number) => void) => Promise<Blob>
}

export function SelectStep({ onVideoSelected, downscaleVideo }: SelectStepProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isProcessing = progress !== null

  async function handleFile(file: File) {
    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file (MP4, MOV or AVI).")
      return
    }

    setError(null)
    setFileName(file.name)
    setProgress(0)

    try {
      const processed = await downscaleVideo(file, (pct) => setProgress(pct))
      onVideoSelected(processed)
    } catch (e) {
        console.error("downscaleVideo error:", e)
      setError("Something went wrong processing your video. Please try again.")
      setProgress(null)
      setFileName(null)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  if (isProcessing) {
    return (
      <section aria-label="Processing video" aria-live="polite">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
          Transferring video
        </p>

        <Card className="mb-4">
          <CardContent className="flex items-center gap-2 py-2 px-3">
            <Video className="size-4 text-text-muted shrink-0" strokeWidth={1.75} />
            <span className="text-sm truncate">{fileName}</span>
          </CardContent>
        </Card>

        <Progress value={progress!} className="w-full max-w-sm">
            <ProgressLabel className="text-text">Upload progress</ProgressLabel>
            <ProgressValue />
        </Progress>

        {progress >= 100 && (
          <p className="flex items-center gap-2 mt-4 text-sm font-semibold text-success">
            <CheckCircle className="size-4 shrink-0" strokeWidth={1.75} />
            Video uploaded successfully
          </p>
        )}
      </section>
    )
  }

  return (
    <section aria-label="Select video">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        Select video
      </p>

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

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">{error}</p>
      )}

      <input
        id="video-upload"
        type="file"
        accept="video/mp4,video/quicktime,video/x-msvideo"
        className="sr-only"
        disabled={isProcessing}
        onChange={handleChange}
      />
    </section>
  )
}