import type { Annotation } from "./types";
import { drawAnnotation } from "./renderers";

/** @description Thumbnail dimensions for drawing card previews. */
const THUMB_WIDTH = 160;
const THUMB_HEIGHT = 90;

/**
 * @description Captures a video frame at the annotation's timestamp and
 * renders the annotation on top, producing a data URL thumbnail. This is
 * computed client-side on creation and on page load — not stored in the DB.
 *
 * @param videoElement - The HTML video element to capture the frame from
 * @param annotation - The annotation to render on top of the frame
 * @returns A promise resolving to a data URL (image/png), or null if capture fails
 */
export function generateDrawingThumbnail(
  videoElement: HTMLVideoElement,
  annotation: Annotation,
): Promise<string | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = THUMB_WIDTH;
    canvas.height = THUMB_HEIGHT;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      resolve(null);
      return;
    }

    const previousTime = videoElement.currentTime;
    const targetTime = annotation.timestamp;

    /**
     * @description Draws the video frame + annotation overlay and returns the data URL.
     */
    function captureFrame() {
      ctx!.drawImage(videoElement, 0, 0, THUMB_WIDTH, THUMB_HEIGHT);
      drawAnnotation(ctx!, annotation, THUMB_WIDTH, THUMB_HEIGHT);
      const dataUrl = canvas.toDataURL("image/png");

      // Restore the video to its previous position
      videoElement.currentTime = previousTime;

      resolve(dataUrl);
    }

    // If the video is already at the target time, capture immediately
    if (Math.abs(videoElement.currentTime - targetTime) < 0.1) {
      captureFrame();
      return;
    }

    // Seek to the annotation's timestamp, then capture
    videoElement.addEventListener("seeked", captureFrame, { once: true });
    videoElement.currentTime = targetTime;
  });
}

/**
 * @description Generates thumbnails for all annotations using the video element.
 * Returns a map of annotation ID to data URL.
 *
 * @param videoElement - The HTML video element to capture frames from
 * @param annotations - The annotations to generate thumbnails for
 * @returns A map of annotation ID to data URL
 */
export async function generateAllDrawingThumbnails(
  videoElement: HTMLVideoElement,
  annotations: Annotation[],
): Promise<Map<string, string>> {
  const thumbnails = new Map<string, string>();

  for (const annotation of annotations) {
    // Skip erasers — they don't produce visible standalone drawings
    if (annotation.type === "eraser") continue;

    const thumb = await generateDrawingThumbnail(videoElement, annotation);
    if (thumb) {
      thumbnails.set(annotation.id, thumb);
    }
  }

  return thumbnails;
}
