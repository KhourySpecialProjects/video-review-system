import { useReducer, useRef } from "react"
import { useRevalidator } from "react-router"
import { convert } from "../downscaler/convert"
import { uploadVideo, extractVideoMetadata } from "./upload.service"

export type UploadStep = "details" | "select" | "complete"

export type UploadStatus =
  | { status: "idle" }
  | { status: "processing"; fileName: string; progress: number; eta: number }
  | { status: "uploading"; fileName: string; progress: number; eta: number }
  | { status: "complete"; fileName: string }
  | { status: "error"; error: string }

export type VideoUploadState = {
  open: boolean
  confirmationOpen: boolean
  step: UploadStep
  title: string
  description: string
  upload: UploadStatus
}

type Action =
  | { type: "OPEN" }
  | { type: "REQUEST_CLOSE" }
  | { type: "CANCEL_CLOSE" }
  | { type: "RESET" }
  | { type: "SET_TITLE"; title: string }
  | { type: "SET_DESCRIPTION"; description: string }
  | { type: "ADVANCE_TO_SELECT" }
  | { type: "PROCESSING_STARTED"; fileName: string }
  | { type: "PROCESSING_PROGRESS"; progress: number; eta: number }
  | { type: "UPLOAD_STARTED"; fileName: string }
  | { type: "UPLOAD_PROGRESS"; progress: number; eta: number }
  | { type: "UPLOAD_COMPLETE" }
  | { type: "UPLOAD_FAILED"; error: string }

const initialState: VideoUploadState = {
  open: false,
  confirmationOpen: false,
  step: "details",
  title: "",
  description: "",
  upload: { status: "idle" },
}

/**
 * Reducer for the video upload dialog state machine.
 *
 * @param state - Current state
 * @param action - Action to apply
 * @returns Next state
 */
function reducer(state: VideoUploadState, action: Action): VideoUploadState {
  switch (action.type) {
    case "OPEN":
      return { ...state, open: true }
    case "REQUEST_CLOSE":
      return { ...state, confirmationOpen: true }
    case "CANCEL_CLOSE":
      return { ...state, confirmationOpen: false }
    case "RESET":
      return initialState
    case "SET_TITLE":
      return { ...state, title: action.title }
    case "SET_DESCRIPTION":
      return { ...state, description: action.description }
    case "ADVANCE_TO_SELECT":
      return { ...state, step: "select" }
    case "PROCESSING_STARTED":
      return {
        ...state,
        upload: { status: "processing", fileName: action.fileName, progress: 0, eta: 0 },
      }
    case "PROCESSING_PROGRESS":
      if (state.upload.status !== "processing") return state
      return {
        ...state,
        upload: { ...state.upload, progress: action.progress, eta: action.eta },
      }
    case "UPLOAD_STARTED":
      return {
        ...state,
        upload: { status: "uploading", fileName: action.fileName, progress: 0, eta: 0 },
      }
    case "UPLOAD_PROGRESS":
      if (state.upload.status !== "uploading") return state
      return {
        ...state,
        upload: { ...state.upload, progress: action.progress, eta: action.eta },
      }
    case "UPLOAD_COMPLETE": {
      const fileName = "fileName" in state.upload ? state.upload.fileName : ""
      return {
        ...state,
        step: "complete",
        upload: { status: "complete", fileName },
      }
    }
    case "UPLOAD_FAILED":
      return {
        ...state,
        upload: { status: "error", error: action.error },
      }
    default:
      return state
  }
}

/**
 * Returns the user's estimated upload speed in bytes per second using the
 * Network Information API. Falls back to a conservative 1 MB/s estimate
 * when the API is unavailable.
 *
 * @returns Estimated upload speed in bytes per second
 */
function getEstimatedUploadSpeed(): number {
  const connection = (navigator as any).connection as
    | { downlink?: number }
    | undefined

  if (connection?.downlink) {
    // downlink is in Mbps. Upload is typically ~1/5 of download speed.
    return (connection.downlink * 1_000_000) / 8 / 5
  }

  // Conservative fallback: 1 MB/s
  return 1_000_000
}

/**
 * Encapsulates all state and business logic for the multi-step video upload flow.
 * Steps: details → select (with progress + ETA) → complete.
 *
 * @returns State values, dispatch, fetcher, and file handler for VideoUpload
 */
export function useVideoUpload() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const uploadStartTime = useRef(0)
  const totalBytes = useRef(0)
  const { revalidate } = useRevalidator()

  /**
   * Computes ETA in seconds for a given progress percentage.
   * Uses actual throughput when enough data has been transferred,
   * otherwise estimates from the user's connection speed.
   *
   * @param percent - Current progress (0–100)
   * @returns Estimated seconds remaining
   */
  function computeEta(percent: number): number {
    if (percent <= 0 || totalBytes.current <= 0) return 0

    const elapsed = (Date.now() - uploadStartTime.current) / 1000
    const bytesTransferred = (percent / 100) * totalBytes.current
    const bytesRemaining = totalBytes.current - bytesTransferred

    // Once we have 2+ seconds of data, use actual throughput
    if (elapsed >= 2 && bytesTransferred > 0) {
      const speed = bytesTransferred / elapsed
      return Math.round(bytesRemaining / speed)
    }

    // Before enough data, estimate from connection speed
    const estimatedSpeed = getEstimatedUploadSpeed()
    return Math.round(bytesRemaining / estimatedSpeed)
  }

  /**
   * Handles file selection from the SelectStep. Downscales the video,
   * extracts metadata, and orchestrates the full S3 multipart upload.
   *
   * @param file - The raw File selected by the user
   */
  async function handleFileSelected(file: File) {
    dispatch({ type: "PROCESSING_STARTED", fileName: file.name })
    totalBytes.current = file.size
    uploadStartTime.current = Date.now()

    try {
      const processed = await convert(file, {
        onProgress: (progress) => {
          dispatch({ type: "PROCESSING_PROGRESS", progress, eta: computeEta(progress) })
        },
      })

      const meta = await extractVideoMetadata(processed)

      totalBytes.current = processed.size
      uploadStartTime.current = Date.now()
      dispatch({ type: "UPLOAD_STARTED", fileName: file.name })

      await uploadVideo(
        processed,
        {
          videoTitle: state.title,
          videoDescription: state.description || undefined,
          videoName: file.name,
          durationSeconds: meta.durationSeconds,
          createdAt: new Date().toISOString(),
          takenAt: meta.takenAt,
        },
        (pct) => {
          dispatch({ type: "UPLOAD_PROGRESS", progress: pct, eta: computeEta(pct) })
        }
      )

      revalidate()
      dispatch({ type: "UPLOAD_COMPLETE" })
    } catch (err) {
      dispatch({
        type: "UPLOAD_FAILED",
        error: err instanceof Error ? err.message : "Upload failed",
      })
    }
  }

  return { state, dispatch, handleFileSelected }
}
